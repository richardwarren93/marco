"use client";

/* The shell a back-navigable sub-page wears: the Kitchen layer's dotted paper,
 * the shared back header, and one container with dock clearance.
 *
 * It started as the eight /profile/* pages, which each had their own copy of
 * this — identical except for the title, and all eight setting a flat `CREAM`
 * background while the rest of the app moved to the dotted surface in October.
 * /collections now wears it too. One shell, one surface. */

import type { ReactNode } from "react";
import PageHeader from "@/components/layout/PageHeader";
import KitchenSurface from "@/components/layout/KitchenSurface";

export default function SubPageShell({
  title,
  right,
  children,
}: {
  title: string;
  /** Optional control in the header, e.g. a share button. */
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <KitchenSurface>
      <PageHeader back title={title} right={right} />
      <div className="max-w-lg mx-auto px-4 pt-1 space-y-4">{children}</div>
    </KitchenSurface>
  );
}
