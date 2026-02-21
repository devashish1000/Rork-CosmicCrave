import type { RecipeFull } from "./recipes";
import { readUserScoped } from "./user-storage";

export type ProfilePrefs = {
  dietType: string;
  allergies: string[];
  calorieGoal: number;
};

const PROFILE_PREFS_KEY = "profile:prefs:v1";
const PROFILE_PREFS_LEGACY_KEYS = ["snapcook:prefs"] as const;

// Diet type to tag mapping
const DIET_TAG_MAP: Record<string, string[]> = {
  "Vegetarian": ["vegetarian", "veggie"],
  "Vegan": ["vegan"],
  "Keto": ["keto", "low-carb", "low carb"],
  "Pescatarian": ["pescatarian", "seafood", "fish"],
  "Paleo": ["paleo"],
  "Low-carb": ["low-carb", "low carb", "keto"],
  "Mediterranean": ["mediterranean"],
  "Halal": ["halal"],
  "Kosher": ["kosher"],
  "Whole30": ["whole30", "whole 30"],
  "Dairy-free": ["dairy-free", "dairy free", "vegan"],
  "Gluten-free": ["gluten-free", "gluten free"],
};

// Allergy to ingredient keyword mapping
const ALLERGY_INGREDIENT_MAP: Record<string, string[]> = {
  "Peanuts": ["peanut", "peanuts", "peanut butter"],
  "Tree nuts": ["almond", "walnut", "cashew", "pistachio", "hazelnut", "pecan", "macadamia", "brazil nut", "nut"],
  "Dairy": ["milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "dairy", "whey", "casein"],
  "Eggs": ["egg", "eggs", "mayonnaise", "mayo"],
  "Gluten": ["wheat", "flour", "bread", "pasta", "gluten", "barley", "rye", "oats"],
  "Soy": ["soy", "soya", "tofu", "tempeh", "miso", "edamame"],
  "Shellfish": ["shrimp", "prawn", "crab", "lobster", "scallop", "mussel", "clam", "oyster", "shellfish"],
  "Fish": ["fish", "salmon", "tuna", "cod", "sardine", "anchovy", "mackerel", "trout"],
  "Sesame": ["sesame", "tahini"],
  "Sulfites": ["sulfite", "sulphite", "sulfite"],
};

/**
 * Reads user dietary preferences from storage
 */
export function readDietaryPreferences(): ProfilePrefs {
  const raw = readUserScoped(PROFILE_PREFS_KEY, PROFILE_PREFS_LEGACY_KEYS);
  
  if (!raw) {
    return { dietType: "Flexible", allergies: ["None"], calorieGoal: 2000 };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProfilePrefs>;
    return {
      dietType: parsed.dietType || "Flexible",
      allergies: Array.isArray(parsed.allergies) ? parsed.allergies : ["None"],
      calorieGoal: typeof parsed.calorieGoal === "number" && parsed.calorieGoal >= 900 && parsed.calorieGoal <= 5000
        ? parsed.calorieGoal
        : 2000,
    };
  } catch {
    return { dietType: "Flexible", allergies: ["None"], calorieGoal: 2000 };
  }
}

/**
 * Checks if a recipe matches the user's diet type
 */
function matchesDietType(recipe: RecipeFull, dietType: string): boolean {
  if (dietType === "Flexible") return true;

  const requiredTags = DIET_TAG_MAP[dietType] || [];
  if (requiredTags.length === 0) return true;

  const recipeTagsLower = recipe.tags.map(t => t.toLowerCase());
  const recipeCuisineLower = recipe.cuisine?.toLowerCase() || "";

  // Check if recipe has any matching tag
  return requiredTags.some(tag =>
    recipeTagsLower.some(rt => rt.includes(tag)) ||
    recipeCuisineLower.includes(tag)
  );
}

/**
 * Checks if a recipe contains any of the user's allergens
 */
function containsAllergens(recipe: RecipeFull, allergies: string[]): boolean {
  const normalizedAllergies = allergies
    .filter(a => a !== "None")
    .map(a => a.toLowerCase().trim());

  if (normalizedAllergies.length === 0) return false;

  const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase());

  // Check each allergy
  for (const allergy of normalizedAllergies) {
    const keywords = ALLERGY_INGREDIENT_MAP[allergy] || [allergy];
    
    // Check if any ingredient matches any keyword for this allergy
    const hasAllergen = keywords.some(keyword =>
      recipeIngredients.some(ing => ing.includes(keyword))
    );

    if (hasAllergen) return true;
  }

  return false;
}

