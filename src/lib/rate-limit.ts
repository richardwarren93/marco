import { createClient } from "@/lib/supabase/server";

/**
 * Atomically increments the daily usage counter and checks against the limit.
 * Returns { allowed: false } if the limit is already reached (count was at limit before increment).
 * Uses a Postgres upsert so concurrent requests are safe.
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string,
  dailyLimit: number
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase.rpc("increment_ai_usage", {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_date: today,
    });

    if (error) {
      // Fail open — don't block the request if the table isn't set up yet
      console.error("Rate limit check error:", error.message);
      return { allowed: true, remaining: dailyLimit };
    }

    const newCount = data as number;
    const allowed = newCount <= dailyLimit;
    const remaining = Math.max(0, dailyLimit - newCount);
    return { allowed, remaining };
  } catch {
    return { allowed: true, remaining: dailyLimit };
  }
}
