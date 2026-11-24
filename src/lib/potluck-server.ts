import { createClient } from "@/lib/supabase/server";

type Sb = Awaited<ReturnType<typeof createClient>>;

/** Everything about a submission that lives in a hand-run migration. */
export type SubmissionExtra = {
  co_user_id: string | null;
  recipe_id: string | null;
  claimed_title: string | null;
  claimed_image: string | null;
};

export type Extras = { ready: boolean; bySubmission: Record<string, SubmissionExtra> };

/* The columns added by hand-run migrations, read separately and allowed to fail.
 *
 * `co_user_id` comes from migration-potluck-cooked-together.sql and the claim
 * columns from migration-potluck-claims.sql, both run by hand. Selecting a
 * column PostgREST does not know about is an ERROR, not an empty result, so
 * asking for these inside the nested submissions select would take the whole
 * Potluck screen — and the Table tab — down until somebody ran the files. The
 * ratings read in /api/kitchen tolerates its table being absent the same way.
 *
 * One query covers both migrations, so `ready` means "all of it is there".
 * Half-migrated is possible in principle and would read as not ready, which is
 * the safe way round: the screens then hide what cannot be saved rather than
 * offering it.
 */
export async function readSubmissionExtras(sb: Sb, potluckIds: string[]): Promise<Extras> {
  if (potluckIds.length === 0) return { ready: true, bySubmission: {} };
  const { data, error } = await sb
    .from("potluck_submissions")
    .select("id,co_user_id,recipe_id,claimed_title,claimed_image")
    .in("potluck_id", potluckIds);
  if (error) return { ready: false, bySubmission: {} };
  const bySubmission: Record<string, SubmissionExtra> = {};
  for (const row of (data ?? []) as ({ id: string } & SubmissionExtra)[]) {
    bySubmission[row.id] = {
      co_user_id: row.co_user_id ?? null,
      recipe_id: row.recipe_id ?? null,
      claimed_title: row.claimed_title ?? null,
      claimed_image: row.claimed_image ?? null,
    };
  }
  return { ready: true, bySubmission };
}

/** Just the co-cooks, for callers that only need "is this person in". */
export function coCooksOf(extras: Extras): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, e] of Object.entries(extras.bySubmission)) if (e.co_user_id) out[id] = e.co_user_id;
  return out;
}
