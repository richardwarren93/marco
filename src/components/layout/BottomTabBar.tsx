"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RecipesIcon,
  CollectionsIcon,
  PantryIcon,
  EatsIcon,
  MealPlanIcon,
} from "@/components/icons/HandDrawnIcons";

const tabs = [
  { href: "/recipes", label: "Recipes", Icon: RecipesIcon },
  { href: "/collections", label: "Collections", Icon: CollectionsIcon },
  { href: "/pantry", label: "Pantry", Icon: PantryIcon },
  { href: "/eats", label: "Eats", Icon: EatsIcon },
  { href: "/meal-plan", label: "Meal Plan", Icon: MealPlanIcon },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white/90 backdrop-blur-lg border-t border-gray-200" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex justify-around items-center h-16 px-2">
        {tabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors ${
                isActive ? "text-orange-600" : "text-gray-400"
              }`}
            >
              <tab.Icon className="w-6 h-6" filled={isActive} />
              <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
