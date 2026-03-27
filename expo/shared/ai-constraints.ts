export const AI_LIMITS = {
  maxDetectedItems: 24,
  maxDetectedNameLength: 40,
  maxRecipesPerScan: 3,
  maxRecipeTitleLength: 80,
  maxRecipeBlurbLength: 180,
  maxRecipeTagLength: 24,
  maxRecipeTags: 6,
  maxIngredientsPerRecipe: 16,
  maxIngredientNameLength: 48,
  maxIngredientQtyLength: 24,
  maxStepsPerRecipe: 12,
  maxStepTextLength: 320,
  maxImageDataUrlLength: 6_500_000,
  maxScanIdLength: 120,
} as const;

export const SCAN_SOURCE_VALUES = ["camera", "gallery"] as const;
export type ScanSource = (typeof SCAN_SOURCE_VALUES)[number];
