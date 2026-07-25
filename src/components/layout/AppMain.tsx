"use client";

import { usePathname } from "next/navigation";

/* The app's scroll container.
 *
 * It normally reserves space for the fixed BottomTabBar, but the full-screen
 * flows (auth, onboarding, the standalone cookbook pages) hide that bar and
 * render their own 100dvh shells. Keeping the padding there made every one of
 * those screens exactly 80px taller than the viewport: the whole page scrolled
 * and iOS revealed a band of canvas under the content — the opposite of feeling
 * native. Drop the padding wherever the tab bar isn't shown. */
const FULL_SCREEN_PREFIXES = ["/auth", "/onboarding", "/cookbook-pilot", "/cooking-is-family"];

export default function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullScreen = FULL_SCREEN_PREFIXES.some((p) => pathname.startsWith(p));

  return (
    <main
      className={`flex-1 overflow-y-auto overscroll-none ${
        fullScreen ? "" : "pb-[calc(5rem+var(--safe-bottom,0px))] sm:pb-0"
      }`}
    >
      {children}
    </main>
  );
}
