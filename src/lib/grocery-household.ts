import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Resolve the canonical grocery-list owner for a user.
 *
 * - Solo users (no household membership) → returns `userId` unchanged.
 * - Household members → returns `households.created_by` (the household creator),
 *   which is treated as the single source of truth for the household's
 *   grocery list. Every household member reads/writes to that one list.
 *
 * This eliminates double-counting that occurred when each household member
 * had their own grocery_lists row aggregated from the same shared meal plans.
 */
export async function getCanonicalListUserId(
  admin: AdminClient,
  userId: string
): Promise<string> {
  const { data: membership } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) return userId;

  const { data: household } = await admin
    .from("households")
    .select("created_by")
    .eq("id", membership.household_id)
    .maybeSingle();

  // Fallback to the requester if anything is unexpected (e.g. household row
  // missing for some reason). Better to write to your own list than to error.
  return household?.created_by ?? userId;
}
