"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef } from "react";
import {
  RecipesIcon,
  GroceryIcon,
  MealPlanIcon,
} from "@/components/icons/HandDrawnIcons";
import ImportRecipeSheet from "@/components/recipes/ImportRecipeSheet";

const ACCENT = "#3f7058";

const leftTabs = [
  { href: "/recipes", label: "Recipes", Icon: RecipesIcon },
  { href: "/meal-plan", label: "Meal Plan", Icon: MealPlanIcon },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [fabOpen, setFabOpen] = useState(false);
  const [importExpanded, setImportExpanded] = useState(false);
  const [showImport, setShowImport] = useState(false);

  if (pathname.startsWith("/auth") || pathname.startsWith("/onboarding")) {
    return null;
  }

  const isProfileActive = pathname.startsWith("/profile");
  const isGroceryActive = pathname.startsWith("/grocery");
  const isOnMealPlan = pathname.startsWith("/meal-plan");

  function closeFab() {
    setFabOpen(false);
    setImportExpanded(false);
  }

  function handleAddMeal() {
    closeFab();
    if (!isOnMealPlan) router.push("/meal-plan");
  }

  return (
    <>
      {/* Dim overlay */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(2px)" }}
          onClick={closeFab}
        />
      )}

      {/* Floating popup — above FAB */}
      {fabOpen && (
        <div
          className="fixed z-50 left-1/2 sm:hidden"
          style={{
            bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px) + 14px)",
            animation: "fabMenuIn 0.22s cubic-bezier(0.34,1.2,0.64,1) both",
          }}
        >
          <div
            className="flex flex-col overflow-hidden min-w-[232px] rounded-2xl"
            style={{
              background: "white",
              boxShadow: "0 8px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)",
            }}
          >
            {/* Add meal */}
            <button
              onClick={handleAddMeal}
              className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#e6f0eb" }}>
                <svg className="w-4 h-4" style={{ color: ACCENT }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Add meal</p>
                <p className="text-xs text-gray-400">Schedule a recipe</p>
              </div>
            </button>

            <div className="mx-4" style={{ height: 1, background: "#f0f0ee" }} />

            {/* Import recipe — expandable */}
            <button
              onClick={() => setImportExpanded((v) => !v)}
              className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left w-full"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f3f3f1" }}>
                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900">Import recipe</p>
                <p className="text-xs text-gray-400">Add from a source</p>
              </div>
              <svg
                className="w-4 h-4 text-gray-300 transition-transform duration-200"
                style={{ transform: importExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Inline import options */}
            {importExpanded && (
              <div className="px-3 pb-3 space-y-0.5" style={{ animation: "expandDown 0.18s ease both" }}>
                {[
                  {
                    label: "Paste link",
                    desc: "From a website URL",
                    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />,
                    action: () => { closeFab(); router.push("/recipes/new?mode=url"); },
                  },
                  {
                    label: "Photo",
                    desc: "From a screenshot or card",
                    icon: (<><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></>),
                    action: () => { closeFab(); setShowImport(true); },
                  },
                  {
                    label: "Text",
                    desc: "Paste recipe text",
                    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
                    action: () => { closeFab(); router.push("/recipes/new?mode=text"); },
                  },
                ].map(({ label, desc, icon, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#f3f3f1" }}>
                      <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {icon}
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{label}</p>
                      <p className="text-[11px] text-gray-400">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white border-t border-gray-100 touch-manipulation"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", willChange: "transform" }}
      >
        <div className="flex justify-around items-end h-16 px-1">
          {leftTabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 pb-2 pt-1 transition-colors"
                style={{ color: isActive ? ACCENT : "#b0b0b0" }}
              >
                <tab.Icon className="w-6 h-6" filled={isActive} />
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              </Link>
            );
          })}

          {/* Center FAB — raised */}
          <div className="flex flex-col items-center justify-end flex-1 pb-2">
            <button
              onClick={() => setFabOpen((v) => !v)}
              className="-translate-y-5 ring-4 ring-white active:scale-90 transition-all duration-150 touch-manipulation"
              aria-label={fabOpen ? "Close menu" : "Add or import"}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: fabOpen ? ACCENT : "#1a1a1a",
                boxShadow: fabOpen ? `0 4px 20px rgba(63,112,88,0.4)` : "0 4px 20px rgba(0,0,0,0.28)",
                transition: "background 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              <span
                className="flex items-center justify-center w-full h-full"
                style={{
                  transition: "transform 0.22s ease",
                  transform: fabOpen ? "rotate(45deg)" : "rotate(0deg)",
                }}
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </span>
            </button>
          </div>

          {/* Grocery */}
          <Link
            href="/grocery"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 pb-2 pt-1 transition-colors"
            style={{ color: isGroceryActive ? ACCENT : "#b0b0b0" }}
          >
            <GroceryIcon className="w-6 h-6" filled={isGroceryActive} />
            <span className="text-[10px] font-medium leading-tight">Grocery</span>
          </Link>

          {/* Profile */}
          <Link
            href="/profile"
            className="flex flex-col items-center justify-center gap-0.5 flex-1 pb-2 pt-1 transition-colors"
            style={{ color: isProfileActive ? ACCENT : "#b0b0b0" }}
          >
            <svg
              className="w-6 h-6"
              fill={isProfileActive ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="text-[10px] font-medium leading-tight">Profile</span>
          </Link>
        </div>
      </nav>

      <ImportRecipeSheet isOpen={showImport} onClose={() => setShowImport(false)} />
    </>
  );
}
