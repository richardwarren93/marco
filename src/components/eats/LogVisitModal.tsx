"use client";

import { useState } from "react";

interface LogVisitModalProps {
  restaurantId: string;
  restaurantName: string;
  onClose: () => void;
  onSaved: () => void;
  existingDishes?: string[];
}

export default function LogVisitModal({
  restaurantId,
  restaurantName,
  onClose,
  onSaved,
  existingDishes = [],
}: LogVisitModalProps) {
  const [visitedAt, setVisitedAt] = useState(new Date().toISOString().split("T")[0]);
  const [rating, setRating] = useState<number | null>(null);
  const [dishInput, setDishInput] = useState("");
  const [dishes, setDishes] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [companions, setCompanions] = useState("");
  const [occasion, setOccasion] = useState("");
  const [spentApprox, setSpentApprox] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hoverRating, setHoverRating] = useState(0);

  // Dish suggestions from previous visits
  const dishSuggestions = existingDishes.filter(
    (d) =>
      dishInput.trim() &&
      d.toLowerCase().includes(dishInput.toLowerCase()) &&
      !dishes.includes(d)
  );

  function addDish(dish?: string) {
    const d = (dish || dishInput).trim();
    if (d && !dishes.includes(d)) {
      setDishes([...dishes, d]);
    }
    setDishInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visited_at: visitedAt,
          rating,
          dishes_ordered: dishes,
          notes: notes.trim() || null,
          companions: companions.trim() || null,
          occasion: occasion.trim() || null,
          spent_approx: spentApprox ? parseFloat(spentApprox) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to log visit");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log visit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Log Visit</h2>
              <p className="text-sm text-gray-500 mt-0.5">{restaurantName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              &times;
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={visitedAt}
                onChange={(e) => setVisitedAt(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(rating === star ? null : star)}
                    className="p-0.5"
                  >
                    <svg
                      className={`w-7 h-7 ${
                        star <= (hoverRating || rating || 0)
                          ? "text-amber-400"
                          : "text-gray-200"
                      } transition-colors`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
                {rating && (
                  <span className="text-sm text-gray-400 ml-2 self-center">{rating}/5</span>
                )}
              </div>
            </div>

            {/* Dishes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dishes Ordered
              </label>
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={dishInput}
                    onChange={(e) => setDishInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addDish();
                      }
                    }}
                    placeholder="Margherita pizza, tiramisu..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => addDish()}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Add
                  </button>
                </div>
                {/* Autocomplete suggestions */}
                {dishSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-12 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                    {dishSuggestions.slice(0, 5).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => addDish(d)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-orange-50 text-gray-700"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {dishes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {dishes.map((dish) => (
                    <span
                      key={dish}
                      className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                    >
                      {dish}
                      <button
                        type="button"
                        onClick={() => setDishes(dishes.filter((d) => d !== dish))}
                        className="text-orange-400 hover:text-orange-600"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Companions + Occasion */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">With</label>
                <input
                  type="text"
                  value={companions}
                  onChange={(e) => setCompanions(e.target.value)}
                  placeholder="Friends, family..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Occasion</label>
                <input
                  type="text"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="Birthday, date night..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Spend */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Approximate Spend ($)
              </label>
              <input
                type="number"
                value={spentApprox}
                onChange={(e) => setSpentApprox(e.target.value)}
                placeholder="75"
                min="0"
                step="0.01"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="How was it? What stood out?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Log Visit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
