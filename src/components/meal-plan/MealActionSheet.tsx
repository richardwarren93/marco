"use client";

export default function MealActionSheet({
  isOpen,
  mealTitle,
  mealType,
  onClose,
  onViewRecipe,
  onEditMeal,
  onDeleteMeal,
}: {
  isOpen: boolean;
  mealTitle: string;
  mealType: string;
  onClose: () => void;
  onViewRecipe: () => void;
  onEditMeal: () => void;
  onDeleteMeal: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-3xl shadow-xl pb-8 sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-3">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Meal info */}
        <div className="px-6 pb-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider capitalize mb-0.5">
            {mealType}
          </p>
          <p className="text-base font-bold text-gray-900 line-clamp-2">{mealTitle}</p>
        </div>

        {/* Actions */}
        <div className="px-4 pt-3 space-y-2">
          <button
            onClick={onViewRecipe}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 rounded-2xl text-left hover:bg-gray-100 active:scale-[0.98] transition-all"
          >
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-800">View recipe</span>
          </button>

          <button
            onClick={onEditMeal}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 rounded-2xl text-left hover:bg-gray-100 active:scale-[0.98] transition-all"
          >
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-800">Edit meal</span>
          </button>

          <button
            onClick={onDeleteMeal}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-red-50 rounded-2xl text-left hover:bg-red-100 active:scale-[0.98] transition-all"
          >
            <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-red-600">Remove from plan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
