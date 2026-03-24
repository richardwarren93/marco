import Link from "next/link";
import type { Restaurant, RestaurantStatus } from "@/types";
import { LocationIcon } from "@/components/icons/HandDrawnIcons";

const statusLabels: Record<RestaurantStatus, { text: string; bg: string }> = {
  favorite: { text: "Favorite", bg: "bg-orange-100 text-orange-700" },
  wishlist: { text: "Wishlist", bg: "bg-blue-100 text-blue-700" },
  visited: { text: "Been There", bg: "bg-gray-100 text-gray-600" },
  avoid: { text: "Avoid", bg: "bg-red-100 text-red-600" },
};

const statusAccent: Record<RestaurantStatus, string> = {
  favorite: "from-orange-500/10 to-transparent",
  wishlist: "from-blue-500/10 to-transparent",
  visited: "from-gray-500/5 to-transparent",
  avoid: "from-red-500/10 to-transparent",
};

const cuisineColors = [
  "bg-emerald-50 text-emerald-700",
  "bg-purple-50 text-purple-700",
  "bg-sky-50 text-sky-700",
  "bg-rose-50 text-rose-700",
  "bg-amber-50 text-amber-700",
  "bg-teal-50 text-teal-700",
  "bg-indigo-50 text-indigo-700",
  "bg-lime-50 text-lime-700",
];

function getCuisineColor(cuisine: string): string {
  let hash = 0;
  for (let i = 0; i < cuisine.length; i++) {
    hash = cuisine.charCodeAt(i) + ((hash << 5) - hash);
  }
  return cuisineColors[Math.abs(hash) % cuisineColors.length];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3.5 h-3.5 ${star <= rating ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  onToggleGoBack?: (id: string, value: boolean) => void;
  index?: number;
}

export default function RestaurantCard({ restaurant, onToggleGoBack, index = 0 }: RestaurantCardProps) {
  const status = statusLabels[restaurant.status];

  return (
    <Link href={`/eats/${restaurant.id}`}>
      <div
        className="bg-white rounded-3xl cursor-pointer relative overflow-hidden active:scale-[0.98] transition-transform duration-150"
        style={{
          boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
          animation: `cardPop 0.4s cubic-bezier(0.34,1.2,0.64,1) ${index * 50}ms both`,
          padding: "18px 20px",
        }}
      >
        {/* Subtle gradient accent */}
        <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${statusAccent[restaurant.status]}`} />

        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold leading-tight" style={{ color: "#1a1410" }}>
            {restaurant.name}
          </h3>
          <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${status.bg}`}>
            {status.text}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2.5 flex-wrap">
          {restaurant.cuisine && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getCuisineColor(restaurant.cuisine)}`}>
              {restaurant.cuisine}
            </span>
          )}
          {restaurant.price_range && (
            <span className="text-gray-900 font-semibold text-xs">
              {"$".repeat(restaurant.price_range)}
              <span className="text-gray-200">{"$".repeat(4 - restaurant.price_range)}</span>
            </span>
          )}
          {restaurant.overall_rating && <StarRating rating={restaurant.overall_rating} />}
        </div>

        {restaurant.neighborhood && (
          <p className="text-gray-400 text-sm mt-2 flex items-center gap-1"><LocationIcon className="w-3.5 h-3.5 inline-block" /> {restaurant.neighborhood}{restaurant.city ? `, ${restaurant.city}` : ""}</p>
        )}

        {restaurant.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {restaurant.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="bg-gray-50 text-gray-500 text-[10px] px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
            {restaurant.tags.length > 4 && (
              <span className="text-gray-300 text-[10px]">+{restaurant.tags.length - 4}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: "#f0ebe4" }}>
          <div className="flex items-center gap-3 text-[11px] text-gray-400">
            {restaurant.visit_count !== undefined && restaurant.visit_count > 0 && (
              <span>{restaurant.visit_count} visit{restaurant.visit_count !== 1 ? "s" : ""}</span>
            )}
            {restaurant.last_visited && (
              <span>Last: {new Date(restaurant.last_visited).toLocaleDateString()}</span>
            )}
          </div>
          {restaurant.would_go_back !== null && restaurant.would_go_back !== undefined && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleGoBack?.(restaurant.id, !restaurant.would_go_back);
              }}
              className={`text-lg ${restaurant.would_go_back ? "text-green-500" : "text-red-400"}`}
            >
              {restaurant.would_go_back ? "\u{1F44D}" : "\u{1F44E}"}
            </button>
          )}
        </div>
      </div>
    </Link>
  );
}
