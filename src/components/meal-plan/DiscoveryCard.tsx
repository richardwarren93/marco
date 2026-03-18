import type { DiscoveredRecipe } from "@/lib/claude";

interface DiscoveryCardProps {
  recipe: DiscoveredRecipe;
  onSave: (recipe: DiscoveredRecipe) => void;
  saving: boolean;
  saved: boolean;
}

export default function DiscoveryCard({
  recipe,
  onSave,
  saving,
  saved,
}: DiscoveryCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">{recipe.title}</h3>
          <p className="text-gray-500 text-sm mt-1">{recipe.description}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
        {recipe.prep_time_minutes && <span>Prep: {recipe.prep_time_minutes}m</span>}
        {recipe.cook_time_minutes && <span>Cook: {recipe.cook_time_minutes}m</span>}
        {recipe.servings && <span>Serves {recipe.servings}</span>}
      </div>

      {recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-600 mt-3 italic">{recipe.reasoning}</p>

      <div className="mt-4 grid sm:grid-cols-2 gap-4">
        <div>
          <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
            From your pantry
          </h4>
          <div className="flex flex-wrap gap-1">
            {recipe.matchingPantryItems.map((item) => (
              <span
                key={item}
                className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full"
              >
                {item}
              </span>
            ))}
            {recipe.matchingPantryItems.length === 0 && (
              <span className="text-gray-400 text-xs">None matched</span>
            )}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
            Need to buy
          </h4>
          <div className="flex flex-wrap gap-1">
            {recipe.missingIngredients.map((item) => (
              <span
                key={item}
                className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full"
              >
                {item}
              </span>
            ))}
            {recipe.missingIngredients.length === 0 && (
              <span className="text-green-600 text-xs">You have everything!</span>
            )}
          </div>
        </div>
      </div>

      <details className="mt-4">
        <summary className="text-sm text-orange-600 cursor-pointer hover:text-orange-700 font-medium">
          View full recipe
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Ingredients</h4>
            <ul className="text-sm text-gray-600 space-y-0.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-baseline gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-1.5" />
                  <span>
                    {ing.amount && <strong>{ing.amount} </strong>}
                    {ing.unit && <span>{ing.unit} </span>}
                    {ing.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-1">Steps</h4>
            <ol className="text-sm text-gray-600 space-y-1">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-orange-600 font-bold flex-shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </details>

      <button
        onClick={() => onSave(recipe)}
        disabled={saving || saved}
        className={`mt-4 w-full py-2 px-4 rounded-lg text-sm font-medium ${
          saved
            ? "bg-green-100 text-green-700"
            : "bg-orange-600 text-white hover:bg-orange-700"
        } disabled:opacity-50`}
      >
        {saving ? "Saving..." : saved ? "Saved to My Recipes!" : "Save to My Recipes"}
      </button>
    </div>
  );
}
