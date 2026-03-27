import { useEffect, type ComponentType } from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "./pages/not-found";
import Onboarding from "./pages/onboarding";
import LoginPage from "./pages/login";
import Home from "./pages/home";
import CookbooksPage from "./pages/cookbooks";
import ShoppingListPage from "./pages/shopping-list";
import ProfilePage from "./pages/profile";
import SettingsPage from "./pages/settings";
import RecipeDetailPage from "./pages/recipe-detail";
import CookModePage from "./pages/cook-mode";
import ScanPage from "./pages/scan";
import PreviewPage from "./pages/preview";
import RecipeIdeasPage from "./pages/recipe-ideas";
import CookbookDetailPage from "./pages/cookbook-detail";
import MealPlanPage from "./pages/meal-plan";
import { ShoppingProvider } from "@/lib/store";
import { CookbooksProvider } from "@/lib/cookbooks-store";
import { PlanProvider } from "@/lib/plan-store";
import { runLegacyCleanupOnce } from "@/lib/user-storage";
import { AuthProvider } from "@/contexts/auth-context";
import { useAuth } from "@/contexts/auth-context";
import { getSession } from "@/lib/session";

function isOnboardingReplay() {
  if (typeof window === "undefined") return false;
  return new URL(window.location.href).searchParams.get("replay") === "1";
}

function Router() {
  const { user, loading } = useAuth();
  const { onboardingComplete } = getSession();
  const showOnboarding = !onboardingComplete || isOnboardingReplay();
  const publicFallback = onboardingComplete && !isOnboardingReplay() ? "/login" : "/onboarding";

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center">
        <div className="mx-auto flex min-h-screen w-full max-w-[430px] items-center justify-center px-6">
          <div className="text-base text-foreground" data-testid="text-app-auth-loading" style={{ color: 'hsl(28 60% 96%)' }}>
            Loading…
          </div>
        </div>
      </div>
    );
  }

  const renderProtected = (
    Component: ComponentType<any>,
    routeParams: Record<string, string | undefined> = {},
  ) => (user ? <Component params={routeParams} /> : <Redirect to={publicFallback} />);

  return (
    <Switch>
      <Route path="/">
        {user ? <Redirect to="/home" /> : <Redirect to={publicFallback} />}
      </Route>

      <Route path="/onboarding">
        {user && !isOnboardingReplay() ? <Redirect to="/home" /> : showOnboarding ? <Onboarding /> : <Redirect to="/login" />}
      </Route>

      <Route path="/login">
        {user ? <Redirect to="/home" /> : onboardingComplete ? <LoginPage /> : <Redirect to="/onboarding" />}
      </Route>

      <Route path="/home">{(params) => renderProtected(Home, params)}</Route>

      {/* Scan flow */}
      <Route path="/camera">{(params) => renderProtected(ScanPage, params)}</Route>
      <Route path="/scan">{(params) => renderProtected(ScanPage, params)}</Route>
      <Route path="/preview">{(params) => renderProtected(PreviewPage, params)}</Route>
      <Route path="/ideas">{(params) => renderProtected(RecipeIdeasPage, params)}</Route>

      {/* Cookbook & lists */}
      <Route path="/cookbooks">{(params) => renderProtected(CookbooksPage, params)}</Route>
      <Route path="/cookbooks/:id">{(params) => renderProtected(CookbookDetailPage, params)}</Route>
      <Route path="/shopping-list">{(params) => renderProtected(ShoppingListPage, params)}</Route>
      <Route path="/profile">{(params) => renderProtected(ProfilePage, params)}</Route>
      <Route path="/settings">{(params) => renderProtected(SettingsPage, params)}</Route>

      {/* Plan */}
      <Route path="/plan">{(params) => renderProtected(MealPlanPage, params)}</Route>

      {/* Recipes */}
      <Route path="/recipe/:id">{(params) => renderProtected(RecipeDetailPage, params)}</Route>
      <Route path="/cook/:id">{(params) => renderProtected(CookModePage, params)}</Route>

      <Route path="/app">
        {user ? <Redirect to="/home" /> : <Redirect to={publicFallback} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    runLegacyCleanupOnce();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <ShoppingProvider>
            <CookbooksProvider>
              <PlanProvider>
                <Toaster />
                <Router />
              </PlanProvider>
            </CookbooksProvider>
          </ShoppingProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
