import type { RestaurantVisit } from "@/types";

interface RestaurantStatsProps {
  visits: RestaurantVisit[];
}

export default function RestaurantStats({ visits }: RestaurantStatsProps) {
  const visitCount = visits.length;

  const avgRating =
    visits.filter((v) => v.rating).length > 0
      ? visits.filter((v) => v.rating).reduce((sum, v) => sum + (v.rating || 0), 0) /
        visits.filter((v) => v.rating).length
      : null;

  const totalSpent = visits.reduce(
    (sum, v) => sum + (v.spent_approx ? Number(v.spent_approx) : 0),
    0
  );

  // Count all dishes across visits to find favorites
  const dishCounts: Record<string, number> = {};
  visits.forEach((v) => {
    v.dishes_ordered.forEach((d) => {
      dishCounts[d] = (dishCounts[d] || 0) + 1;
    });
  });
  const topDishes = Object.entries(dishCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Stats</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">{visitCount}</p>
          <p className="text-xs text-gray-500">Total Visits</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {avgRating ? avgRating.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-gray-500">Avg Rating</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {totalSpent > 0 ? `$${totalSpent.toFixed(0)}` : "—"}
          </p>
          <p className="text-xs text-gray-500">Total Spent</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {Object.keys(dishCounts).length}
          </p>
          <p className="text-xs text-gray-500">Dishes Tried</p>
        </div>
      </div>

      {topDishes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Top Dishes
          </p>
          <div className="space-y-1">
            {topDishes.map(([dish, count]) => (
              <div key={dish} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{dish}</span>
                <span className="text-gray-400 text-xs">
                  {count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
