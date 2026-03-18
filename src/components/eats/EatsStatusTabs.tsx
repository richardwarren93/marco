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
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === tab.value
              ? "bg-orange-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {tab.label}
          {counts[tab.value] > 0 && (
            <span className={`ml-1.5 ${active === tab.value ? "text-orange-200" : "text-gray-400"}`}>
              {counts[tab.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export type { TabValue };
