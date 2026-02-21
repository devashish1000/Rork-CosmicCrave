import { useState, useEffect, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import { Recipe, ScanRecord } from "@/types/recipe";
import { SAMPLE_RECIPES } from "@/mocks/recipes";

const STORAGE_KEYS = {
  recipes: "chef_recipes",
  scans: "chef_scans",
};

export const [RecipeProvider, useRecipes] = createContextHook(() => {
  const [recipes, setRecipes] = useState<Recipe[]>(SAMPLE_RECIPES);
  const [scans, setScans] = useState<ScanRecord[]>([]);

  const recipesQuery = useQuery({
    queryKey: ["stored_recipes"],
    queryFn: async () => {
      const [recipesStr, scansStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.recipes),
        AsyncStorage.getItem(STORAGE_KEYS.scans),
      ]);
      return {
        recipes: recipesStr ? JSON.parse(recipesStr) : null,
        scans: scansStr ? JSON.parse(scansStr) : [],
      };
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (recipesQuery.data) {
      if (recipesQuery.data.recipes) setRecipes(recipesQuery.data.recipes);
      setScans(recipesQuery.data.scans);
    }
  }, [recipesQuery.data]);

  const saveRecipesMutation = useMutation({
    mutationFn: async (data: Recipe[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.recipes, JSON.stringify(data));
      return data;
    },
  });

  const saveScansMutation = useMutation({
    mutationFn: async (data: ScanRecord[]) => {
      await AsyncStorage.setItem(STORAGE_KEYS.scans, JSON.stringify(data));
      return data;
    },
  });

  const addRecipes = useCallback((newRecipes: Recipe[]) => {
    setRecipes((prev) => {
      const updated = [...newRecipes, ...prev];
      saveRecipesMutation.mutate(updated);
      return updated;
    });
  }, [saveRecipesMutation]);

  const toggleFavorite = useCallback((recipeId: string) => {
    setRecipes((prev) => {
      const updated = prev.map((r) =>
        r.id === recipeId ? { ...r, isFavorite: !r.isFavorite } : r
      );
      saveRecipesMutation.mutate(updated);
      return updated;
    });
  }, [saveRecipesMutation]);

  const addScan = useCallback((scan: ScanRecord) => {
    setScans((prev) => {
      const updated = [scan, ...prev];
      saveScansMutation.mutate(updated);
      return updated;
    });
  }, [saveScansMutation]);

  const getRecipeById = useCallback((id: string) => {
    return recipes.find((r) => r.id === id);
  }, [recipes]);

  const favorites = useMemo(() => recipes.filter((r) => r.isFavorite), [recipes]);

  return {
    recipes,
    scans,
    favorites,
    addRecipes,
    toggleFavorite,
    addScan,
    getRecipeById,
  };
});
