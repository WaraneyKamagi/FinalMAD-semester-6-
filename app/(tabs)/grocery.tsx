import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import Animated, { FadeInDown, SlideInRight, Layout, FadeIn } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { CURRENT_USER_ID } from "../index";

export default function GroceryScreen() {
  const insets = useSafeAreaInsets();
  const userId = CURRENT_USER_ID as any;
  const groceryList = useQuery(
    api.dashboard.getGroceryList,
    userId ? { userId } : "skip",
  );
  const toggleItem = useMutation(api.dashboard.toggleGroceryItem);
  const recipes = useQuery(
    api.dashboard.getWeeklyRecipes,
    userId ? { userId } : "skip",
  );
  const generateRecipes = useAction(api.gemini.generateWeeklyRecipes);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [openRecipeIndex, setOpenRecipeIndex] = useState<number | null>(null);

  const handleToggle = (listId: any, idx: number, current: boolean) => {
    toggleItem({ listId, itemIndex: idx, purchased: !current });
  };

  const handleGenerateRecipes = async () => {
    setLoadingRecipes(true);
    try {
      await generateRecipes({ userId });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      alert(`Failed to generate recipes: ${message}`);
    } finally {
      setLoadingRecipes(false);
    }
  };

  if (!userId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="person-circle-outline" size={48} color="#34D399" />
          <Text style={styles.centerTitle}>
            Please log in to view your grocery list
          </Text>
          <Pressable style={styles.goBtn} onPress={() => router.replace("/")}>
            <Text style={styles.goBtnText}>Back to Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (groceryList === undefined) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.muted}>Loading groceries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!groceryList || groceryList.items.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="cart-outline" size={56} color="#6EE7B7" />
          <Text style={styles.centerTitle}>No grocery list yet</Text>
          <Text style={styles.mutedCenter}>
            Generate your plan in the Today tab to auto-create a grocery list.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const purchasedCount = groceryList.items.filter(
    (item: any) => item.purchased,
  ).length;
  const progressPct = Math.round(
    (purchasedCount / groceryList.items.length) * 100,
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgBlobOne} />
      <View style={styles.bgBlobTwo} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 140 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.title}>Smart Grocery</Text>
              <Text style={styles.subtitle}>
                A cleaner shopping flow for the week
              </Text>
            </View>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{progressPct}%</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>Week of {groceryList.weekStart}</Text>
          <Text style={styles.guideText}>
            Flow: review shopping progress, open recipes if needed, then check
            off purchased items.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            {purchasedCount}/{groceryList.items.length} items done
          </Text>
          <Text style={styles.summaryPct}>{progressPct}%</Text>
        </View>

        <View style={styles.recipeHeader}>
          <Text style={styles.recipeTitle}>2) Recipe Mode</Text>
          <Pressable style={styles.recipeBtn} onPress={handleGenerateRecipes}>
            {loadingRecipes ? (
              <Ionicons name="hourglass-outline" size={14} color="#FFFDF9" />
            ) : (
              <Ionicons name="sparkles-outline" size={14} color="#FFFDF9" />
            )}
            <Text style={styles.recipeBtnText}>
              {loadingRecipes ? "Generating..." : "Generate"}
            </Text>
          </Pressable>
        </View>

        {!!recipes?.recipes?.length && (
          <View style={styles.recipeList}>
            {recipes.recipes.map((recipe: any, idx: number) => {
              const isOpen = openRecipeIndex === idx;
              return (
                <Animated.View
                  key={`${recipe.title}-${idx}`}
                  entering={FadeInDown.delay(idx * 100).springify().damping(14)}
                  layout={Layout.springify()}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.recipeCard,
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                    onPress={() => setOpenRecipeIndex(isOpen ? null : idx)}
                  >
                    <View style={styles.recipeCardHead}>
                      <Text style={styles.recipeCardTitle}>{recipe.title}</Text>
                      <Ionicons
                        name={isOpen ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#A55511"
                      />
                    </View>
                    <Text style={styles.recipeMeta}>
                      {recipe.prepMins ?? "?"} mins • {recipe.calories ?? "?"}{" "}
                      kcal
                    </Text>
                    {isOpen && (
                      <Animated.View entering={FadeIn} style={styles.recipeBody}>
                        <Text style={styles.recipeSection}>Ingredients</Text>
                        {recipe.ingredients?.map((item: string, i: number) => (
                          <Text key={`${item}-${i}`} style={styles.recipeLine}>
                            • {item}
                          </Text>
                        ))}
                        <Text style={styles.recipeSection}>Steps</Text>
                        {recipe.steps?.map((step: string, i: number) => (
                          <Text key={`${step}-${i}`} style={styles.recipeLine}>
                            {i + 1}. {step}
                          </Text>
                        ))}
                      </Animated.View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}

        <View style={styles.list}>
          <Text style={styles.listTitle}>3) Shopping Checklist</Text>
          {groceryList.items.map((item: any, idx: number) => (
            <Animated.View
              key={`${item.name}-${idx}`}
              entering={SlideInRight.delay(idx * 80).springify().damping(16)}
              layout={Layout.springify().damping(20)}
            >
              <Pressable
                onPress={() => handleToggle(groceryList._id, idx, item.purchased)}
                style={({ pressed }) => [
                  styles.itemCard,
                  item.purchased && styles.itemCardDone,
                  pressed && { transform: [{ scale: 0.98 }] }
                ]}
              >
                <View style={styles.itemLeft}>
                  <View
                    style={[
                      styles.itemIcon,
                      item.purchased && styles.itemIconDone,
                    ]}
                  >
                    <Ionicons
                      name={item.purchased ? "checkmark" : "nutrition-outline"}
                      size={16}
                      color={item.purchased ? "#052E24" : "#34D399"}
                    />
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.itemTitle,
                        item.purchased && styles.itemTitleDone,
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text style={styles.itemMeta}>
                      {item.amount} • {item.category}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF6F0",
  },
  container: {
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  scroll: {
    flex: 1,
  },
  bgBlobOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#FFE7CC",
    top: -100,
    right: -70,
    opacity: 0.6,
  },
  bgBlobTwo: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#DDF5E8",
    bottom: 120,
    left: -80,
    opacity: 0.45,
  },
  headerCard: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "#EADBCB",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  centerTitle: {
    color: "#2D2620",
    fontWeight: "700",
    fontSize: 20,
    textAlign: "center",
  },
  mutedCenter: {
    color: "#8A7968",
    textAlign: "center",
    lineHeight: 20,
  },
  muted: {
    color: "#8A7968",
  },
  goBtn: {
    marginTop: 8,
    backgroundColor: "#E87D1A",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  goBtnText: {
    color: "#FFFDF9",
    fontWeight: "700",
  },
  title: {
    color: "#201A16",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: "#7D6A59",
    marginTop: 4,
    marginBottom: 0,
    fontSize: 13,
  },
  guideText: {
    color: "#6F6258",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  headerBadge: {
    minWidth: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#FFF0E1",
    borderWidth: 1,
    borderColor: "#EECDA8",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeText: {
    color: "#A55511",
    fontWeight: "900",
    fontSize: 18,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EADBCB",
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  summaryText: {
    color: "#8D4B0F",
    fontWeight: "800",
  },
  summaryPct: {
    color: "#B35F14",
    fontSize: 20,
    fontWeight: "900",
  },
  recipeHeader: {
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recipeTitle: {
    color: "#201A16",
    fontSize: 16,
    fontWeight: "900",
  },
  recipeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F28C22",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  recipeBtnText: {
    color: "#FFFDF9",
    fontWeight: "800",
    fontSize: 12,
  },
  recipeList: {
    gap: 8,
    marginBottom: 12,
  },
  recipeCard: {
    backgroundColor: "#FFFDF9",
    borderColor: "#EADBCB",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  recipeCardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  recipeCardTitle: {
    color: "#2D2620",
    fontWeight: "700",
    flex: 1,
  },
  recipeMeta: {
    color: "#8A7968",
    marginTop: 2,
    fontSize: 12,
  },
  recipeBody: {
    marginTop: 8,
    gap: 4,
  },
  recipeSection: {
    color: "#A55511",
    fontWeight: "700",
    marginTop: 4,
    fontSize: 12,
  },
  recipeLine: {
    color: "#5A4D42",
    fontSize: 12,
    lineHeight: 18,
  },
  list: {
    gap: 10,
    paddingBottom: 20,
  },
  listTitle: {
    color: "#201A16",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 2,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#EADBCB",
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
  },
  itemCardDone: {
    opacity: 0.6,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#EAF7EF",
    alignItems: "center",
    justifyContent: "center",
  },
  itemIconDone: {
    backgroundColor: "#F3C37C",
  },
  itemTitle: {
    color: "#201A16",
    fontWeight: "800",
    fontSize: 15,
  },
  itemTitleDone: {
    textDecorationLine: "line-through",
  },
  itemMeta: {
    color: "#857162",
    marginTop: 1,
    fontSize: 12,
  },
});
