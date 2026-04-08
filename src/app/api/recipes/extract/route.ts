import { NextResponse } from "next/server";
import { scrapeUrl, detectPlatform } from "@/lib/scraper";
import { extractRecipe, extractRecipeFromCarousel } from "@/lib/claude";
import { createClient } from "@/lib/supabase/server";
import { rehostImage } from "@/lib/image-rehost";

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
    const { content: scrapedContent, image_url: scraped_image_url, image_urls } = await scrapeUrl(url);

    console.log("Scraped content preview:", scrapedContent.slice(0, 500));
    console.log("Scraped content length:", scrapedContent.length);
    if (image_urls?.length) console.log("Carousel detected:", image_urls.length, "slides");

    // Extract recipe: carousel path (vision on all slides) vs standard path (text-based)
    const [recipe, image_url] = await Promise.all([
      image_urls?.length
        ? extractRecipeFromCarousel(image_urls, scrapedContent)
        : extractRecipe(scrapedContent, url),
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
