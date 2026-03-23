import { NextResponse } from "next/server";
import { scrapeUrl, detectPlatform } from "@/lib/scraper";
import { extractRecipe } from "@/lib/claude";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Download a scraped image URL and re-upload to Supabase so it never expires.
// Returns the permanent public URL, or null if anything fails.
async function rehostImage(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(10000),
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

export async function POST(request: Request) {
  // Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Scrape the URL content
    const { content: scrapedContent, image_url: scraped_image_url } = await scrapeUrl(url);

    console.log("Scraped content preview:", scrapedContent.slice(0, 500));
    console.log("Scraped content length:", scrapedContent.length);

    // Extract recipe using Claude (run in parallel with image rehosting)
    const [recipe, image_url] = await Promise.all([
      extractRecipe(scrapedContent, url),
      rehostImage(scraped_image_url),
    ]);

    return NextResponse.json({
      recipe: {
        ...recipe,
        source_url: url,
        source_platform: detectPlatform(url),
        image_url,
      },
    });
  } catch (error) {
    console.error("Recipe extraction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to extract recipe",
      },
      { status: 500 }
    );
  }
}
