"use client";

/* The dock and the guide, plus the MotionConfig they need.
 *
 * Loaded as one dynamic chunk by AppChrome, only on routes that actually
 * render this chrome. Keeping `MotionConfig` here rather than in Providers is
 * what lets `motion` stay out of the root bundle: Providers is mounted on
 * every route, this is not. */

import { MotionConfig } from "motion/react";
import MarcoDock from "@/components/layout/MarcoDock";
import MarcoGuide from "@/components/guide/MarcoGuide";

export default function AppChromeInner({ dock, guide }: { dock: boolean; guide: boolean }) {
  return (
    <MotionConfig reducedMotion="user">
      {dock && <MarcoDock />}
      {guide && <MarcoGuide />}
    </MotionConfig>
  );
}
