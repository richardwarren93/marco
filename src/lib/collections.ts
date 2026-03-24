import { SupabaseClient } from "@supabase/supabase-js";

export const RECENTLY_MADE_COLLECTION_NAME = "Recently Made";

/**
 * Find or create the "Recently Made" collection for a user.
 * Returns the collection ID.
 */
export async function getOrCreateRecentlyMadeCollection(
  admin: SupabaseClient,
  userId: string
): Promise<string> {
  // Check if it already exists
  const { data: existing } = await admin
    .from("collections")
    .select("id")
    .eq("user_id", userId)
    .eq("name", RECENTLY_MADE_COLLECTION_NAME)
    .limit(1)
    .single();

  if (existing) return existing.id;

  // Create it
  const { data: created, error } = await admin
    .from("collections")
    .insert({
      user_id: userId,
      name: RECENTLY_MADE_COLLECTION_NAME,
      description: "Recipes you've cooked recently",
      is_public: false,
    })
    .select("id")
    .single();

  if (error) {
    // Race condition: another request may have created it
    const { data: retry } = await admin
      .from("collections")
      .select("id")
      .eq("user_id", userId)
      .eq("name", RECENTLY_MADE_COLLECTION_NAME)
      .limit(1)
      .single();

    if (retry) return retry.id;
    throw error;
  }

  return created.id;
}
