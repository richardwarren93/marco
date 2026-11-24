import { createClient } from "@/lib/supabase/server";

type Sb = Awaited<ReturnType<typeof createClient>>;

/* Who else is named on each dish — read separately, and allowed to fail.
 *
 * `co_user_id` arrives with supabase/migration-potluck-cooked-together.sql,
 * which is run by hand. Selecting a column that does not exist yet is an error
 * from PostgREST, so asking for it inside the nested submissions select would
 * take the whole Potluck screen — and the Table tab — down until somebody runs
 * the file. This is the same shape as the ratings read in /api/kitchen, which
 * tolerates its table being absent.
 *
 * So it is its own query, and `ready` is false when the column is not there.
 * The screens use that to hide the "cooked with" picker rather than offer
 * something that cannot be saved.
 */
export async function readCoCooks(sb: Sb, potluckIds: string[]): Promise<{ ready: boolean; bySubmission: Record<string, string> }> {
  if (potluckIds.length === 0) return { ready: true, bySubmission: {} };
  const { data, error } = await sb
    .from("potluck_submissions")
    .select("id,co_user_id")
    .in("potluck_id", potluckIds);
  if (error) return { ready: false, bySubmission: {} };
  const bySubmission: Record<string, string> = {};
  for (const row of (data ?? []) as { id: string; co_user_id: string | null }[]) {
    if (row.co_user_id) bySubmission[row.id] = row.co_user_id;
  }
  return { ready: true, bySubmission };
}
