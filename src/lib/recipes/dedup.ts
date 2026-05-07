import type { SupabaseClient } from "@supabase/supabase-js";

export type DedupCandidate = {
  title: string;
  source_url?: string | null;
  image_url?: string | null;
};

export type ExistingRecipe = { id: string; title: string };

function normTitle(title: string): string {
  return title.trim().toLowerCase();
}

export async function findExistingRecipeByFingerprint(
  admin: SupabaseClient,
  userId: string,
  candidate: DedupCandidate,
): Promise<ExistingRecipe | null> {
  const sourceUrl = candidate.source_url?.trim() || null;
  const imageUrl = candidate.image_url?.trim() || null;
  const title = normTitle(candidate.title || "");

  if (sourceUrl) {
    const { data } = await admin
      .from("recipes")
      .select("id, title")
      .eq("user_id", userId)
      .eq("source_url", sourceUrl)
      .maybeSingle();
    return data ?? null;
  }

  if (!title) return null;

  if (imageUrl) {
    const { data } = await admin
      .from("recipes")
      .select("id, title")
      .eq("user_id", userId)
      .is("source_url", null)
      .eq("image_url", imageUrl)
      .ilike("title", title)
      .maybeSingle();
    return data ?? null;
  }

  const { data } = await admin
    .from("recipes")
    .select("id, title")
    .eq("user_id", userId)
    .is("source_url", null)
    .is("image_url", null)
    .ilike("title", title)
    .maybeSingle();
  return data ?? null;
}
