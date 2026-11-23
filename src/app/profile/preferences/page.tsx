"use client";

import SubPageShell from "@/components/layout/SubPageShell";
import DietaryFiltersCard from "@/components/dietary/DietaryFiltersCard";
import AllergiesCard from "@/components/dietary/AllergiesCard";

/* Food preferences — dietary filters + allergies, merged onto one settings page. */
export default function FoodPreferencesPage() {
  return (
    <SubPageShell title="Food preferences">
      <DietaryFiltersCard />
      <AllergiesCard />
    </SubPageShell>
  );
}
