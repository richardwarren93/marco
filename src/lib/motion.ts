// Marco's motion vocabulary — one place for every spring, so the whole app
// moves like the same physical paper. Use these instead of ad-hoc timings.
//
//   sticker — snappy, a little overshoot: stickers, stamps, the dock's
//             "you are here" marker, chips being pressed on.
//   sheet   — softer, settled: sheets and cards arriving or leaving.
//   press   — the squash when you tap something tactile.

export const SPRING_STICKER = { type: "spring", stiffness: 520, damping: 30, mass: 0.8 } as const;
export const SPRING_SHEET = { type: "spring", stiffness: 320, damping: 32 } as const;
export const PRESS = { scale: 0.92 } as const;
