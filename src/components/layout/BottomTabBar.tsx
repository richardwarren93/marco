"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  RecipesIcon,
  GroceryIcon,
  MealPlanIcon,
  SearchIcon,
} from "@/components/icons/HandDrawnIcons";

const ACCENT = "#E5462E";

// All five tabs route through /recipes?tab=* so switching between them is a
// SPA tab change, not a fresh route navigation. iOS Safari's bottom toolbar
// re-appears on every full route change — keeping everything on one route
// preserves the user's scroll/chrome state across tab taps.
const leftTabs = [
  { href: "/recipes", label: "Recipes", Icon: RecipesIcon },
  { href: "/recipes?tab=meal-plan", label: "Meal Plan", Icon: MealPlanIcon },
];

export default function BottomTabBar() {
  return (
    <Suspense>
      <BottomTabBarInner />
    </Suspense>
  );
}

function BottomTabBarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fabOpen, setFabOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Listen for programmatic trigger to open the FAB import menu
  useEffect(() => {
    function handleOpenFabImport() {
      setFabOpen(true);
    }
    window.addEventListener("openFabImport", handleOpenFabImport);
    return () => window.removeEventListener("openFabImport", handleOpenFabImport);
  }, []);

  // Defensively clear the photo-uploading overlay whenever the route changes.
  // The upload finally-block already does this, but if the user backgrounds
  // the app or hits an iOS bfcache edge case mid-upload, the overlay can
  // become orphaned. Route changes are a reliable "this flow is done" signal.
  useEffect(() => {
    setPhotoUploading(false);
    setFabOpen(false);
  }, [pathname]);

  if (pathname.startsWith("/auth") || pathname.startsWith("/onboarding") || pathname.startsWith("/cookbook-pilot") || pathname.startsWith("/cooking-is-family")) {
    return null;
  }

  // Hide on individual recipe detail pages (they have their own sticky bar)
  if (/^\/recipes\/[^/]+$/.test(pathname)) {
    return null;
  }

  const tab = searchParams.get("tab");
  const onRecipesRoute = pathname === "/recipes" || pathname.startsWith("/recipes/");
  const isGroceryActive = pathname.startsWith("/grocery") || (onRecipesRoute && tab === "grocery");
  const isOnMealPlan = pathname.startsWith("/meal-plan") || (onRecipesRoute && tab === "meal-plan");
  const isDiscoverActive = onRecipesRoute && tab === "discover";

  function closeFab() {
    setFabOpen(false);
  }

  function handleImportLink() {
    closeFab();
    router.push("/recipes/new?mode=url");
  }

  function handleImportPhoto() {
    closeFab();
    // Slight delay so FAB animation closes before native picker opens
    setTimeout(() => photoInputRef.current?.click(), 120);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/recipes/extract-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      try { sessionStorage.setItem("importedRecipe", JSON.stringify(data.recipe)); } catch {}
      router.push("/recipes/new?mode=extracted");
    } catch {
      // If extraction fails, just go to the new recipe form blank
      router.push("/recipes/new");
    } finally {
      setPhotoUploading(false);
    }
  }

  function handleImportText() {
    closeFab();
    router.push("/recipes/new?mode=text");
  }

  return (
    <>
      {/* Dim overlay */}
      {fabOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.15)", backdropFilter: "blur(1px)" }}
          onClick={closeFab}
        />
      )}

      {/* Floating popup */}
      {fabOpen && (
        <div
          className="fixed z-50 left-1/2 sm:hidden"
          style={{
            bottom: "calc(4.5rem + var(--safe-bottom, 0px) + 14px)",
            animation: "fabMenuIn 0.22s cubic-bezier(0.34,1.2,0.64,1) both",
          }}
        >
          {/* Import options — the plus opens straight to Paste link / Photo / Text */}
          <div
            style={{
              width: 224,
              overflow: "hidden",
              borderRadius: 18,
              background: "white",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            {/* Paste link */}
            <button
              onClick={handleImportLink}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left w-full"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f3f3f1" }}>
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">Paste link</p>
            </button>

            <div className="mx-4" style={{ height: 1, background: "#f0f0ee" }} />

            {/* Photo */}
            <button
              onClick={handleImportPhoto}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left w-full"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f3f3f1" }}>
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">Photo</p>
            </button>

            <div className="mx-4" style={{ height: 1, background: "#f0f0ee" }} />

            {/* Text */}
            <button
              onClick={handleImportText}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left w-full"
            >
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#f3f3f1" }}>
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">Text</p>
            </button>
          </div>
        </div>
      )}

      {/* Tab bar — a standard flush bottom bar: full-width, docked to the very
          bottom edge with the frosted background filling down through the
          home-indicator area (var(--safe-bottom) is the env() inset; it
          resolves to 0px in Safari). A top hairline replaces the old floating
          pill shadow. */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden touch-manipulation"
        style={{
          // Trim the home-indicator inset so the icons sit lower / closer to
          // the bottom edge, while keeping a little clearance above the
          // indicator. Floors at 4px so non-notch devices still breathe.
          paddingBottom: "max(4px, calc(var(--safe-bottom, 0px) - 16px))",
          background: "rgba(255,253,247,0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "0.5px solid rgba(28,26,23,0.08)",
          boxShadow: "0 -2px 16px rgba(0,0,0,0.05)",
          willChange: "transform",
        }}
      >
        <div
          className="flex justify-around items-center h-[50px] px-2 mx-auto max-w-md relative"
        >
          {leftTabs.map((leftTab) => {
            // "Recipes" is the default tab — active when on /recipes with no
            // ?tab override (and explicitly not when meal-plan / grocery /
            // discover tabs are showing).
            const isActive = leftTab.href === "/recipes"
              ? onRecipesRoute && !isDiscoverActive && !isOnMealPlan && !isGroceryActive
              : isOnMealPlan;
            return (
              <Link
                key={leftTab.href}
                href={leftTab.href}
                className="relative flex items-center justify-center flex-1 transition-colors"
                aria-label={leftTab.label}
                style={{ color: isActive ? "#fff" : "var(--ink-soft, #4A4742)" }}
              >
                {/* Active gets a tomato fill circle around the icon — Marco
                    design spec: "Active item gets a tomato fill circle." */}
                <span
                  className="flex items-center justify-center transition-all"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: isActive ? "var(--mustard, #E8A33D)" : "transparent",
                  }}
                >
                  <leftTab.Icon className="w-[26px] h-[26px]" filled={isActive} />
                </span>
              </Link>
            );
          })}

          {/* Center FAB — raised to full nav height */}
          <div className="flex flex-col items-center justify-center flex-1">
            <button
              onClick={() => setFabOpen((v) => !v)}
              className="-translate-y-4 active:scale-90 transition-all duration-150 touch-manipulation"
              aria-label={fabOpen ? "Close menu" : "Add or import"}
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background: ACCENT,
                boxShadow: fabOpen
                  ? `0 3px 12px rgba(229,70,46,0.32)`
                  : `0 2px 8px rgba(229,70,46,0.22)`,
                transition: "box-shadow 0.2s ease",
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

          {/* Grocery — same /recipes?tab=* SPA pattern as the others */}
          <Link
            href="/recipes?tab=grocery"
            className="relative flex items-center justify-center flex-1 transition-colors"
            aria-label="Grocery"
            style={{ color: isGroceryActive ? "#fff" : "var(--ink-soft, #4A4742)" }}
          >
            <span
              className="flex items-center justify-center transition-all"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: isGroceryActive ? "var(--mustard, #E8A33D)" : "transparent",
              }}
            >
              <GroceryIcon className="w-[26px] h-[26px]" filled={isGroceryActive} />
            </span>
          </Link>

          {/* Discover */}
          <Link
            href="/recipes?tab=discover"
            className="relative flex items-center justify-center flex-1 transition-colors"
            aria-label="Discover"
            style={{ color: isDiscoverActive ? "#fff" : "var(--ink-soft, #4A4742)" }}
          >
            <span
              className="flex items-center justify-center transition-all"
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: isDiscoverActive ? "var(--mustard, #E8A33D)" : "transparent",
              }}
            >
              <SearchIcon className="w-[26px] h-[26px]" />
            </span>
          </Link>
        </div>
      </nav>

      {/* Hidden photo file input */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoChange}
      />

      {/* Full-screen uploading indicator */}
      {photoUploading && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="w-10 h-10 border-2 border-[#E5462E] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-600">Extracting recipe…</p>
        </div>
      )}
    </>
  );
}
