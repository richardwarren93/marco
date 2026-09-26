"use client";

import GroceryList from "@/components/grocery/GroceryList";
import KitchenLayerHeader from "@/components/layout/KitchenLayerHeader";

export default function GroceryPage() {
  return (
    <>
      <KitchenLayerHeader title="Grocery" sub="everything you need · tap to check off" emoji="🛒" />
      <GroceryList />
    </>
  );
}
