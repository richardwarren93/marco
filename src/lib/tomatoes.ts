// SERVER-ONLY. This module uses the service-role admin client — never import it
// from a client component. It only depends on admin.ts and gamification.ts.

import { createAdminClient } from "@/lib/supabase/admin";
import type { TomatoReason } from "@/lib/gamification";

interface AwardArgs {
  userId: string;
  amount: number;
  reason: TomatoReason;
  /**
   * Ledger reference (uuid) stored on the transaction for traceability — e.g. the
   * cooking_log / meal_plan / note id. Stored but NOT deduped (use dedupeKey for that),
   * so repeatable actions like feeding the pet aren't blocked.
   */
  referenceId?: string | null;
  /**
   * Idempotency key (uuid). When set, the award is skipped if a prior transaction with
   * the same (user_id, reason, reference_id == dedupeKey) already exists, and this value
   * is what gets stored as reference_id. Pass the id of the entity the award is "about"
   * (recipe, friendship, planned slot, cooking_log) so re-firing never re-awards.
   */
  dedupeKey?: string | null;
  /** Max awards of this reason allowed per UTC day. When the cap is hit, awarding is skipped. */
  dailyCap?: number;
}

interface AwardResult {
  awarded: boolean;
  amount: number;
  newBalance: number;
}

/** Start of the current UTC day, ISO string — matches getWeekStart()'s UTC convention. */
function utcDayStart(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Award (or deduct, for negative amounts) tomatoes through the shared ledger.
 *
 * Non-throwing by contract: awards are always secondary to the primary action
 * (logging a cook, accepting a friend, …), so any failure resolves to
 * { awarded: false } rather than throwing. Callers surface the result only when
 * `awarded` is true (e.g. an earn toast).
 */
export async function awardTomatoes({
  userId,
  amount,
  reason,
  referenceId = null,
  dedupeKey,
  dailyCap,
}: AwardArgs): Promise<AwardResult> {
  const admin = createAdminClient();

  // Helper to read the current cached balance for a no-op return.
  const readBalance = async (): Promise<number> => {
    const { data } = await admin
      .from("user_profiles")
      .select("tomato_balance")
      .eq("user_id", userId)
      .single();
    return data?.tomato_balance ?? 0;
  };

  // What lands in reference_id: the dedupe key when deduping, else the plain reference.
  const storedRef = dedupeKey ?? referenceId ?? null;

  try {
    // 1. Idempotency — only when an explicit dedupeKey is given. Skip if this exact
    //    (user, reason, dedupeKey) already awarded.
    if (dedupeKey) {
      const { data: existing } = await admin
        .from("tomato_transactions")
        .select("id")
        .eq("user_id", userId)
        .eq("reason", reason)
        .eq("reference_id", dedupeKey)
        .limit(1);
      if (existing && existing.length > 0) {
        return { awarded: false, amount: 0, newBalance: await readBalance() };
      }
    }

    // 2. Daily cap — skip once today's count for this reason hits the cap.
    if (dailyCap !== undefined) {
      const { count } = await admin
        .from("tomato_transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("reason", reason)
        .gte("created_at", utcDayStart());
      if ((count ?? 0) >= dailyCap) {
        return { awarded: false, amount: 0, newBalance: await readBalance() };
      }
    }

    // 3. Insert the ledger row.
    await admin.from("tomato_transactions").insert({
      user_id: userId,
      amount,
      reason,
      reference_id: storedRef,
    });

    // 4. Atomically bump the cached balance via the RPC.
    const { data: rpcBalance, error: rpcError } = await admin.rpc("increment_tomato_balance", {
      p_user_id: userId,
      p_amount: amount,
    });

    if (!rpcError && typeof rpcBalance === "number") {
      return { awarded: true, amount, newBalance: rpcBalance };
    }

    // Safety net: manual read-modify-write if the RPC is unavailable / returns null.
    const current = await readBalance();
    const next = current + amount;
    await admin.from("user_profiles").update({ tomato_balance: next }).eq("user_id", userId);
    return { awarded: true, amount, newBalance: next };
  } catch {
    // Never let an award failure break the primary action.
    return { awarded: false, amount: 0, newBalance: 0 };
  }
}
