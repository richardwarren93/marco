"use client";

// "Restore purchases" — App Store requires a discoverable way to restore a
// subscription (e.g. after reinstall or on a new device). Calls RevenueCat's
// restore on native; on web it's a no-op that explains it's app-only. On a
// successful restore we invalidate the cached entitlement so Plus reflects.

import { useState } from "react";
import { restorePurchases } from "@/lib/purchases";
import { invalidateEntitlement } from "@/lib/useEntitlement";
import { useToast } from "@/components/ui/Toast";

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
      className="w-full py-3 rounded-2xl text-sm font-medium transition-colors active:scale-[0.98] disabled:opacity-60"
      style={{ color: "rgba(28,26,23,0.55)", background: "rgba(28,26,23,0.04)" }}
    >
      {busy ? "Restoring…" : "Restore purchases"}
    </button>
  );
}
