"use client";

import SubPageHeader from "@/components/layout/SubPageHeader";
import BadgesCard from "@/components/gamification/BadgesCard";

export default function BadgesPage() {
  return (
    <div className="min-h-screen" style={{ background: "#F5EEE2" }}>
      <SubPageHeader title="Badges" />
      <div className="max-w-lg mx-auto px-4 pt-1" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}>
        <BadgesCard />
      </div>
    </div>
  );
}
