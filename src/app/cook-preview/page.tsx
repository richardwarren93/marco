"use client";

// DEV-ONLY preview of the guided cook screen (stove hero + recipe sheet).
// Safe to delete — not linked from anywhere.

import { GuidedCook } from "@/components/kitchen/KitchenOnboarding";

const STEPS = [
  "Finely chop 1 onion, 2 carrots and 2 cloves garlic.",
  "Warm 2 tbsp olive oil in a pan over medium heat for 2 min.",
  "Add the onion and carrot and sauté for 6 min until soft.",
  "Turn up the heat and brown 400g beef mince, breaking it up.",
  "Pour in 400g chopped tomatoes and a splash of red wine.",
  "Simmer gently for 25 min, stirring now and then.",
  "Season with salt, pepper and fresh basil, then plate over pasta.",
];

const INGREDIENTS = [
  { name: "onion", amount: "1", unit: "" },
  { name: "carrots", amount: "2", unit: "" },
  { name: "garlic", amount: "2", unit: "cloves" },
  { name: "olive oil", amount: "2", unit: "tbsp" },
  { name: "beef mince", amount: "400", unit: "g" },
  { name: "chopped tomatoes", amount: "400", unit: "g" },
] as any;

export default function CookPreviewPage() {
  return <GuidedCook title="Weeknight Bolognese" steps={STEPS} ingredients={INGREDIENTS} onDone={() => {}} />;
}
