// Standalone backfill script that runs from the local machine using the
// Supabase service role. Bypasses Vercel timeouts entirely.
//
// Usage:
//   1. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
//      set in .env.local
//   2. Run: node --env-file=.env.local scripts/backfill-images.mjs

import { createClient } from "@supabase/supabase-js";
import * as cheerio from "cheerio";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Run with: node --env-file=.env.local scripts/backfill-images.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isExpiringCdn(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("cdninstagram") ||
    lower.includes("scontent") ||
    lower.includes("tiktokcdn") ||
    lower.includes("fbcdn")
  );
}

function isUsableImage(url) {
  return Boolean(url) && !isExpiringCdn(url);
}

const FETCH_TIMEOUT = 10_000;

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Scraper (mirror of src/lib/scraper.ts but standalone) ────────────────────

async function scrapeGeneric(url) {
  try {
    const resp = await fetchWithTimeout(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; MarcoBot/1.0)" },
    });
    if (!resp.ok) return { image_url: null };
    const html = await resp.text();
    const $ = cheerio.load(html);
    let img =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="og:image"]').attr("content") ||
      $('meta[property="og:image:secure_url"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('link[rel="image_src"]').attr("href") ||
      null;
    if (!img) {
      img = $('img').first().attr("src") || null;
    }
    return { image_url: img };
  } catch {
    return { image_url: null };
  }
}

async function scrapeInstagram(url) {
  // Try the embed page which exposes a stable og:image
  try {
    const shortcodeMatch = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    const shortcode = shortcodeMatch?.[2];
    if (shortcode) {
      const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/`;
      const resp = await fetchWithTimeout(embedUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (resp.ok) {
        const html = await resp.text();
        const $ = cheerio.load(html);
        const img =
          $('meta[property="og:image"]').attr("content") ||
          $(".EmbeddedMediaImage").attr("src") ||
          null;
        if (img) return { image_url: img };
      }
    }
  } catch {
    // Fall through to generic
  }
  return scrapeGeneric(url);
}

async function scrapeTikTok(url) {
  // Try TikTok oembed which gives a thumbnail URL
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const resp = await fetchWithTimeout(oembedUrl);
    if (resp.ok) {
      const data = await resp.json();
      if (data?.thumbnail_url) return { image_url: data.thumbnail_url };
    }
  } catch {}
  return scrapeGeneric(url);
}

async function scrapeUrl(url) {
  if (url.includes("instagram.com")) return scrapeInstagram(url);
  if (url.includes("tiktok.com")) return scrapeTikTok(url);
  return scrapeGeneric(url);
}

// ─── Rehost: download CDN URL bytes and upload to Supabase Storage ────────────

async function rehostImage(url) {
  if (!url) return null;
  try {
    const resp = await fetchWithTimeout(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await resp.arrayBuffer());
    const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
    const filename = `scraped/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("recipe-images")
      .upload(filename, buffer, { contentType, upsert: false });
    if (error) {
      console.log("    upload error:", error.message);
      return null;
    }
    const { data } = supabase.storage.from("recipe-images").getPublicUrl(filename);
    return data.publicUrl;
  } catch (e) {
    console.log("    rehost error:", e.message);
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== Image Backfill ===\n");

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, image_url, source_url")
    .not("source_url", "is", null);

  if (error) {
    console.error("DB error:", error);
    process.exit(1);
  }

  const candidates = recipes.filter(
    (r) => r.source_url && (!r.image_url || isExpiringCdn(r.image_url))
  );

  console.log(`Total recipes:    ${recipes.length}`);
  console.log(`Candidates:       ${candidates.length} (no image OR expiring CDN URL)`);
  console.log();

  let updated = 0;
  let rehosted = 0;
  let directSave = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const r = candidates[i];
    const prefix = `[${i + 1}/${candidates.length}] ${r.title?.slice(0, 50)}`;

    try {
      const result = await scrapeUrl(r.source_url);
      const scraped = result.image_url;

      if (!scraped) {
        console.log(`${prefix}  ✗ scrape returned no image`);
        skipped++;
        continue;
      }

      let finalUrl;
      if (isExpiringCdn(scraped)) {
        finalUrl = await rehostImage(scraped);
        if (!finalUrl) {
          console.log(`${prefix}  ✗ rehost failed (CDN URL got, couldn't store)`);
          failed++;
          continue;
        }
        rehosted++;
      } else {
        finalUrl = scraped;
        directSave++;
      }

      const { error: updateError } = await supabase
        .from("recipes")
        .update({ image_url: finalUrl })
        .eq("id", r.id);

      if (updateError) {
        console.log(`${prefix}  ✗ db update error: ${updateError.message}`);
        failed++;
      } else {
        const tag = isExpiringCdn(scraped) ? "[rehosted]" : "[direct]  ";
        console.log(`${prefix}  ✓ ${tag}`);
        updated++;
      }
    } catch (e) {
      console.log(`${prefix}  ✗ exception: ${e.message}`);
      failed++;
    }
  }

  console.log();
  console.log("=== Done ===");
  console.log(`Updated:          ${updated}`);
  console.log(`  rehosted:       ${rehosted}`);
  console.log(`  direct save:    ${directSave}`);
  console.log(`Skipped (no img): ${skipped}`);
  console.log(`Failed:           ${failed}`);

  // Final stats
  const { data: after } = await supabase.from("recipes").select("image_url");
  let healthy = 0, broken = 0;
  for (const r of after) {
    if (isUsableImage(r.image_url)) healthy++;
    else broken++;
  }
  console.log();
  console.log("=== After ===");
  console.log(`Healthy images:   ${healthy} (${((healthy / after.length) * 100).toFixed(0)}%)`);
  console.log(`Broken/missing:   ${broken}`);
}

main().catch((e) => {
  console.error("Script crashed:", e);
  process.exit(1);
});
