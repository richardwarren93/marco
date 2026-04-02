export interface RankingRecipe {
  id: string;
  title: string;
  image: string;
  emoji: string;
  tags: string[];
  prepTime: number;
  cuisine: string;
  flavorWeights: {
    sweet: number;
    savory: number;
    richness: number;
    tangy: number;
  };
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
  // ── Asian ──
  {
    id: "rank-mapo-tofu",
    title: "Mapo Tofu",
    image: "/onboarding/recipes/mapo-tofu.jpg",
    emoji: "\u{1F336}\uFE0F",
    tags: ["spicy", "chinese"],
    prepTime: 30,
    cuisine: "asian",
    flavorWeights: { sweet: 0.1, savory: 0.9, richness: 0.3, tangy: 0.2 },
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
    id: "rank-teriyaki-salmon",
    title: "Teriyaki Salmon",
    image: "/onboarding/recipes/salmon terriyaki.jpg",
    emoji: "\u{1F363}",
    tags: ["seafood", "japanese"],
    prepTime: 25,
    cuisine: "asian",
    flavorWeights: { sweet: 0.6, savory: 0.8, richness: 0.3, tangy: 0.3 },
    tasteTags: {
      flavor: ["sweet", "umami"],
      texture: ["saucy"],
      cuisine: ["japanese"],
      nutritional: ["high_protein"],
      cookingStyle: ["quick_meals"],
      ingredients: [],
    },
  },

  // ── Latin ──
  {
    id: "rank-ceviche",
    title: "Ceviche",
    image: "/onboarding/recipes/ceviche.jpg",
    emoji: "\u{1F41F}",
    tags: ["fresh", "peruvian"],
    prepTime: 25,
    cuisine: "latin",
    flavorWeights: { sweet: 0.1, savory: 0.3, richness: 0.1, tangy: 0.9 },
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
    id: "rank-churros",
    title: "Churros w/ Chocolate",
    image: "/onboarding/recipes/churros.webp",
    emoji: "\u{1F36B}",
    tags: ["dessert", "sweet"],
    prepTime: 35,
    cuisine: "latin",
    flavorWeights: { sweet: 0.9, savory: 0.1, richness: 0.7, tangy: 0.1 },
    tasteTags: {
      flavor: ["sweet"],
      texture: ["crunchy", "crispy"],
      cuisine: ["latin"],
      nutritional: ["indulgent"],
      cookingStyle: ["baked"],
      ingredients: [],
    },
  },

  // ── Mediterranean ──
  {
    id: "rank-tabbouleh",
    title: "Tabbouleh",
    image: "/onboarding/recipes/tabbouleh.jpg",
    emoji: "\u{1F33F}",
    tags: ["healthy", "mediterranean"],
    prepTime: 20,
    cuisine: "mediterranean",
    flavorWeights: { sweet: 0.1, savory: 0.2, richness: 0.1, tangy: 0.7 },
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
    id: "rank-shawarma",
    title: "Shawarma",
    image: "/onboarding/recipes/Chicken-Shawarma-8.jpg",
    emoji: "\u{1F959}",
    tags: ["grilled", "mediterranean"],
    prepTime: 40,
    cuisine: "mediterranean",
    flavorWeights: { sweet: 0.2, savory: 0.9, richness: 0.6, tangy: 0.4 },
    tasteTags: {
      flavor: ["umami", "smoky"],
      texture: ["chewy"],
      cuisine: ["mediterranean"],
      nutritional: ["high_protein"],
      cookingStyle: ["grilled"],
      ingredients: ["garlic_heavy"],
    },
  },

  // ── Italian ──
  {
    id: "rank-fettuccine-alfredo",
    title: "Chicken Fettuccine Alfredo",
    image: "/onboarding/recipes/fettuccine-alfredo.jpg",
    emoji: "\u{1F35D}",
    tags: ["pasta", "comfort"],
    prepTime: 30,
    cuisine: "italian",
    flavorWeights: { sweet: 0.1, savory: 0.7, richness: 0.9, tangy: 0.1 },
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
    id: "rank-shrimp-scampi",
    title: "Shrimp Scampi",
    image: "/onboarding/recipes/shrimp scampi.jpg",
    emoji: "\u{1F364}",
    tags: ["seafood", "italian"],
    prepTime: 20,
    cuisine: "italian",
    flavorWeights: { sweet: 0.1, savory: 0.7, richness: 0.5, tangy: 0.6 },
    tasteTags: {
      flavor: ["tangy", "umami"],
      texture: ["saucy"],
      cuisine: ["italian"],
      nutritional: ["high_protein"],
      cookingStyle: ["quick_meals"],
      ingredients: ["garlic_heavy"],
    },
  },

  // ── American ──
  {
    id: "rank-chicken-waffles",
    title: "Honey Fried Chicken & Waffles",
    image: "/onboarding/recipes/chicken-waffles.jpg",
    emoji: "\u{1F357}",
    tags: ["brunch", "southern"],
    prepTime: 45,
    cuisine: "american",
    flavorWeights: { sweet: 0.8, savory: 0.5, richness: 0.7, tangy: 0.1 },
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
    id: "rank-buffalo-wings",
    title: "Buffalo Wings",
    image: "/onboarding/recipes/buffalowings.jpg",
    emoji: "\u{1F357}",
    tags: ["spicy", "american"],
    prepTime: 35,
    cuisine: "american",
    flavorWeights: { sweet: 0.1, savory: 0.7, richness: 0.4, tangy: 0.7 },
    tasteTags: {
      flavor: ["spicy", "tangy"],
      texture: ["crunchy"],
      cuisine: ["american"],
      nutritional: ["high_protein"],
      cookingStyle: ["baked"],
      ingredients: [],
    },
  },
];

export default RANKING_RECIPES;
