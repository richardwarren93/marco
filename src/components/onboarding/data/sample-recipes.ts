export interface SampleRecipe {
  id: string;
  title: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  image_emoji: string;
  prep_time: number;
  cook_time: number;
  tags: string[];
  ingredients: { name: string; amount: string; unit: string }[];
  description: string;
  tasteTags: {
    flavor?: string[];
    texture?: string[];
    cuisine?: string[];
    nutritional?: string[];
    cookingStyle?: string[];
    ingredients?: string[];
  };
}

const SAMPLE_RECIPES: SampleRecipe[] = [
  // Breakfast
  {
    id: "sb-1",
    title: "Avocado Toast with Poached Eggs",
    meal_type: "breakfast",
    image_emoji: "\u{1F951}",
    prep_time: 5,
    cook_time: 8,
    tags: ["healthy", "quick"],
    ingredients: [
      { name: "Sourdough bread", amount: "2", unit: "slices" },
      { name: "Avocado", amount: "1", unit: "" },
      { name: "Eggs", amount: "2", unit: "" },
      { name: "Red pepper flakes", amount: "1", unit: "pinch" },
      { name: "Lemon juice", amount: "1", unit: "tsp" },
    ],
    description: "Creamy avocado on crispy toast topped with perfectly poached eggs",
    tasteTags: { flavor: ["tangy"], texture: ["creamy", "crunchy"], cuisine: ["american"], nutritional: ["high_protein"], cookingStyle: ["quick_meals"], ingredients: ["herbaceous"] },
  },
  {
    id: "sb-2",
    title: "Fluffy Blueberry Pancakes",
    meal_type: "breakfast",
    image_emoji: "\u{1F95E}",
    prep_time: 10,
    cook_time: 15,
    tags: ["sweet", "comfort"],
    ingredients: [
      { name: "Flour", amount: "1.5", unit: "cups" },
      { name: "Blueberries", amount: "1", unit: "cup" },
      { name: "Milk", amount: "1", unit: "cup" },
      { name: "Egg", amount: "1", unit: "" },
      { name: "Maple syrup", amount: "3", unit: "tbsp" },
    ],
    description: "Light and fluffy pancakes bursting with fresh blueberries",
    tasteTags: { flavor: ["sweet"], texture: ["chewy"], cuisine: ["american"], nutritional: ["indulgent"], cookingStyle: ["one_pan"], ingredients: [] },
  },
  {
    id: "sb-3",
    title: "Spicy Shakshuka",
    meal_type: "breakfast",
    image_emoji: "\u{1F373}",
    prep_time: 5,
    cook_time: 20,
    tags: ["spicy", "one-pan"],
    ingredients: [
      { name: "Eggs", amount: "4", unit: "" },
      { name: "Canned tomatoes", amount: "1", unit: "can" },
      { name: "Bell pepper", amount: "1", unit: "" },
      { name: "Cumin", amount: "1", unit: "tsp" },
      { name: "Feta cheese", amount: "2", unit: "oz" },
    ],
    description: "Eggs poached in a spicy tomato sauce with peppers and feta",
    tasteTags: { flavor: ["spicy", "tangy"], texture: ["saucy"], cuisine: ["mediterranean"], nutritional: ["high_protein"], cookingStyle: ["one_pan"], ingredients: ["garlic_heavy"] },
  },
  {
    id: "sb-4",
    title: "Overnight Oats with Mango",
    meal_type: "breakfast",
    image_emoji: "\u{1F963}",
    prep_time: 5,
    cook_time: 0,
    tags: ["healthy", "no-cook"],
    ingredients: [
      { name: "Rolled oats", amount: "0.5", unit: "cup" },
      { name: "Mango", amount: "0.5", unit: "cup" },
      { name: "Yogurt", amount: "0.5", unit: "cup" },
      { name: "Chia seeds", amount: "1", unit: "tbsp" },
      { name: "Honey", amount: "1", unit: "tbsp" },
    ],
    description: "Creamy no-cook oats layered with tropical mango",
    tasteTags: { flavor: ["sweet"], texture: ["creamy"], cuisine: ["fusion"], nutritional: ["high_protein"], cookingStyle: ["quick_meals"], ingredients: [] },
  },
  {
    id: "sb-5",
    title: "Smoked Salmon Bagel",
    meal_type: "breakfast",
    image_emoji: "\u{1F96F}",
    prep_time: 5,
    cook_time: 0,
    tags: ["luxe", "quick"],
    ingredients: [
      { name: "Everything bagel", amount: "1", unit: "" },
      { name: "Cream cheese", amount: "2", unit: "tbsp" },
      { name: "Smoked salmon", amount: "2", unit: "oz" },
      { name: "Capers", amount: "1", unit: "tsp" },
      { name: "Red onion", amount: "2", unit: "slices" },
    ],
    description: "Classic bagel loaded with cream cheese and smoked salmon",
    tasteTags: { flavor: ["smoky", "umami"], texture: ["creamy", "chewy"], cuisine: ["american"], nutritional: ["high_protein"], cookingStyle: ["quick_meals"], ingredients: [] },
  },
  // Lunch
  {
    id: "sl-1",
    title: "Crispy Chicken Caesar Wrap",
    meal_type: "lunch",
    image_emoji: "\u{1F32F}",
    prep_time: 10,
    cook_time: 15,
    tags: ["protein", "quick"],
    ingredients: [
      { name: "Chicken breast", amount: "1", unit: "" },
      { name: "Romaine lettuce", amount: "2", unit: "cups" },
      { name: "Parmesan", amount: "2", unit: "tbsp" },
      { name: "Caesar dressing", amount: "2", unit: "tbsp" },
      { name: "Flour tortilla", amount: "1", unit: "large" },
    ],
    description: "Crispy chicken with romaine and parmesan in a toasted wrap",
    tasteTags: { flavor: ["umami"], texture: ["crunchy", "creamy"], cuisine: ["american"], nutritional: ["high_protein"], cookingStyle: ["quick_meals"], ingredients: ["cheese_forward"] },
  },
  {
    id: "sl-2",
    title: "Thai Peanut Noodle Bowl",
    meal_type: "lunch",
    image_emoji: "\u{1F35C}",
    prep_time: 10,
    cook_time: 10,
    tags: ["asian", "vegan"],
    ingredients: [
      { name: "Rice noodles", amount: "4", unit: "oz" },
      { name: "Peanut butter", amount: "2", unit: "tbsp" },
      { name: "Soy sauce", amount: "2", unit: "tbsp" },
      { name: "Carrots", amount: "1", unit: "" },
      { name: "Edamame", amount: "0.5", unit: "cup" },
    ],
    description: "Silky rice noodles tossed in a rich peanut sauce",
    tasteTags: { flavor: ["umami", "sweet"], texture: ["chewy", "crunchy"], cuisine: ["thai"], nutritional: ["high_protein"], cookingStyle: ["quick_meals"], ingredients: ["garlic_heavy"] },
  },
  {
    id: "sl-3",
    title: "Mediterranean Grain Bowl",
    meal_type: "lunch",
    image_emoji: "\u{1F957}",
    prep_time: 10,
    cook_time: 20,
    tags: ["healthy", "meal-prep"],
    ingredients: [
      { name: "Quinoa", amount: "1", unit: "cup" },
      { name: "Chickpeas", amount: "1", unit: "can" },
      { name: "Cucumber", amount: "1", unit: "" },
      { name: "Cherry tomatoes", amount: "1", unit: "cup" },
      { name: "Hummus", amount: "3", unit: "tbsp" },
    ],
    description: "Hearty grain bowl loaded with Mediterranean vegetables",
    tasteTags: { flavor: ["tangy"], texture: ["crunchy"], cuisine: ["mediterranean"], nutritional: ["high_protein"], cookingStyle: ["quick_meals"], ingredients: ["herbaceous"] },
  },
  {
    id: "sl-4",
    title: "Spicy Tuna Poke Bowl",
    meal_type: "lunch",
    image_emoji: "\u{1F363}",
    prep_time: 15,
    cook_time: 0,
    tags: ["seafood", "fresh"],
    ingredients: [
      { name: "Sushi-grade tuna", amount: "6", unit: "oz" },
      { name: "Sushi rice", amount: "1", unit: "cup" },
      { name: "Avocado", amount: "0.5", unit: "" },
      { name: "Sriracha mayo", amount: "1", unit: "tbsp" },
      { name: "Sesame seeds", amount: "1", unit: "tsp" },
    ],
    description: "Fresh tuna cubes over seasoned rice with creamy avocado",
    tasteTags: { flavor: ["spicy", "umami"], texture: ["creamy"], cuisine: ["japanese"], nutritional: ["high_protein", "low_carb"], cookingStyle: ["quick_meals"], ingredients: [] },
  },
  {
    id: "sl-5",
    title: "Caprese Panini",
    meal_type: "lunch",
    image_emoji: "\u{1F96A}",
    prep_time: 5,
    cook_time: 8,
    tags: ["italian", "quick"],
    ingredients: [
      { name: "Ciabatta bread", amount: "1", unit: "roll" },
      { name: "Fresh mozzarella", amount: "4", unit: "oz" },
      { name: "Tomato", amount: "1", unit: "large" },
      { name: "Fresh basil", amount: "6", unit: "leaves" },
      { name: "Balsamic glaze", amount: "1", unit: "tbsp" },
    ],
    description: "Warm pressed sandwich with melted mozzarella and basil",
    tasteTags: { flavor: ["tangy"], texture: ["crunchy", "chewy"], cuisine: ["italian"], nutritional: ["indulgent"], cookingStyle: ["quick_meals"], ingredients: ["cheese_forward", "herbaceous"] },
  },
  // Dinner
  {
    id: "sd-1",
    title: "Garlic Butter Salmon",
    meal_type: "dinner",
    image_emoji: "\u{1F41F}",
    prep_time: 5,
    cook_time: 15,
    tags: ["seafood", "keto"],
    ingredients: [
      { name: "Salmon fillet", amount: "2", unit: "pieces" },
      { name: "Butter", amount: "3", unit: "tbsp" },
      { name: "Garlic cloves", amount: "4", unit: "" },
      { name: "Lemon", amount: "1", unit: "" },
      { name: "Asparagus", amount: "1", unit: "bunch" },
    ],
    description: "Pan-seared salmon in a rich garlic butter sauce",
    tasteTags: { flavor: ["umami", "smoky"], texture: ["crunchy"], cuisine: ["american"], nutritional: ["high_protein", "low_carb"], cookingStyle: ["one_pan"], ingredients: ["garlic_heavy"] },
  },
  {
    id: "sd-2",
    title: "Creamy Tuscan Chicken Pasta",
    meal_type: "dinner",
    image_emoji: "\u{1F35D}",
    prep_time: 10,
    cook_time: 25,
    tags: ["pasta", "comfort"],
    ingredients: [
      { name: "Penne pasta", amount: "8", unit: "oz" },
      { name: "Chicken thighs", amount: "1", unit: "lb" },
      { name: "Sun-dried tomatoes", amount: "0.5", unit: "cup" },
      { name: "Heavy cream", amount: "1", unit: "cup" },
      { name: "Spinach", amount: "2", unit: "cups" },
    ],
    description: "Rich and creamy pasta with tender chicken and sun-dried tomatoes",
    tasteTags: { flavor: ["umami"], texture: ["creamy", "saucy"], cuisine: ["italian"], nutritional: ["indulgent"], cookingStyle: ["one_pan"], ingredients: ["garlic_heavy", "cheese_forward"] },
  },
  {
    id: "sd-3",
    title: "Korean BBQ Beef Tacos",
    meal_type: "dinner",
    image_emoji: "\u{1F32E}",
    prep_time: 15,
    cook_time: 10,
    tags: ["fusion", "spicy"],
    ingredients: [
      { name: "Flank steak", amount: "1", unit: "lb" },
      { name: "Gochujang", amount: "2", unit: "tbsp" },
      { name: "Corn tortillas", amount: "8", unit: "" },
      { name: "Kimchi", amount: "0.5", unit: "cup" },
      { name: "Sesame oil", amount: "1", unit: "tbsp" },
    ],
    description: "Spicy marinated beef in tortillas with tangy kimchi slaw",
    tasteTags: { flavor: ["spicy", "umami", "smoky"], texture: ["crunchy", "chewy"], cuisine: ["fusion"], nutritional: ["high_protein"], cookingStyle: ["grilled"], ingredients: ["garlic_heavy"] },
  },
  {
    id: "sd-4",
    title: "One-Pan Lemon Herb Chicken",
    meal_type: "dinner",
    image_emoji: "\u{1F357}",
    prep_time: 10,
    cook_time: 35,
    tags: ["easy", "one-pan"],
    ingredients: [
      { name: "Chicken thighs", amount: "4", unit: "" },
      { name: "Baby potatoes", amount: "1", unit: "lb" },
      { name: "Lemon", amount: "2", unit: "" },
      { name: "Fresh rosemary", amount: "3", unit: "sprigs" },
      { name: "Olive oil", amount: "3", unit: "tbsp" },
    ],
    description: "Juicy roasted chicken with crispy potatoes and bright lemon",
    tasteTags: { flavor: ["tangy", "smoky"], texture: ["crunchy"], cuisine: ["mediterranean"], nutritional: ["high_protein"], cookingStyle: ["baked", "one_pan"], ingredients: ["herbaceous"] },
  },
  {
    id: "sd-5",
    title: "Spicy Vodka Rigatoni",
    meal_type: "dinner",
    image_emoji: "\u{1F35D}",
    prep_time: 5,
    cook_time: 20,
    tags: ["pasta", "viral"],
    ingredients: [
      { name: "Rigatoni", amount: "1", unit: "lb" },
      { name: "Tomato paste", amount: "3", unit: "tbsp" },
      { name: "Heavy cream", amount: "0.5", unit: "cup" },
      { name: "Red pepper flakes", amount: "1", unit: "tsp" },
      { name: "Pecorino Romano", amount: "0.5", unit: "cup" },
    ],
    description: "The famous TikTok pasta - creamy, spicy, and cheesy",
    tasteTags: { flavor: ["spicy", "umami"], texture: ["saucy", "chewy"], cuisine: ["italian"], nutritional: ["indulgent"], cookingStyle: ["one_pan"], ingredients: ["cheese_forward"] },
  },
  // Snacks
  {
    id: "ss-1",
    title: "Crispy Air Fryer Chickpeas",
    meal_type: "snack",
    image_emoji: "\u{1FAD8}",
    prep_time: 5,
    cook_time: 15,
    tags: ["healthy", "crunchy"],
    ingredients: [
      { name: "Chickpeas", amount: "1", unit: "can" },
      { name: "Olive oil", amount: "1", unit: "tbsp" },
      { name: "Smoked paprika", amount: "1", unit: "tsp" },
      { name: "Garlic powder", amount: "0.5", unit: "tsp" },
      { name: "Salt", amount: "0.5", unit: "tsp" },
    ],
    description: "Addictively crunchy seasoned chickpeas",
    tasteTags: { flavor: ["smoky", "spicy"], texture: ["crunchy"], cuisine: ["american"], nutritional: ["high_protein"], cookingStyle: ["quick_meals"], ingredients: ["garlic_heavy"] },
  },
  {
    id: "ss-2",
    title: "Homemade Guacamole & Chips",
    meal_type: "snack",
    image_emoji: "\u{1F951}",
    prep_time: 10,
    cook_time: 0,
    tags: ["fresh", "party"],
    ingredients: [
      { name: "Avocados", amount: "3", unit: "" },
      { name: "Lime", amount: "1", unit: "" },
      { name: "Red onion", amount: "0.25", unit: "cup" },
      { name: "Cilantro", amount: "2", unit: "tbsp" },
      { name: "Tortilla chips", amount: "1", unit: "bag" },
    ],
    description: "Fresh chunky guacamole with crispy tortilla chips",
    tasteTags: { flavor: ["tangy"], texture: ["creamy", "crunchy"], cuisine: ["mexican"], nutritional: ["indulgent"], cookingStyle: ["quick_meals"], ingredients: ["herbaceous"] },
  },
  {
    id: "ss-3",
    title: "Greek Yogurt Parfait",
    meal_type: "snack",
    image_emoji: "\u{1F966}",
    prep_time: 5,
    cook_time: 0,
    tags: ["healthy", "sweet"],
    ingredients: [
      { name: "Greek yogurt", amount: "1", unit: "cup" },
      { name: "Granola", amount: "0.25", unit: "cup" },
      { name: "Mixed berries", amount: "0.5", unit: "cup" },
      { name: "Honey", amount: "1", unit: "tbsp" },
    ],
    description: "Layered yogurt with crunchy granola and fresh berries",
    tasteTags: { flavor: ["sweet", "tangy"], texture: ["creamy", "crunchy"], cuisine: ["american"], nutritional: ["high_protein"], cookingStyle: ["quick_meals"], ingredients: [] },
  },
  {
    id: "ss-4",
    title: "Bruschetta with Burrata",
    meal_type: "snack",
    image_emoji: "\u{1F9C0}",
    prep_time: 10,
    cook_time: 5,
    tags: ["italian", "fancy"],
    ingredients: [
      { name: "Baguette", amount: "1", unit: "" },
      { name: "Burrata", amount: "4", unit: "oz" },
      { name: "Cherry tomatoes", amount: "1", unit: "cup" },
      { name: "Fresh basil", amount: "6", unit: "leaves" },
      { name: "Balsamic glaze", amount: "1", unit: "tbsp" },
    ],
    description: "Toasted bread with creamy burrata and fresh tomatoes",
    tasteTags: { flavor: ["tangy", "umami"], texture: ["crunchy", "creamy"], cuisine: ["italian"], nutritional: ["indulgent"], cookingStyle: ["quick_meals"], ingredients: ["cheese_forward", "herbaceous"] },
  },
  {
    id: "ss-5",
    title: "Mango Sticky Rice",
    meal_type: "snack",
    image_emoji: "\u{1F96D}",
    prep_time: 10,
    cook_time: 25,
    tags: ["thai", "dessert"],
    ingredients: [
      { name: "Sticky rice", amount: "1", unit: "cup" },
      { name: "Coconut milk", amount: "1", unit: "cup" },
      { name: "Mango", amount: "1", unit: "" },
      { name: "Sugar", amount: "3", unit: "tbsp" },
      { name: "Salt", amount: "0.25", unit: "tsp" },
    ],
    description: "Sweet coconut sticky rice with fresh ripe mango",
    tasteTags: { flavor: ["sweet"], texture: ["chewy", "creamy"], cuisine: ["thai"], nutritional: ["indulgent"], cookingStyle: ["one_pan"], ingredients: [] },
  },
];

export default SAMPLE_RECIPES;

// Get recipes by meal type
export function getRecipesByType(type: SampleRecipe["meal_type"]) {
  return SAMPLE_RECIPES.filter((r) => r.meal_type === type);
}

// Get a subset for the meal plan demo
export function getMealPlanDemoRecipes() {
  return [
    SAMPLE_RECIPES[0],  // Avocado Toast
    SAMPLE_RECIPES[5],  // Caesar Wrap
    SAMPLE_RECIPES[10], // Garlic Butter Salmon
    SAMPLE_RECIPES[11], // Tuscan Chicken Pasta
    SAMPLE_RECIPES[2],  // Shakshuka
    SAMPLE_RECIPES[6],  // Peanut Noodle Bowl
    SAMPLE_RECIPES[12], // Korean BBQ Tacos
    SAMPLE_RECIPES[14], // Vodka Rigatoni
  ];
}
