/* What the table is, as plain data.
 *
 * The canvas renders this and nothing else. No Supabase types, no SWR, no Pixi
 * — so the scene can be reasoned about, diffed and tested without a renderer,
 * and the renderer never has to know where a dish came from.
 *
 * ── On the seat states the spec asks for ────────────────────────────────────
 * The spec lists seven: empty, invited, attending, declined, attending without
 * a dish, with a planned dish, with a cooked dish.
 *
 * Four of those exist in this database. `crew_members` has a role and a
 * joined_at and nothing else — there is no RSVP anywhere in the schema, so
 * "invited", "attending" and "declined" have nothing to read from. Everyone at
 * a table is implicitly in. Rendering them would mean inventing a reply nobody
 * has given, which is worse than a seat that says only what is true.
 *
 * So: a seat is empty, or it is somebody who has brought nothing yet, or
 * something planned, or something cooked. Adding the other three is a schema
 * decision (a potluck_rsvps table), not a rendering one.
 */

export type SeatState = "empty" | "no-dish" | "planned" | "cooked";

export type SceneSeat = {
  /** Stable across renders: the crew member's user id, or `empty:<n>`. */
  id: string;
  name: string;
  isYou: boolean;
  state: SeatState;
  dishIds: string[];
};

export type SceneDish = {
  /** The submission id — stable, so a dish keeps its place on the table. */
  id: string;
  seatId: string;
  title: string;
  who: string;
  cooked: boolean;
};

/** Stage one "setting the table" through stage four "the feast". */
export type Stage = 1 | 2 | 3 | 4;

export type SceneModel = {
  seats: SceneSeat[];
  dishes: SceneDish[];
  stage: Stage;
  dishCount: number;
  cookedCount: number;
};

export type ModelInput = {
  members: { id: string; name: string; isYou: boolean }[];
  submissions: { id: string; user_id: string; cookedTitle: string | null; claimedTitle: string | null; cooked: boolean }[];
  /** submission id → the second person named on that dish. */
  coCooks: Record<string, string>;
  myId: string;
  open: boolean;
};

/** Empty chairs while there is still time, so a bare table reads as an invitation. */
const SPARE_SEATS = 2;

export function buildModel({ members, submissions, coCooks, myId, open }: ModelInput): SceneModel {
  const dishes: SceneDish[] = submissions.map((s) => ({
    id: s.id,
    seatId: s.user_id,
    title: s.cookedTitle || s.claimedTitle || "a dish",
    who: s.user_id === myId ? "you" : members.find((m) => m.id === s.user_id)?.name ?? "a friend",
    cooked: s.cooked,
  }));

  const seats: SceneSeat[] = members.map((m) => {
    // A dish you are the second name on still seats you with it.
    const mine = dishes.filter((d) => d.seatId === m.id || coCooks[d.id] === m.id);
    const state: SeatState = mine.length === 0 ? "no-dish" : mine.some((d) => d.cooked) ? "cooked" : "planned";
    return { id: m.id, name: m.isYou ? "you" : m.name, isYou: m.isYou, state, dishIds: mine.map((d) => d.id) };
  });

  if (open) {
    for (let i = 0; i < SPARE_SEATS; i++) {
      seats.push({ id: `empty:${i}`, name: "", isYou: false, state: "empty", dishIds: [] });
    }
  }

  const dishCount = dishes.length;
  const cookedCount = dishes.filter((d) => d.cooked).length;

  // The table gets better-looking as the week goes on. Four stages, decided
  // here rather than in the renderer so the thresholds are reviewable.
  const seated = seats.filter((s) => s.state !== "empty").length;
  const stage: Stage =
    dishCount > 0 && cookedCount === dishCount ? 4
    : cookedCount > 0 ? 3
    : dishCount > 0 || seated > 1 ? 2
    : 1;

  return { seats, dishes, stage, dishCount, cookedCount };
}

/** Where seat `i` of `n` sits, on an ellipse that matches the camera's tilt. */
export function seatAngle(i: number, n: number): number {
  // Start at the bottom and go clockwise, so the first guest sits nearest the
  // viewer rather than behind the table where their face would be hidden.
  return (90 + (360 / Math.max(n, 1)) * i) * (Math.PI / 180);
}

export function onEllipse(angle: number, rx: number, ry: number): { x: number; y: number } {
  return { x: Math.cos(angle) * rx, y: Math.sin(angle) * ry };
}
