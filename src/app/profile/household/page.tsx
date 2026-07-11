"use client";

import SubPageHeader from "@/components/layout/SubPageHeader";
import HouseholdCard from "@/components/household/HouseholdCard";

export default function HouseholdPage() {
  return (
    <div className="min-h-screen" style={{ background: "#F5EEE2" }}>
      <SubPageHeader title="Household" />
      <div className="max-w-lg mx-auto px-4 pt-1" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}>
        <HouseholdCard />
      </div>
    </div>
  );
}
