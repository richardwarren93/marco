/* Marco's palette, for inline styles.
 *
 * These mirror the custom properties in `src/app/globals.css` exactly. Use
 * `var(--tomato)` in CSS and className strings; import from here when you're
 * writing a `style={{ }}` object, which is most of this codebase.
 *
 * Before this file there were 220 copies of these constants spread across 32
 * components, and `INK` meant #171410 in some of them and #1C1A17 in others.
 */

export const TOMATO = "#E5462E";
export const TOMATO_DARK = "#B8331E";
export const MUSTARD = "#E8A33D";
export const MUSTARD_SOFT = "#F2C77A";
export const BUTTER = "#FFD84D";
export const LIME = "#C4EE45";
export const LAV = "#C9B8FF";
export const COBALT = "#2540E8";
export const PINK = "#FF4D9D";
export const TEAL = "#0F4C5C";
export const TEAL_DEEP = "#082E38";

export const SURFACE = "#E9E2D3";
export const CREAM = "#F5EEE2";
export const CREAM_WARM = "#EFE5D2";
export const PAPER = "#FBF7EE";

export const INK = "#171410";
export const INK_SOFT = "#4A4742";
export const INK_MUTED = "#A09890";

export const LINE = "rgba(23, 20, 16, 0.12)";

/** The dotted paper the Kitchen layer is printed on. */
export const SURFACE_DOTS = {
  background: SURFACE,
  backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)",
  backgroundSize: "13px 13px",
} as const;

/** Type families. The literal stacks live in globals.css; these are for
 *  `style={{ fontFamily: DISPLAY }}`. */
export const DISPLAY = "var(--font-chaos)";
export const HAND = "var(--font-hand)";
export const SERIF = "var(--font-display)";
export const MONO = "var(--font-mono)";
