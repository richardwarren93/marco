import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scrapeUrl } from "@/lib/scraper";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/recipes/backfill-images
 *
 * Re-scrapes source_url for recipes that either:
 *   - have no image_url at all, OR
 *   - have an image_url from an expiring CDN (Instagram, TikTok)
 *
 * Updates the recipe row with the freshly scraped image_url so it
 * persists in our DB.
 *
 * Auth: any logged-in user can trigger (admin-style endpoint).
 */
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

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Pull every recipe, then filter in memory (Supabase URL filters are awkward
  // for OR conditions across nullable text columns).
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

  let updated = 0;
  let failed = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const recipe of candidates) {
    if (!recipe.source_url) continue;
    try {
      const result = await scrapeUrl(recipe.source_url);
      const newImage = result.image_url;
      if (!newImage || isExpiredCdn(newImage)) {
        // Scraper returned nothing useful — skip
        skipped++;
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
      failed++;
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${recipe.id}: ${msg}`);
    }
  }

  return NextResponse.json({
    total_candidates: candidates.length,
    updated,
    skipped,
    failed,
    errors: errors.slice(0, 10),
  });
}
