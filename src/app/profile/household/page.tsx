"use client";

import PageHeader from "@/components/layout/PageHeader";
import HouseholdCard from "@/components/household/HouseholdCard";
import { CREAM } from "@/lib/theme";

export default function HouseholdPage() {
  return (
    <div className="min-h-screen" style={{ background: CREAM }}>
      <PageHeader back title="Household" />
      <div className="max-w-lg mx-auto px-4 pt-1" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}>
        <HouseholdCard />
      </div>
    </div>
  );
}
