export type Recipe = {
  id: string;
  title: string;
  minutes: number;
  blurb: string;
  tags: string[];
};

export const RECENT_RECIPES: Recipe[] = [
  {
    id: "r1",
    title: "Smoky Chickpea Skillet",
    minutes: 18,
    blurb: "Paprika, lemon, garlic—fast, hearty, pantry-friendly.",
    tags: ["Vegan", "One-pan"],
  },
  {
    id: "r2",
    title: "Orange-Ginger Salmon Bowl",
    minutes: 22,
    blurb: "Crisp greens, sticky glaze, and a bright citrus finish.",
    tags: ["High-protein"],
  },
  {
    id: "r3",
    title: "Charred Corn & Avocado Tacos",
    minutes: 16,
    blurb: "Sweet heat, lime crema, and crunch—weeknight magic.",
    tags: ["Vegetarian"],
  },
];
