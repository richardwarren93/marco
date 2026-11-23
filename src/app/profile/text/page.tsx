"use client";

import SubPageShell from "@/components/layout/SubPageShell";
import PhoneCard from "@/components/phone/PhoneCard";

/* Text Marco — SMS link/verify, moved out of the profile stack. */
export default function TextMarcoPage() {
  return (
    <SubPageShell title="Text Marco">
      <PhoneCard />
    </SubPageShell>
  );
}
