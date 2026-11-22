// Card details must come from the public source, never a user's private edits.
export type PublicRecipeCard = {
  title: string;
  sourceUrl: string;
  prepMinutes?: number | null;
  cookMinutes?: number | null;
  imageJpeg?: Uint8Array;
};

export function recipeCardLayout(recipe: PublicRecipeCard, group: boolean) {
  const title = recipe.title.trim().slice(0, 200);
  const prep = recipe.prepMinutes;
  const cook = recipe.cookMinutes;
  const valid = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
  const time = valid(prep) && valid(cook)
    ? `${prep + cook} min total`
    : valid(cook) ? `${cook} min cooking` : valid(prep) ? `${prep} min prep` : undefined;
  const instruction = group ? "Heart the original recipe link to save it too" : "Open the original recipe";
  return {
    caption: title,
    subcaption: instruction,
    trailingCaption: time,
    trailingSubcaption: "Marco",
    summary: [title, time, instruction].filter(Boolean).join(" · "),
    ...(recipe.imageJpeg?.length ? { image: recipe.imageJpeg, imageTitle: title } : {}),
  };
}
