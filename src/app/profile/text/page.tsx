"use client";

import SubPageHeader from "@/components/layout/SubPageHeader";
import PhoneCard from "@/components/phone/PhoneCard";

/* Text Marco — SMS link/verify, moved out of the profile stack. */
export default function TextMarcoPage() {
  return (
    <div className="min-h-screen" style={{ background: "#F5EEE2" }}>
      <SubPageHeader title="Text Marco" />
      <div className="max-w-lg mx-auto px-4 pt-1" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}>
        <PhoneCard />
      </div>
    </div>
  );
}
