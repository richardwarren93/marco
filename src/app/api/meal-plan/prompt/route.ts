import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { promptRecipes } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import type { PantryItem, Recipe } from "@/types";

const DISCOVER_DAILY_LIMIT = 10;

/** Fetch the og:image from a URL by doing a lightweight HEAD-style fetch */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Marco/1.0)",
        Accept: "text/html",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    // Only read first 50KB to find og:image quickly
    const reader = res.body?.getReader();
    if (!reader) return null;

    let html = "";
    const decoder = new TextDecoder();
    while (html.length < 50000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      // Check if we have enough to find og:image
      const match = html.match(
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
      ) || html.match(
        /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i
      );
      if (match) {
        reader.cancel();
        return match[1];
      }
    }
    reader.cancel();
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, remaining } = await checkRateLimit(user.id, "discover", DISCOVER_DAILY_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { error: `Daily Discover limit reached (${DISCOVER_DAILY_LIMIT}/day). Try again tomorrow.` },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { prompt, context } = body as {
      prompt: string;
      context: "all" | "my_kitchen";
    };

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    let kitchenContext:
      | {
          pantryItems?: PantryItem[];
          equipment?: string[];
          recipes?: Recipe[];
        }
      | undefined;

    if (context === "my_kitchen") {
      const [pantryRes, equipmentRes, recipesRes] = await Promise.all([
        supabase.from("pantry_items").select("*"),
        supabase
          .from("user_equipment")
          .select("equipment_name")
          .eq("user_id", user.id),
        supabase
          .from("recipes")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      kitchenContext = {
        pantryItems: (pantryRes.data as PantryItem[]) || [],
        equipment:
          equipmentRes.data?.map((e) => e.equipment_name) || [],
        recipes: (recipesRes.data as Recipe[]) || [],
      };
    }

    const results = await promptRecipes(prompt, context, kitchenContext);

    // Enrich results with images by fetching OG images from source URLs
    const enriched = await Promise.all(
      results.map(async (result) => {
        if (result.source_url && !result.image_url) {
          try {
            const imgUrl = await fetchOgImage(result.source_url);
            if (imgUrl) return { ...result, image_url: imgUrl };
          } catch {
            // ignore — no image is fine
          }
        }
        return result;
      })
    );

    return NextResponse.json({ results: enriched }, {
      headers: { "X-RateLimit-Remaining": String(remaining) },
    });
  } catch (error) {
    console.error("Prompt recipes error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