/**
 * Checks if a recipe matches the user's dietary preferences
 * @returns Object with match status and reasons
 */
export function checkDietaryMatch(
  recipe: RecipeFull,
  preferences?: ProfilePrefs
): {
  matches: boolean;
  dietTypeMatch: boolean;
  allergenFree: boolean;
  missingDietTags?: string[];
  foundAllergens?: string[];
} {
  const prefs = preferences || readDietaryPreferences();

  const dietTypeMatch = matchesDietType(recipe, prefs.dietType);
  const allergenFree = !containsAllergens(recipe, prefs.allergies);

  // Find missing diet tags (for informational purposes)
  const missingDietTags: string[] = [];
  if (!dietTypeMatch && prefs.dietType !== "Flexible") {
    const requiredTags = DIET_TAG_MAP[prefs.dietType] || [];
    const recipeTagsLower = recipe.tags.map(t => t.toLowerCase());
    const recipeCuisineLower = recipe.cuisine?.toLowerCase() || "";
    
    requiredTags.forEach(tag => {
      const hasTag = recipeTagsLower.some(rt => rt.includes(tag)) ||
                     recipeCuisineLower.includes(tag);
      if (!hasTag) {
        missingDietTags.push(tag);
      }
    });
  }

  // Find allergens in recipe (for informational purposes)
  const foundAllergens: string[] = [];
  if (!allergenFree) {
    const normalizedAllergies = prefs.allergies
      .filter(a => a !== "None")
      .map(a => a.toLowerCase().trim());

    normalizedAllergies.forEach(allergy => {
      const keywords = ALLERGY_INGREDIENT_MAP[allergy] || [allergy];
      const recipeIngredients = recipe.ingredients.map(i => i.name.toLowerCase());
      
      const hasAllergen = keywords.some(keyword =>
        recipeIngredients.some(ing => ing.includes(keyword))
      );

      if (hasAllergen) {
        foundAllergens.push(allergy);
      }
    });
  }

  return {
    matches: dietTypeMatch && allergenFree,
    dietTypeMatch,
    allergenFree,
    missingDietTags: missingDietTags.length > 0 ? missingDietTags : undefined,
    foundAllergens: foundAllergens.length > 0 ? foundAllergens : undefined,
  };
}

/**
 * Filters an array of recipes to only include those matching dietary preferences
 */
export function filterRecipesByPreferences(
  recipes: RecipeFull[],
  preferences?: ProfilePrefs
): RecipeFull[] {
  const prefs = preferences || readDietaryPreferences();
  
  return recipes.filter(recipe => {
    const match = checkDietaryMatch(recipe, prefs);
    return match.matches;
  });
}

/**
 * Parses calorie value from recipe calories string
 */
function parseCalories(calories?: string): number {
  if (!calories) return 0;
  const matched = calories.match(/\d+/g);
  if (!matched?.length) return 0;
  const merged = Number(matched.join(""));
  return Number.isFinite(merged) ? merged : 0;
}

/**
 * Gets calorie context for a recipe relative to daily goal
 */
export function getCalorieContext(recipe: RecipeFull, dailyGoal?: number): {
  recipeCalories: number;
  percentage: number;
  label: "Low" | "Moderate" | "High";
  remaining: number;
} {
  const recipeCalories = parseCalories(recipe.calories);
  const goal = dailyGoal || readDietaryPreferences().calorieGoal;
  const percentage = goal > 0 ? (recipeCalories / goal) * 100 : 0;
  
  let label: "Low" | "Moderate" | "High";
  if (percentage < 20) label = "Low";
  else if (percentage > 40) label = "High";
  else label = "Moderate";
  
  return {
    recipeCalories,
    percentage: Math.round(percentage),
    label,
    remaining: Math.max(0, goal - recipeCalories),
  };
}
