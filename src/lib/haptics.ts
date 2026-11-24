/* Tactile feedback, where there is anything to feel.
 *
 * @capacitor/haptics has been a dependency since the iOS shell was set up and
 * has never been imported. On the phone this is what "tap feedback" actually
 * means — a scale tween is a picture of a tap, not the feel of one.
 *
 * Imported lazily and wrapped, so the web build neither loads it up front nor
 * notices when it is unavailable. Every call is fire-and-forget: feedback that
 * fails is not worth a single line of error handling at a call site.
 */

type Impact = "light" | "medium";

async function plugin() {
  const mod = await import("@capacitor/haptics");
  return mod;
}

export function tap(strength: Impact = "light") {
  void (async () => {
    try {
      const { Haptics, ImpactStyle } = await plugin();
      await Haptics.impact({ style: strength === "medium" ? ImpactStyle.Medium : ImpactStyle.Light });
    } catch { /* web, or a device with nothing to buzz */ }
  })();
}

/** The one moment worth a notification buzz rather than a tap: a dish lands. */
export function celebrate() {
  void (async () => {
    try {
      const { Haptics, NotificationType } = await plugin();
      await Haptics.notification({ type: NotificationType.Success });
    } catch { /* ignore */ }
  })();
}
