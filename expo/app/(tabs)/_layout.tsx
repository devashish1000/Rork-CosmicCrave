import React from "react";
import { Tabs } from "expo-router";
import { Home, ScanLine, BookOpen, User, ShoppingCart } from "lucide-react-native";
import { StyleSheet, View, Platform } from "react-native";
import Colors, { Radius } from "@/constants/colors";

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="(home)"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: "rgba(245, 237, 228, 0.45)",
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Home size={21} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.scanIconWrap, focused && styles.scanIconActive]}>
              <ScanLine size={21} color={focused ? Colors.dark : color} strokeWidth={focused ? 2.4 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Cookbooks",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <BookOpen size={21} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: "Shopping",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <ShoppingCart size={21} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <User size={21} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "rgba(13, 11, 10, 0.92)",
    borderTopColor: "rgba(255,255,255,0.08)",
    borderTopWidth: 1,
    elevation: 0,
    ...(Platform.OS === "web" ? {} : {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
    }),
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600" as const,
    marginTop: -2,
  },
  tabItem: {},
  activeIconWrap: {
    marginTop: 2,
  },
  scanIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(245, 148, 58, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: -2,
  },
  scanIconActive: {
    backgroundColor: Colors.accent,
  },
});
