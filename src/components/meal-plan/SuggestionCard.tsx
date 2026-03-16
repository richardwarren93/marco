import type { Recipe } from "@/types";

interface SuggestionCardProps {
  recipe: Recipe;
  matchingIngredients: string[];
  missingIngredients: string[];
  substitutions: { original: string; substitute: string }[];
  reasoning: string;
  onAddToPlan: (recipeId: string) => void;
}

export default function SuggestionCard({
  recipe,
  matchingIngredients,
  missingIngredients,
  substitutions,
  reasoning,
  onAddToPlan,
}: SuggestionCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-lg text-gray-900">{recipe.title}</h3>
      <p className="text-gray-500 text-sm mt-1">{reasoning}</p>

      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
            You have
          </h4>
          <div className="flex flex-wrap gap-1">
            {matchingIngredients.map((ing) => (
              <span
                key={ing}
                className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full"
              >
                {ing}
              </span>
            ))}
            {matchingIngredients.length === 0 && (
              <span className="text-gray-400 text-xs">None matched</span>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
            You need
          </h4>
          <div className="flex flex-wrap gap-1">
            {missingIngredients.map((ing) => (
              <span
                key={ing}
                className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full"
              >
                {ing}
              </span>
            ))}
            {missingIngredients.length === 0 && (
              <span className="text-green-600 text-xs">You have everything!</span>
            )}
          </div>
        </div>
      </div>

      {substitutions.length > 0 && (
        <div className="mt-3">
          <h4 className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
            Substitutions
          </h4>
          <ul className="text-sm text-gray-600">
            {substitutions.map((s, i) => (
              <li key={i}>
                Use <strong>{s.substitute}</strong> instead of {s.original}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => onAddToPlan(recipe.id)}
        className="mt-4 w-full py-2 px-4 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700"
      >
        Add to Meal Plan
      </button>
    </div>
  );
}
