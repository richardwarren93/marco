import { INK, SURFACE } from "@/lib/theme";
/* The Kitchen layer's paper: dotted cream, full height, dock clearance.
 *
 * /kitchen, /recipes, /meal-plan and /grocery each declared this background
 * inline with slightly different values, so moving between them flickered.
 * One surface, one set of numbers. */
export default function KitchenSurface({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: SURFACE,
        backgroundImage: "radial-gradient(rgba(23,20,16,0.05) 1px, transparent 1px)",
        backgroundSize: "13px 13px",
        color: INK,
        paddingBottom: 130,
      }}
    >
      {children}
    </div>
  );
}
