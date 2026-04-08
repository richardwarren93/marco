import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeUrl } from "@/lib/scraper";
import { rehostImage, isExpiringCdn } from "@/lib/image-rehost";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/recipes/backfill-images?limit=10
 *
 * Recovers images for recipes with no image OR an expiring CDN image.
 *
 * Strategy:
 *   1. Re-scrape source_url to get a (possibly fresh-but-still-temporary)
 *      image URL.
 *   2. If we got an expiring CDN URL, immediately download the bytes and
 *      re-host them in our Supabase Storage `recipe-images` bucket so
 *      they never expire again.
 *   3. Save the permanent URL on the recipe row.
 *
 * Batched + timeout-protected so the function returns within Vercel's
 * serverless function timeout.
 */
const SCRAPE_TIMEOUT_MS = 8_000;
const DEFAULT_BATCH = 10;

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
    ),
  ]);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || String(DEFAULT_BATCH), 10)));

  const admin = createAdminClient();

  const { data: recipes, error } = await admin
    .from("recipes")
    .select("id, image_url, source_url")
    .not("source_url", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const candidates = (recipes || []).filter(
    (r) => r.source_url && (!r.image_url || isExpiringCdn(r.image_url))
  );

  const batch = candidates.slice(0, limit);

  let updated = 0;
  let rehosted = 0;
  let savedDirect = 0;
  let scrapedNothing = 0;
  let rehostFailed = 0;
  let timedOut = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipe of batch) {
    if (!recipe.source_url) continue;
    try {
      const result = await withTimeout(scrapeUrl(recipe.source_url), SCRAPE_TIMEOUT_MS, "scrape");
      const scrapedUrl = result.image_url;

      if (!scrapedUrl) {
        scrapedNothing++;
        continue;
      }

      // Decide: save directly (already permanent) vs rehost (CDN URL)
      let finalUrl: string | null;
      if (isExpiringCdn(scrapedUrl)) {
        // Try to download bytes WHILE they're still fresh and re-host
        finalUrl = await rehostImage(scrapedUrl);
        if (!finalUrl) {
          rehostFailed++;
          errors.push(`${recipe.id}: rehost failed (CDN URL fetched but couldn't store)`);
          continue;
        }
        rehosted++;
      } else {
        finalUrl = scrapedUrl;
        savedDirect++;
      }

      const { error: updateError } = await admin
        .from("recipes")
        .update({ image_url: finalUrl })
        .eq("id", recipe.id);

      if (updateError) {
        failed++;
        errors.push(`${recipe.id}: db update ${updateError.message}`);
      } else {
        updated++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("scrape timeout")) {
        timedOut++;
      } else {
        failed++;
      }
      errors.push(`${recipe.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    batch_size: batch.length,
    queue_remaining: candidates.length - batch.length,
    updated,
    rehosted_to_storage: rehosted,
    saved_direct: savedDirect,
    scraped_nothing: scrapedNothing,
    rehost_failed: rehostFailed,
    timed_out: timedOut,
    failed,
    errors: errors.slice(0, 5),
  });
}
