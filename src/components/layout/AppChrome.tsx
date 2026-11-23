"use client";

/* The dock and the first-run guide, loaded only where they actually render.
 *
 * Both are mounted by the root layout, so every route — including the
 * signed-out landing page, which shows neither — used to download both.
 * Making them `next/dynamic` was not enough on its own: a dynamic component
 * still fetches its chunk the moment it mounts, and both of these mount
 * everywhere and then return null from inside. The gate has to happen out
 * here, before the component is referenced at all.
 *
 * The two lists below mirror `HIDE_ON` in MarcoDock and `SHOW_ON` in
 * MarcoGuide. They are duplicated on purpose: importing the constants would
 * import the modules, which is the thing we are avoiding. If you change
 * either list, change it in both places. */

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const MarcoDock = dynamic(() => import("@/components/layout/MarcoDock"), { ssr: false });
const MarcoGuide = dynamic(() => import("@/components/guide/MarcoGuide"), { ssr: false });

// Full-screen / modal flows where the dock does not belong.
const DOCK_HIDDEN_ON = ["/i-cooked", "/create", "/auth", "/connect", "/onboarding", "/login", "/recipes/new", "/join"];

// The guide only ever appears on the two homes.
const GUIDE_ON = ["/kitchen", "/friends-stack"];

export default function AppChrome() {
  const pathname = usePathname() || "";
  const dock = !DOCK_HIDDEN_ON.some((p) => pathname.startsWith(p));
  const guide = GUIDE_ON.includes(pathname);

  return (
    <>
      {dock && <MarcoDock />}
      {guide && <MarcoGuide />}
    </>
  );
}
