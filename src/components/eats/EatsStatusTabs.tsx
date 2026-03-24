import type { RestaurantStatus } from "@/types";

type TabValue = "all" | RestaurantStatus;

const tabs: { value: TabValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "wishlist", label: "Wishlist" },
  { value: "visited", label: "Been There" },
  { value: "favorite", label: "Favorites" },
  { value: "avoid", label: "Avoid" },
];

interface EatsStatusTabsProps {
  active: TabValue;
  onChange: (tab: TabValue) => void;
  counts: Record<TabValue, number>;
}

export default function EatsStatusTabs({ active, onChange, counts }: EatsStatusTabsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className="px-4 py-1.5 rounded-2xl text-sm font-semibold transition-all active:scale-95"
          style={active === tab.value
            ? { background: "#1a1410", color: "white" }
            : { background: "white", color: "#a09890", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
        >
          {tab.label}
          {counts[tab.value] > 0 && (
            <span className="ml-1.5" style={{ color: active === tab.value ? "rgba(255,255,255,0.6)" : "#c4b8af" }}>
              {counts[tab.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export type { TabValue };
