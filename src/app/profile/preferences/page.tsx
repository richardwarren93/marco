"use client";

import PageHeader from "@/components/layout/PageHeader";
import DietaryFiltersCard from "@/components/dietary/DietaryFiltersCard";
import AllergiesCard from "@/components/dietary/AllergiesCard";
import { CREAM } from "@/lib/theme";

/* Food preferences — dietary filters + allergies, merged onto one settings page. */
export default function FoodPreferencesPage() {
  return (
    <div className="min-h-screen" style={{ background: CREAM }}>
      <PageHeader back title="Food preferences" />
      <div className="max-w-lg mx-auto px-4 pt-1 space-y-4" style={{ paddingBottom: "calc(var(--safe-bottom, 0px) + 7rem)" }}>
        <DietaryFiltersCard />
        <AllergiesCard />
      </div>
    </div>
  );
}
