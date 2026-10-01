import { Suspense } from "react";
import RecipeSaving from "./recipe-saving";

export const metadata = { title: "Recipe-saving permission · Marco" };
export default function Page() {
  return <main className="mx-auto max-w-lg px-6 py-12">
    <h1 className="font-serif text-4xl mb-5">Save recipes from ChatGPT</h1>
    <p className="mb-5">Allow Marco for ChatGPT to create recipes in your account when you request a save or press Save to Marco. This is free. You can turn it off here at any time; recipes already saved remain in Marco.</p>
    <p className="mb-6">This permission does not allow editing or deleting existing recipes, changing your meal plan, or buying groceries. Recipe content you choose to save is sent from ChatGPT to Marco.</p>
    <Suspense fallback={<p role="status">Loading…</p>}><RecipeSaving /></Suspense>
    <p className="mt-8 text-sm"><a href="/privacy" className="underline">Privacy policy</a> · <a href="/support" className="underline">Support</a></p>
  </main>;
}
