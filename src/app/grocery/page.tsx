"use client";

import GroceryList from "@/components/grocery/GroceryList";
import KitchenLayerHeader from "@/components/layout/KitchenLayerHeader";

export default function GroceryPage() {
  return (
    <>
      <KitchenLayerHeader title="Groceries" sub="Your shopping list" />
      <GroceryList />
    </>
  );
}
