import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import createContextHook from "@nkzw/create-context-hook";
import { UserProfile } from "@/types/recipe";

const DEFAULT_USER: UserProfile = {
  id: "user-1",
  name: "Chef",
  email: "",
  avatarUrl: "",
  dietaryPreferences: [],
  tier: "free",
  scansUsed: 0,
  scanLimit: 5,
  periodEnd: new Date(Date.now() + 7 * 86400000).toISOString(),
};

const STORAGE_KEYS = {
  user: "chef_user_profile",
  onboarded: "chef_onboarded",
  loggedIn: "chef_logged_in",
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);

  const initQuery = useQuery({
    queryKey: ["auth_init"],
    queryFn: async () => {
      const [userStr, onboarded, loggedIn] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.user),
        AsyncStorage.getItem(STORAGE_KEYS.onboarded),
        AsyncStorage.getItem(STORAGE_KEYS.loggedIn),
      ]);
      return {
        user: userStr ? JSON.parse(userStr) : null,
        onboarded: onboarded === "true",
        loggedIn: loggedIn === "true",
      };
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (initQuery.data) {
      if (initQuery.data.user) setUser(initQuery.data.user);
      setHasOnboarded(initQuery.data.onboarded);
      setIsLoggedIn(initQuery.data.loggedIn);
      setIsReady(true);
    }
  }, [initQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (profile: UserProfile) => {
      await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(profile));
      return profile;
    },
  });

  const login = useCallback(async (email: string, name: string) => {
    const profile: UserProfile = {
      ...DEFAULT_USER,
      id: `user-${Date.now()}`,
      email,
      name: name || email.split("@")[0],
    };
    setUser(profile);
    setIsLoggedIn(true);
    await AsyncStorage.setItem(STORAGE_KEYS.loggedIn, "true");
    saveMutation.mutate(profile);
  }, [saveMutation]);

  const logout = useCallback(async () => {
    setIsLoggedIn(false);
    setUser(DEFAULT_USER);
    await AsyncStorage.setItem(STORAGE_KEYS.loggedIn, "false");
  }, []);

  const completeOnboarding = useCallback(async () => {
    setHasOnboarded(true);
    await AsyncStorage.setItem(STORAGE_KEYS.onboarded, "true");
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const incrementScan = useCallback(() => {
    setUser((prev) => {
      const updated = { ...prev, scansUsed: prev.scansUsed + 1 };
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const canScan = user.scansUsed < user.scanLimit;

  return {
    user,
    isLoggedIn,
    hasOnboarded,
    isReady,
    login,
    logout,
    completeOnboarding,
    updateProfile,
    incrementScan,
    canScan,
  };
});
