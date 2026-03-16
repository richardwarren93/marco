import type { RestaurantVisit } from "@/types";

interface VisitTimelineProps {
  visits: RestaurantVisit[];
  onDeleteVisit?: (visitId: string) => void;
}

export default function VisitTimeline({ visits, onDeleteVisit }: VisitTimelineProps) {
  if (visits.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>No visits logged yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />

      <div className="space-y-6">
        {visits.map((visit, i) => (
          <div key={visit.id} className="relative flex gap-4">
            {/* Dot */}
            <div className="relative z-10 flex-shrink-0 w-8 flex justify-center">
              <div
                className={`w-3 h-3 rounded-full mt-1.5 ${
                  i === 0 ? "bg-orange-500" : "bg-gray-300"
                }`}
              />
            </div>

            {/* Card */}
            <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(visit.visited_at).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    {visit.rating && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-3.5 h-3.5 ${
                              star <= visit.rating! ? "text-amber-400" : "text-gray-200"
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    )}
                    {visit.spent_approx && (
                      <span className="text-xs text-gray-400">
                        ${Number(visit.spent_approx).toFixed(0)}
                      </span>
                    )}
                    {visit.companions && (
                      <span className="text-xs text-gray-400">with {visit.companions}</span>
                    )}
                  </div>
                </div>
                {onDeleteVisit && (
                  <button
                    onClick={() => onDeleteVisit(visit.id)}
                    className="text-gray-300 hover:text-red-500 text-xs"
                  >
                    Delete
                  </button>
                )}
              </div>

              {visit.occasion && (
                <p className="text-xs text-orange-600 mt-2 font-medium">{visit.occasion}</p>
              )}

              {visit.dishes_ordered.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {visit.dishes_ordered.map((dish) => (
                    <span
                      key={dish}
                      className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full"
                    >
                      {dish}
                    </span>
                  ))}
                </div>
              )}

              {visit.notes && (
                <p className="text-sm text-gray-600 mt-2">{visit.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
