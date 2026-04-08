import { createAdminClient } from "@/lib/supabase/admin";

const FETCH_TIMEOUT_MS = 10_000;

/**
 * Returns true if the given image URL is from a CDN that expires/blocks
 * hotlinking and should NOT be persisted as-is. Instagram, TikTok, and
 * Facebook CDN URLs all return 403 after a few hours.
 */
export function isExpiringCdn(url: string | null | undefined): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("cdninstagram") ||
    lower.includes("scontent") ||
    lower.includes("tiktokcdn") ||
    lower.includes("fbcdn")
  );
}

/**
 * Download an image from any URL and re-upload it to Supabase Storage so
 * it never expires. Returns the permanent public URL on success, or null
 * if anything fails.
 *
 * Use this on any image URL coming from a third-party CDN before saving
 * to the recipes table.
 */
export async function rehostImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!resp.ok) return null;
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await resp.arrayBuffer());
    const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
    const filename = `scraped/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const admin = createAdminClient();
    const { error } = await admin.storage
      .from("recipe-images")
      .upload(filename, buffer, { contentType, upsert: false });
    if (error) return null;
    const { data: { publicUrl } } = admin.storage.from("recipe-images").getPublicUrl(filename);
    return publicUrl;
  } catch {
    return null;
  }
}

/**
 * Rehost an image only if it's from an expiring CDN. Permanent URLs
 * (like our own Supabase storage URLs, or stable CDNs like Cloudinary)
 * pass through unchanged.
 */
export async function rehostIfExpiring(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (!isExpiringCdn(url)) return url;
  return rehostImage(url);
}
