import RecipeForm from "@/components/recipes/RecipeForm";

export default function NewRecipePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Save a Recipe</h1>
      <RecipeForm />
    </div>
  );
}
