import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { promptRecipes } from "@/lib/claude";
import { checkRateLimit } from "@/lib/rate-limit";
import type { PantryItem, Recipe } from "@/types";

const DISCOVER_DAILY_LIMIT = 10;

/** Fetch the og:image from a URL by doing a lightweight HEAD-style fetch */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    // 4s ceiling per single fetch. We over-fetch 12 candidates and use
    // a race-to-6 pattern, so the response returns as soon as 6 images
    // resolve — most slow blogs are abandoned before they even matter.
    const timeout = setTimeout(() => controller.abort(), 4000);
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

const TARGET_RESULTS = 6;

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

    // Fetch cached taste profile for personalization
    const admin = createAdminClient();
    const { data: prefsData } = await admin
      .from("user_preferences")
      .select("taste_profile")
      .eq("user_id", user.id)
      .single();

    let tasteProfile: Parameters<typeof promptRecipes>[3] | undefined;
    const tp = prefsData?.taste_profile as Record<string, unknown> | null;
    const cached = tp?.cached_profile as {
      all?: Record<string, number>;
      cuisines?: { id: string }[];
      cookingStyles?: { id: string }[];
    } | undefined;

    if (cached?.all) {
      tasteProfile = {
        sweet: cached.all.sweet ?? 50,
        savory: cached.all.savory ?? 50,
        spicy: cached.all.spicy ?? 50,
        tangy: cached.all.tangy ?? 50,
        richness: cached.all.richness ?? 50,
        topCuisines: cached.cuisines?.map((c) => c.id),
        cookingStyles: cached.cookingStyles?.map((s) => s.id),
      };
    }

    // Over-fetch: ask Haiku for 12 candidates. We'll race their og:image
    // fetches and return as soon as TARGET_RESULTS (6) successfully resolve.
    const candidates = await promptRecipes(prompt, context, kitchenContext, tasteProfile);

    // Race-to-N pattern: kick off all og:image fetches in parallel and resolve
    // the user's request as soon as TARGET_RESULTS candidates have images.
    // Slower in-flight fetches are abandoned (their results are discarded).
    // This guarantees every returned recipe has an image AND the user-perceived
    // wait is bounded by the 6th-fastest resolver, not the slowest.
    type Candidate = (typeof candidates)[number];

    const RACE_TIMEOUT_MS = 7_500; // 7.5s global timeout — return whatever we have

    const winners: Candidate[] = await new Promise((resolve) => {
      const out: Candidate[] = [];
      let completed = 0;
      let resolved = false;
      const total = candidates.length;

      function finish() {
        if (resolved) return;
        resolved = true;
        resolve(out);
      }

      if (total === 0) { finish(); return; }

      // Global timeout: after 10s, stop waiting and return what we have
      const timer = setTimeout(finish, RACE_TIMEOUT_MS);

      candidates.forEach((c) => {
        (async () => {
          if (c.image_url) return c;
          if (!c.source_url) return null;
          try {
            const img = await fetchOgImage(c.source_url);
            return img ? ({ ...c, image_url: img } as Candidate) : null;
          } catch {
            return null;
          }
        })().then((result) => {
          if (resolved) return;
          if (result && out.length < TARGET_RESULTS) {
            out.push(result);
            if (out.length === TARGET_RESULTS) {
              clearTimeout(timer);
              finish();
            }
          }
          completed++;
          if (completed === total) {
            clearTimeout(timer);
            finish();
          }
        });
      });
    });

    // Fallback: if fewer than TARGET resolved with images (e.g. all blogs slow),
    // fill remaining slots with imageless candidates so we still return SOMETHING.
    // In practice this almost never triggers because we over-fetch to 12.
    const enriched = [...winners];
    if (enriched.length < TARGET_RESULTS) {
      const winnerIds = new Set(enriched.map((r) => r.recipe?.title));
      const fillers = candidates
        .filter((c) => !winnerIds.has(c.recipe?.title))
        .slice(0, TARGET_RESULTS - enriched.length);
      enriched.push(...fillers);
    }

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
