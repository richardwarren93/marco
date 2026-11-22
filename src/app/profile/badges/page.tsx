"use client";

import PageHeader from "@/components/layout/PageHeader";
import BadgesCard from "@/components/gamification/BadgesCard";
import { CREAM } from "@/lib/theme";

export default function BadgesPage() {
  return (
    <div className="min-h-screen" style={{ background: CREAM }}>
      <PageHeader back title="Badges" />
      <div className="max-w-lg mx-auto px-4 pt-1" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}>
        <BadgesCard />
      </div>
    </div>
  );
}
