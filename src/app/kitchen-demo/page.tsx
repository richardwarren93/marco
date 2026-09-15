"use client";

// Architecture demo (dev): the SAME base kitchen rendered in four progression
// states — produced by different combinations of modular assets, NOT four
// flattened images. Proves the modular scene from the spec: one coherent
// illustration that becomes more personal as the user cooks.

import KitchenScene from "@/components/kitchen/KitchenScene";
import { DEMO_STATES } from "@/lib/kitchen/scene";

export default function KitchenDemoPage() {
  return (
    <div style={{ minHeight: "100dvh", background: "#17130f", padding: "24px 16px 48px", color: "#F5EEE2" }}>
      <h1 style={{ fontFamily: "var(--font-display, Georgia, serif)", fontSize: 24, marginBottom: 4 }}>
        Modular kitchen — one base, four states
      </h1>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 20, maxWidth: 640 }}>
        Same <code>starter.png</code> base painting. Herbs + cookbooks render from{" "}
        <code>KitchenState</code> (other zones defined but awaiting art). Nothing here is a
        flattened whole-kitchen image.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 18, maxWidth: 960 }}>
        {DEMO_STATES.map(({ label, state }) => (
          <div key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
              <span style={{ fontSize: 11, opacity: 0.6, fontFamily: "var(--font-mono, monospace)" }}>
                herb {state.consistency.herbStage} · shelf {state.repertoire.shelfState}
              </span>
            </div>
            <div style={{ position: "relative", aspectRatio: "9 / 16", borderRadius: 12, overflow: "hidden", background: "#A9683A", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              <KitchenScene baseImage="/kitchen/starter.png" kitchenState={state} showMarco={false} interactiveZones={false} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
