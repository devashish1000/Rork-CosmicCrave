import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@/contexts/AuthContext";
import { RecipeProvider } from "@/contexts/RecipeContext";
import { ShoppingProvider } from "@/contexts/ShoppingContext";
import { CookbooksProvider } from "@/contexts/CookbooksContext";
import Colors from "@/constants/colors";
import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.dark },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="login" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="recipe/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="cook/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="cookbooks" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <RecipeProvider>
            <ShoppingProvider>
              <CookbooksProvider>
                <StatusBar style="light" />
                <RootLayoutNav />
              </CookbooksProvider>
            </ShoppingProvider>
          </RecipeProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
