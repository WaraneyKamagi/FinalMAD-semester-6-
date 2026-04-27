import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "rgba(255, 255, 255, 0.98)",
          borderTopWidth: 0,
          height: 72,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 12,
          paddingHorizontal: 16,
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 16 + insets.bottom,
          borderRadius: 24,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        },
        tabBarActiveTintColor: "#FF7E00",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarLabelStyle: {
          fontWeight: "800",
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="calendar-clear-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="grocery"
        options={{
          title: "Grocery",
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="cart-outline" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons size={24} name="person-outline" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
