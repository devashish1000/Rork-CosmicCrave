export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  cookTime: number;
  prepTime: number;
  difficulty: "Easy" | "Medium" | "Hard";
  calories: number;
  servings: number;
  tags: string[];
  ingredients: Ingredient[];
  steps: CookStep[];
  nutrition: Nutrition;
  tips: string[];
  isFavorite: boolean;
  createdAt: string;
  scanId?: string;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
}

export interface CookStep {
  step: number;
  title: string;
  description: string;
  duration?: number;
}

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface ScanRecord {
  id: string;
  ingredients: string[];
  scanType: "camera" | "text" | "paste";
  timestamp: string;
  recipesGenerated: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  dietaryPreferences: string[];
  tier: "free" | "premium";
  scansUsed: number;
  scanLimit: number;
  periodEnd: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  gradient: string[];
}
