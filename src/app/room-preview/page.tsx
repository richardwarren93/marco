"use client";

// DEV-ONLY preview of the three-view swipeable Home room + the auto-pan reveal.
// Placeholder panels (tinted copies of the current base) stand in until the real
// matched Left/Center/Right art lands. Safe to delete.

import { useState } from "react";
import RoomView, { type RoomPanel } from "@/components/kitchen/RoomView";

function Panel({ src }: { src: string }) {
  return (
    <div className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "center bottom" }} />
    </div>
  );
}

export default function RoomPreviewPage() {
  const [reveal, setReveal] = useState<{ panel: RoomPanel; nonce: number } | null>(null);
  const [parked, setParked] = useState<RoomPanel>("center");
  const fire = (panel: RoomPanel) => setReveal({ panel, nonce: Date.now() });

  return (
    <div className="fixed inset-0" style={{ background: "#000" }}>
      <RoomView
        initial="center"
        reveal={reveal}
        overviewBackdrop="/kitchen/room-wide.png"
        overviewImage="/kitchen/room-wide.png"
        onPanelChange={setParked}
        left={<Panel src="/kitchen/room-left.png" />}
        center={<Panel src="/kitchen/room-center.png" />}
        right={<Panel src="/kitchen/room-right.png" />}
      />

      {/* Dev controls — simulate a cook that changes an off-screen panel */}
      <div className="absolute inset-x-0 flex flex-col items-center gap-2 px-4" style={{ bottom: "calc(env(safe-area-inset-bottom,0px) + 34px)" }}>
        <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10, color: "rgba(255,255,255,0.7)" }}>parked: {parked} · simulate a cook →</span>
        <div className="flex gap-2">
          <button onClick={() => fire("left")} className="px-3 py-2 rounded-full text-[13px] font-semibold" style={{ background: "#5E6E38", color: "#fff" }}>🌱 herb grew (Left)</button>
          <button onClick={() => fire("right")} className="px-3 py-2 rounded-full text-[13px] font-semibold" style={{ background: "#C98A54", color: "#fff" }}>📸 photo added (Right)</button>
        </div>
      </div>
    </div>
  );
}
