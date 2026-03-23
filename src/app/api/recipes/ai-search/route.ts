import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Recipe } from "@/types";

const HAIKU_DAILY_LIMIT = 25;

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(user.id, "ai-search", HAIKU_DAILY_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { error: `Daily AI search limit reached (${HAIKU_DAILY_LIMIT}/day). Try again tomorrow.` },
      { status: 429 }
    );
  }

  const { query, meal_type } = await request.json();
  if (!query?.trim()) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }

  let recipesQuery = supabase
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (meal_type) {
    recipesQuery = recipesQuery.eq("meal_type", meal_type);
  }

  const { data: recipes } = await recipesQuery;

  if (!recipes?.length) {
    return NextResponse.json({ recipes: [] });
  }

  const recipeList = (recipes as Recipe[])
    .map(
      (r) =>
        `ID:${r.id} | "${r.title}" | ${r.meal_type || "dinner"} | tags: ${(r.tags || []).join(", ")} | ${r.description || ""}`
    )
    .join("\n");

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Here are the user's saved recipes:\n${recipeList}\n\nQuery: "${query}"\n\nWhich recipes best match this query? Return ONLY a JSON array of up to 5 matching recipe IDs (the UUID strings after "ID:"). Return an empty array if nothing matches well. No markdown, no explanation.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "[]";
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let ids: string[] = [];
  try {
    ids = JSON.parse(cleaned);
  } catch {
    ids = [];
  }

  const matched = (recipes as Recipe[]).filter((r) => ids.includes(r.id));
  return NextResponse.json({ recipes: matched });
}
