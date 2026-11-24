import { createClient } from "@/lib/supabase/server";

type Sb = Awaited<ReturnType<typeof createClient>>;

/** Everything about a submission that lives in a hand-run migration. */
export type SubmissionExtra = {
  co_user_id: string | null;
  recipe_id: string | null;
  claimed_title: string | null;
  claimed_image: string | null;
};

export type Extras = {
  /** Claiming is available: migration-potluck-claims.sql has run. */
  ready: boolean;
  /** Naming a second cook is available: migration-potluck-cooked-together.sql. */
  coReady: boolean;
  bySubmission: Record<string, SubmissionExtra>;
};

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
  if (potluckIds.length === 0) return { ready: true, coReady: true, bySubmission: {} };

  /* ONE query per migration, not one query for both.
   *
   * This used to select co_user_id, recipe_id, claimed_title and
   * claimed_image together. Those columns come from TWO different hand-run
   * migrations, and PostgREST fails the whole select if any one column is
   * unknown — so running the claims migration and not the cooked-together one
   * (or the other way round) left the screen looking exactly as it did before
   * either. "I ran the migration and nothing changed" was the symptom, and it
   * was this.
   *
   * Split, each migration switches on its own feature the moment it is run.
   */
  const [co, claims] = await Promise.all([
    sb.from("potluck_submissions").select("id,co_user_id").in("potluck_id", potluckIds),
    sb.from("potluck_submissions").select("id,recipe_id,claimed_title,claimed_image").in("potluck_id", potluckIds),
  ]);

  const bySubmission: Record<string, SubmissionExtra> = {};
  const row = (id: string) => (bySubmission[id] ??= { co_user_id: null, recipe_id: null, claimed_title: null, claimed_image: null });

  if (!co.error) {
    for (const r of (co.data ?? []) as { id: string; co_user_id: string | null }[]) row(r.id).co_user_id = r.co_user_id ?? null;
  }
  if (!claims.error) {
    for (const r of (claims.data ?? []) as { id: string; recipe_id: string | null; claimed_title: string | null; claimed_image: string | null }[]) {
      const x = row(r.id);
      x.recipe_id = r.recipe_id ?? null;
      x.claimed_title = r.claimed_title ?? null;
      x.claimed_image = r.claimed_image ?? null;
    }
  }

  return { ready: !claims.error, coReady: !co.error, bySubmission };
}

/** Just the co-cooks, for callers that only need "is this person in". */
export function coCooksOf(extras: Extras): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, e] of Object.entries(extras.bySubmission)) if (e.co_user_id) out[id] = e.co_user_id;
  return out;
}

/* ── Reactions ────────────────────────────────────────────────────────────── */

export type Reaction = {
  id: string;
  kind: "heart" | "note" | "nudge";
  from_user_id: string;
  submission_id: string | null;
  target_user_id: string | null;
  body: string | null;
};

/* Read the same way as the hand-run columns above, and for the same reason:
   migration-potluck-reactions.sql is run by hand, and selecting from a table
   PostgREST does not know about is an error rather than an empty list. If it
   is missing, `ready` is false and the screens hide the heart, the note field
   and the nudge rather than offering what cannot be saved. */
export async function readReactions(sb: Sb, potluckIds: string[]): Promise<{ ready: boolean; rows: Reaction[] }> {
  if (potluckIds.length === 0) return { ready: true, rows: [] };
  const { data, error } = await sb
    .from("potluck_reactions")
    .select("id,kind,from_user_id,submission_id,target_user_id,body")
    .in("potluck_id", potluckIds)
    .order("created_at", { ascending: true })
    .limit(400);
  if (error) return { ready: false, rows: [] };
  return { ready: true, rows: (data ?? []) as Reaction[] };
}
