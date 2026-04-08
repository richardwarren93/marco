import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeUrl } from "@/lib/scraper";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/recipes/backfill-images?limit=10
 *
 * Processes a batch of recipes that have:
 *   - no image_url at all, OR
 *   - an expiring CDN image (Instagram, TikTok, Facebook)
 *
 * Re-scrapes their source_url and updates with the persistent image.
 *
 * Batched + timeout-protected so the function returns in ~10–20 seconds
 * even on Vercel hobby plans. Call repeatedly to drain the queue.
 */
const SCRAPE_TIMEOUT_MS = 8_000; // give up on a single scrape after 8s
const DEFAULT_BATCH = 10;

function isExpiredCdn(url: string | null): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes("cdninstagram") ||
    lower.includes("scontent") ||
    lower.includes("tiktokcdn") ||
    lower.includes("fbcdn")
  );
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_resolve, reject) =>
      setTimeout(() => reject(new Error(`scrape timeout after ${ms}ms`)), ms)
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

  // Pull recipes with source_url and filter the candidates in memory.
  const { data: recipes, error } = await admin
    .from("recipes")
    .select("id, image_url, source_url")
    .not("source_url", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const candidates = (recipes || []).filter(
    (r) => r.source_url && (!r.image_url || isExpiredCdn(r.image_url))
  );

  // Take only the first `limit` candidates this call
  const batch = candidates.slice(0, limit);

  let updated = 0;
  let timedOut = 0;
  let scraperReturnedNothing = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const recipe of batch) {
    if (!recipe.source_url) continue;
    try {
      const result = await withTimeout(scrapeUrl(recipe.source_url), SCRAPE_TIMEOUT_MS);
      const newImage = result.image_url;
      if (!newImage || isExpiredCdn(newImage)) {
        scraperReturnedNothing++;
        continue;
      }
      const { error: updateError } = await admin
        .from("recipes")
        .update({ image_url: newImage })
        .eq("id", recipe.id);

      if (updateError) {
        failed++;
        errors.push(`${recipe.id}: ${updateError.message}`);
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
    scraper_returned_nothing: scraperReturnedNothing,
    timed_out: timedOut,
    failed,
    errors: errors.slice(0, 5),
  });
}
