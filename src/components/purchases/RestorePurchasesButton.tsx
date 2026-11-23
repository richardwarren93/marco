"use client";

// "Restore purchases" — App Store requires a discoverable way to restore a
// subscription (e.g. after reinstall or on a new device). Calls RevenueCat's
// restore on native; on web it's a no-op that explains it's app-only. On a
// successful restore we invalidate the cached entitlement so Plus reflects.

import { useState } from "react";
import { restorePurchases } from "@/lib/purchases";
import { invalidateEntitlement } from "@/lib/useEntitlement";
import { useToast } from "@/components/ui/Toast";
import { DISPLAY, INK, PAPER } from "@/lib/theme";

export default function RestorePurchasesButton() {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  async function handleRestore() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await restorePurchases();
      if (res.active) {
        invalidateEntitlement();
        showToast("Marco Plus restored", { variant: "success", icon: "✨" });
      } else if (res.unavailable) {
        showToast("Restore purchases is available in the app", { variant: "info" });
      } else if (res.error) {
        showToast(res.error, { variant: "info" });
      } else {
        showToast("No purchases to restore", { variant: "info" });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleRestore}
      disabled={busy}
      className="w-full py-3 active:scale-[0.98] transition-transform disabled:opacity-60"
      style={{ background: PAPER, color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, border: `2.5px solid ${INK}`, borderRadius: 12, boxShadow: `3px 4px 0 ${INK}` }}
    >
      {busy ? "Restoring…" : "Restore purchases"}
    </button>
  );
}
