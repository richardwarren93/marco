import { NextResponse } from "next/server";
import { scrapeUrl, detectPlatform } from "@/lib/scraper";
import { extractRecipe } from "@/lib/claude";
import { createClient } from "@/lib/supabase/server";

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
    const scrapedContent = await scrapeUrl(url);

    // Extract recipe using Claude
    const recipe = await extractRecipe(scrapedContent, url);

    return NextResponse.json({
      recipe: {
        ...recipe,
        source_url: url,
        source_platform: detectPlatform(url),
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
