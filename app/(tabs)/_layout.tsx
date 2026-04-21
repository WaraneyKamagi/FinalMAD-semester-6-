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
          backgroundColor: "rgba(255, 251, 246, 0.96)",
          borderTopWidth: 0,
          height: 70,
          paddingBottom: 10 + insets.bottom,
          paddingTop: 10,
          paddingHorizontal: 14,
          position: "absolute",
          left: 10,
          right: 10,
          bottom: 10 + insets.bottom,
          borderRadius: 22,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        },
        tabBarActiveTintColor: "#F28C22",
        tabBarInactiveTintColor: "#A18F7B",
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
