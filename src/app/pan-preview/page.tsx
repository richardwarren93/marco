"use client";

// DEV-ONLY preview of the continuous-pan room over the single wide master.
// Safe to delete.

import RoomPan from "@/components/kitchen/RoomPan";

export default function PanPreviewPage() {
  return (
    <div className="fixed inset-0" style={{ background: "#000" }}>
      <RoomPan image="/kitchen/room-wide.png" aspect={2159 / 728} onExpand={() => {}} />
    </div>
  );
}
