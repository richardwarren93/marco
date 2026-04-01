export interface RankingRecipe {
  id: string;
  title: string;
  image: string;
  emoji: string;
  tags: string[];
  prepTime: number;
  tasteTags: {
    flavor: string[];
    texture: string[];
    cuisine: string[];
    nutritional: string[];
    cookingStyle: string[];
    ingredients: string[];
  };
}

const RANKING_RECIPES: RankingRecipe[] = [
  {
    id: "rank-mapo-tofu",
    title: "Mapo Tofu",
    image: "/onboarding/recipes/mapo-tofu.jpg",
    emoji: "\u{1F336}\uFE0F",
    tags: ["spicy", "chinese"],
    prepTime: 30,
    tasteTags: {
      flavor: ["spicy", "umami"],
      texture: ["saucy"],
      cuisine: ["chinese"],
      nutritional: ["high_protein"],
      cookingStyle: ["one_pan"],
      ingredients: ["garlic_heavy"],
    },
  },
  {
    id: "rank-ceviche",
    title: "Ceviche",
    image: "/onboarding/recipes/ceviche.jpg",
    emoji: "\u{1F41F}",
    tags: ["fresh", "peruvian"],
    prepTime: 25,
    tasteTags: {
      flavor: ["tangy"],
      texture: ["crunchy"],
      cuisine: ["latin"],
      nutritional: ["high_protein", "low_carb"],
      cookingStyle: ["quick_meals"],
      ingredients: ["herbaceous"],
    },
  },
  {
    id: "rank-tabbouleh",
    title: "Tabbouleh",
    image: "/onboarding/recipes/tabbouleh.jpg",
    emoji: "\u{1F33F}",
    tags: ["healthy", "mediterranean"],
    prepTime: 20,
    tasteTags: {
      flavor: ["tangy"],
      texture: ["crunchy"],
      cuisine: ["mediterranean"],
      nutritional: ["low_carb"],
      cookingStyle: ["quick_meals"],
      ingredients: ["herbaceous"],
    },
  },
  {
    id: "rank-fettuccine-alfredo",
    title: "Chicken Fettuccine Alfredo",
    image: "/onboarding/recipes/fettuccine-alfredo.jpg",
    emoji: "\u{1F35D}",
    tags: ["pasta", "comfort"],
    prepTime: 30,
    tasteTags: {
      flavor: ["umami"],
      texture: ["creamy", "saucy"],
      cuisine: ["italian"],
      nutritional: ["indulgent"],
      cookingStyle: ["one_pan"],
      ingredients: ["cheese_forward", "garlic_heavy"],
    },
  },
  {
    id: "rank-chicken-waffles",
    title: "Honey Fried Chicken & Waffles",
    image: "/onboarding/recipes/chicken-waffles.jpg",
    emoji: "\u{1F357}",
    tags: ["brunch", "southern"],
    prepTime: 45,
    tasteTags: {
      flavor: ["sweet", "umami"],
      texture: ["crunchy", "crispy"],
      cuisine: ["american"],
      nutritional: ["indulgent"],
      cookingStyle: ["baked"],
      ingredients: [],
    },
  },
  {
    id: "rank-smoked-brisket",
    title: "Smoked Brisket",
    image: "/onboarding/recipes/smoked-brisket.jpg",
    emoji: "\u{1F969}",
    tags: ["bbq", "texan"],
    prepTime: 480,
    tasteTags: {
      flavor: ["smoky", "umami"],
      texture: ["chewy"],
      cuisine: ["american"],
      nutritional: ["high_protein"],
      cookingStyle: ["grilled"],
      ingredients: [],
    },
  },
];

export default RANKING_RECIPES;
