/* When a potluck is over — one answer, used by the server and both screens.
 *
 * `potlucks.status` has always had a 'served' value and nothing has ever
 * written it, so every potluck ever created is still 'active'. Rather than add
 * a scheduled job to flip rows, the cook-by date IS the close: a potluck is
 * served once that date has passed. The column stays as the manual override
 * (closing early, or reopening), so nothing has to run on a timer for this
 * week's potluck to become last week's.
 *
 * The deadline day itself still counts as open — "cook by Sunday" means you
 * can cook on Sunday.
 */

/** The viewer's local date as YYYY-MM-DD, to compare with a `date` column. */
export const localISO = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export type PotluckLike = { status: string; deadline: string | null };

export function isServed(p: PotluckLike, today = localISO()): boolean {
  if (p.status !== "active") return true;
  return !!p.deadline && p.deadline < today;
}

/** Whole days from today to the cook-by date. 0 = due today. Null = no date. */
export function daysLeft(deadline: string | null, today = localISO()): number | null {
  if (!deadline) return null;
  const ms = Date.parse(`${deadline}T12:00:00`) - Date.parse(`${today}T12:00:00`);
  return Math.round(ms / 86_400_000);
}

/** The line under a potluck's theme: how long you have, or that it is over. */
export function deadlineLabel(p: PotluckLike, today = localISO()): string {
  if (isServed(p, today)) return "served";
  const n = daysLeft(p.deadline, today);
  if (n === null) return "no cook-by date";
  if (n <= 0) return "cook by tonight";
  if (n === 1) return "cook by tomorrow";
  if (n <= 6) return `${n} days to cook`;
  return `cook by ${new Date(`${p.deadline}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`;
}
