export interface KitchenPal {
  id: string;
  name: string;
  emoji: string;
  image: string;
  color: string;
  bgGradient: string;
  tagline: string;
}

const KITCHEN_PALS: KitchenPal[] = [
  {
    id: "bao",
    name: "Bao",
    emoji: "\u{1F95F}",
    image: "/onboarding/pals/bao.png",
    color: "#FFF3E0",
    bgGradient: "linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%)",
    tagline: "Warm & cozy",
  },
  {
    id: "pizza",
    name: "Pizza",
    emoji: "\u{1F355}",
    image: "/onboarding/pals/pizza.png",
    color: "#FFF8E1",
    bgGradient: "linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)",
    tagline: "Always a good time",
  },
  {
    id: "pasta",
    name: "Pasta",
    emoji: "\u{1F35D}",
    image: "/onboarding/pals/pasta.png",
    color: "#FFFDE7",
    bgGradient: "linear-gradient(135deg, #FFFDE7 0%, #FFF9C4 100%)",
    tagline: "Classic comfort",
  },
  {
    id: "salad",
    name: "Salad",
    emoji: "\u{1F957}",
    image: "/onboarding/pals/salad.png",
    color: "#F1F8E9",
    bgGradient: "linear-gradient(135deg, #F1F8E9 0%, #DCEDC8 100%)",
    tagline: "Fresh & vibrant",
  },
  {
    id: "taco",
    name: "Taco",
    emoji: "\u{1F32E}",
    image: "/onboarding/pals/taco.png",
    color: "#FFF3E0",
    bgGradient: "linear-gradient(135deg, #FFF3E0 0%, #FFCC80 100%)",
    tagline: "Full of flavor",
  },
  {
    id: "sushi",
    name: "Sushi",
    emoji: "\u{1F363}",
    image: "/onboarding/pals/sushi.png",
    color: "#E8F5E9",
    bgGradient: "linear-gradient(135deg, #FFF3E0 0%, #FFCCBC 100%)",
    tagline: "Refined & elegant",
  },
];

export default KITCHEN_PALS;
