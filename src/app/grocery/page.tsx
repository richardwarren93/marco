"use client";

import GroceryList from "@/components/grocery/GroceryList";
import PageHeader from "@/components/layout/PageHeader";
import KitchenSurface from "@/components/layout/KitchenSurface";
import KitchenTabs from "@/components/layout/KitchenTabs";

export default function GroceryPage() {
  return (
    <KitchenSurface>
      <PageHeader title="Groceries" subtitle="what to grab" avatar />
      <div className="px-4"><KitchenTabs /></div>
      <GroceryList />
    </KitchenSurface>
  );
}
