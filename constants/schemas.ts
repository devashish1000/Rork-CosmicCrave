import { z } from "zod";

export const recipeSchema = z.object({
  recipes: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      cookTime: z.number(),
      prepTime: z.number(),
      difficulty: z.enum(["Easy", "Medium", "Hard"]),
      calories: z.number(),
      servings: z.number(),
      tags: z.array(z.string()),
      ingredients: z.array(
        z.object({
          name: z.string(),
          amount: z.string(),
          unit: z.string(),
        })
      ),
      steps: z.array(
        z.object({
          step: z.number(),
          title: z.string(),
          description: z.string(),
          duration: z.number().optional(),
        })
      ),
      nutrition: z.object({
        calories: z.number(),
        protein: z.number(),
        carbs: z.number(),
        fat: z.number(),
        fiber: z.number(),
      }),
      tips: z.array(z.string()),
    })
  ),
});

export const ingredientParseSchema = z.object({
  ingredients: z.array(z.string()).describe("List of individual ingredient names detected from the image."),
});
