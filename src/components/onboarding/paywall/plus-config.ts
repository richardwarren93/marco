// Single source of truth for Marco Plus paywall copy + pricing. Kept as plain
// data so prices/trial length can be A/B tested or swapped for RevenueCat
// offerings later without touching the screen components.
//
// NOTE (Phase 0): these prices are display-only mocks. The live numbers will
// come from RevenueCat / App Store Connect products in Phase 2. Keep the
// identifiers in sync with the products you create there.

export const PLUS_PRICING = {
  annual: {
    productId: "marco_plus_annual",
    priceLabel: "$49.99",
    period: "year",
    perLabel: "$49.99/yr",
    trialDays: 3,
    // ~$4.17/mo — used to make the annual feel small next to the savings.
    monthlyEquivalent: "$4.17",
  },
  monthly: {
    productId: "marco_plus_monthly",
    priceLabel: "$7.99",
    period: "month",
    perLabel: "$7.99/mo",
    trialDays: 0, // decoy: no trial on monthly
  },
  // The grocery cash-back / savings figure already surfaced in the guided demo.
  // This is the ROI hook: Plus costs $49.99, saves ~$210.
  estimatedAnnualSavings: "$210",
} as const;

export interface PlusFeatureRow {
  label: string;
  /** Free-tier value: a string (e.g. "25"), true (included), or false (not). */
  free: string | boolean;
  /** Plus-tier value. */
  plus: string | boolean;
  /** Highlight this row (the cash-back ROI hook). */
  hero?: boolean;
}

export const PLUS_FEATURES: PlusFeatureRow[] = [
  { label: "Import recipes from links & photos", free: true, plus: true },
  { label: "Save recipes", free: "25", plus: "Unlimited" },
  { label: "Meal planning", free: "This week", plus: "Every week" },
  { label: "Grocery list", free: "Manual", plus: "Auto-built" },
  { label: "Grocery cash-back", free: false, plus: `~${PLUS_PRICING.estimatedAnnualSavings}/yr`, hero: true },
  { label: "Cook with Sous Chef", free: "3 / mo", plus: "Unlimited" },
  { label: "AI Discover & Search", free: "Limited", plus: "Unlimited" },
];

export interface Testimonial {
  quote: string;
  // The phrase to tint tomato-red for emphasis (must appear in `quote`).
  emphasis: string;
  author: string;
}

export const PLUS_TESTIMONIALS: Testimonial[] = [
  {
    quote: "The grocery list pays for itself. I actually saved more than it costs.",
    emphasis: "pays for itself",
    author: "Dana R.",
  },
  {
    quote: "Cooking with Sous Chef hands-free changed weeknight dinners for us.",
    emphasis: "changed weeknight dinners",
    author: "Marcus T.",
  },
  {
    quote: "Every recipe I've ever loved, finally in one book. Worth it.",
    emphasis: "finally in one book",
    author: "Priya N.",
  },
];

export const PLUS_SOCIAL_PROOF = "Loved by 10,000+ home cooks";
