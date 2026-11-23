"use client";

/* The gate for the dock and the first-run guide.
 *
 * Both used to be mounted by the root layout on every route, so the
 * signed-out landing page — which shows neither — downloaded both, and with
 * them `motion` (~133 KB decoded).
 *
 * `next/dynamic` alone did not fix that: a dynamic component still fetches
 * its chunk the moment it mounts, and these two mounted everywhere and then
 * returned null from inside. So the pathname check happens here, before
 * AppChromeInner (which holds the real imports) is referenced at all.
 *
 * The two lists mirror `HIDE_ON` in MarcoDock and `SHOW_ON` in MarcoGuide.
 * They are duplicated on purpose: importing the constants would import the
 * modules, which is the thing being avoided. Change one, change both. */

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const AppChromeInner = dynamic(() => import("@/components/layout/AppChromeInner"), { ssr: false });

// Full-screen / modal flows where the dock does not belong.
const DOCK_HIDDEN_ON = ["/i-cooked", "/create", "/auth", "/connect", "/onboarding", "/login", "/recipes/new", "/join"];

// The guide only ever appears on the two homes.
const GUIDE_ON = ["/kitchen", "/friends-stack"];

export default function AppChrome() {
  const pathname = usePathname() || "";
  const dock = !DOCK_HIDDEN_ON.some((p) => pathname.startsWith(p));
  const guide = GUIDE_ON.includes(pathname);

  if (!dock && !guide) return null;
  return <AppChromeInner dock={dock} guide={guide} />;
}
