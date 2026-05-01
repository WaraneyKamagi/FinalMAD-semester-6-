import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInRight,
  Layout,
} from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { CURRENT_USER_ID } from "../index";

// GAP 3: Category config — mirrors physical supermarket section layout (Journal Sec 3.6)
const CATEGORY_ORDER = ["Protein", "Vegetables", "Grains", "Dairy", "Other"];
const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  Protein:    { icon: "fish-outline",       color: "#DC2626", bg: "#FEE2E2" },
  Vegetables: { icon: "leaf-outline",       color: "#16A34A", bg: "#DCFCE7" },
  Grains:     { icon: "cafe-outline",       color: "#B45309", bg: "#FEF3C7" },
  Dairy:      { icon: "water-outline",      color: "#2563EB", bg: "#DBEAFE" },
  Other:      { icon: "grid-outline",       color: "#7C3AED", bg: "#EDE9FE" },
};

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

  // All-done popup — fires once per session when every item is purchased
  const [showAllDoneModal, setShowAllDoneModal] = useState(false);
  const hasShownDoneModal = useRef(false);

  // GAP 3: useMemo MUST be at top level before any early returns (Rules of Hooks)
  const groupedItems = useMemo(() => {
    const items: any[] = groceryList?.items ?? [];
    const map: Record<string, { item: any; originalIndex: number }[]> = {};
    items.forEach((item: any, idx: number) => {
      const cat = CATEGORY_ORDER.includes(item.category) ? item.category : "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push({ item, originalIndex: idx });
    });
    return CATEGORY_ORDER
      .filter((cat) => map[cat]?.length > 0)
      .map((cat) => ({ category: cat, entries: map[cat] }));
  }, [groceryList?.items]);

  // Trigger the all-done modal once per session
  const purchasedForEffect = groceryList?.items?.filter((i: any) => i.purchased).length ?? 0;
  const totalForEffect = groceryList?.items?.length ?? 0;
  useEffect(() => {
    if (
      totalForEffect > 0 &&
      purchasedForEffect === totalForEffect &&
      !hasShownDoneModal.current
    ) {
      hasShownDoneModal.current = true;
      setShowAllDoneModal(true);
    }
  }, [purchasedForEffect, totalForEffect]);

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
            <View style={styles.headerTitleWrap}>
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

        {/* GAP 3: Grouped Shopping Checklist by supermarket category (Journal Sec 3.6) */}
        <View style={styles.list}>
          <Text style={styles.listTitle}>3) Shopping Checklist</Text>
          {groupedItems.map(({ category, entries }, groupIdx) => {
            const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG["Other"];
            const categoryDoneCount = entries.filter(e => e.item.purchased).length;
            return (
              <Animated.View
                key={category}
                entering={FadeInDown.delay(groupIdx * 120).springify().damping(14)}
              >
                {/* Section Header */}
                <View style={styles.categoryHeader}>
                  <View style={[styles.categoryIconWrap, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                  </View>
                  <Text style={[styles.categoryLabel, { color: cfg.color }]}>
                    {category}
                  </Text>
                  <Text style={styles.categoryCount}>
                    {categoryDoneCount}/{entries.length}
                  </Text>
                </View>

                {/* Items in this category */}
                <View style={styles.categoryItems}>
                  {entries.map(({ item, originalIndex }, itemIdx) => (
                    <Animated.View
                      key={`${item.name}-${originalIndex}`}
                      entering={SlideInRight.delay((groupIdx * 60) + (itemIdx * 60)).springify().damping(16)}
                      layout={Layout.springify().damping(20)}
                    >
                      <Pressable
                        onPress={() => handleToggle(groceryList._id, originalIndex, item.purchased)}
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
                              item.purchased
                                ? styles.itemIconDone
                                : { backgroundColor: cfg.bg },
                            ]}
                          >
                            <Ionicons
                              name={item.purchased ? "checkmark" : cfg.icon as any}
                              size={16}
                              color={item.purchased ? "#052E24" : cfg.color}
                            />
                          </View>
                          <View style={styles.itemTextWrap}>
                            <Text
                              style={[
                                styles.itemTitle,
                                item.purchased && styles.itemTitleDone,
                              ]}
                            >
                              {item.name}
                            </Text>
                            <Text style={styles.itemMeta}>{item.amount}</Text>
                          </View>
                        </View>
                        <View style={[styles.itemCheckBox, item.purchased && styles.itemCheckBoxDone]}>
                          {item.purchased && (
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          )}
                        </View>
                      </Pressable>
                    </Animated.View>
                  ))}
                </View>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={showAllDoneModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowAllDoneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.modalCard}>
            <View style={styles.modalBlobTL} />
            <View style={styles.modalBlobBR} />

            <View style={styles.modalIconWrap}>
              <Text style={styles.modalEmoji}>🛒✅</Text>
            </View>

            <Text style={styles.modalTitle}>Semua Bahan Sudah Dibeli!</Text>
            <Text style={styles.modalSubtitle}>
              Luar biasa! Kamu sudah menyelesaikan seluruh{"\n"}daftar belanja minggu ini.
            </Text>

            <View style={styles.modalDivider} />

            <Text style={styles.modalHint}>
              Siap masak? Cek resep minggu ini di atas 👆
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.modalCloseBtn,
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
              onPress={() => setShowAllDoneModal(false)}
            >
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.modalCloseBtnText}>Tutup</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  scroll: {
    flex: 1,
  },
  bgBlobOne: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "#FFEBE0",
    top: -100,
    right: -80,
    opacity: 0.6,
  },
  bgBlobTwo: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#E0F2E9",
    bottom: 120,
    left: -80,
    opacity: 0.4,
  },
  headerCard: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderWidth: 0,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitleWrap: {
    flex: 1,
    flexShrink: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  centerTitle: {
    color: "#1F2937",
    fontWeight: "900",
    fontSize: 22,
    textAlign: "center",
  },
  mutedCenter: {
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    fontSize: 15,
  },
  muted: {
    color: "#6B7280",
  },
  goBtn: {
    marginTop: 12,
    backgroundColor: "#FF7E00",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: "#FF7E00",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  goBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  title: {
    color: "#1F2937",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#4B5563",
    marginTop: 4,
    marginBottom: 0,
    fontSize: 14,
  },
  guideText: {
    color: "#374151",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
  },
  headerBadge: {
    minWidth: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#FFF3EB",
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeText: {
    color: "#FF7E00",
    fontWeight: "900",
    fontSize: 20,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  summaryText: {
    color: "#1F2937",
    fontWeight: "900",
    fontSize: 15,
  },
  summaryPct: {
    color: "#FF7E00",
    fontSize: 22,
    fontWeight: "900",
  },
  recipeHeader: {
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  recipeTitle: {
    color: "#1F2937",
    fontSize: 18,
    fontWeight: "900",
  },
  recipeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FF7E00",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#FF7E00",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  recipeBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  recipeList: {
    gap: 12,
    marginBottom: 16,
  },
  recipeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  recipeCardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  recipeCardTitle: {
    color: "#1F2937",
    fontWeight: "800",
    fontSize: 16,
    flex: 1,
  },
  recipeMeta: {
    color: "#6B7280",
    marginTop: 4,
    fontSize: 13,
  },
  recipeBody: {
    marginTop: 10,
    gap: 6,
  },
  recipeSection: {
    color: "#FF7E00",
    fontWeight: "800",
    marginTop: 6,
    fontSize: 13,
  },
  recipeLine: {
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 20,
  },
  list: {
    gap: 16,
    paddingBottom: 24,
  },
  listTitle: {
    color: "#1F2937",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 8,
  },
  // GAP 3: Category grouping styles
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    marginTop: 4,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  categoryCount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  categoryItems: {
    gap: 10,
    marginBottom: 8,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  itemCardDone: {
    opacity: 0.6,
    backgroundColor: "#F9FAFB",
    shadowOpacity: 0,
    elevation: 0,
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  itemTextWrap: {
    flex: 1,
    flexShrink: 1,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  itemIconDone: {
    backgroundColor: "#10B981",
  },
  itemTitle: {
    color: "#1F2937",
    fontWeight: "700",
    fontSize: 15,
  },
  itemTitleDone: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  itemMeta: {
    color: "#9CA3AF",
    marginTop: 2,
    fontSize: 12,
  },
  itemCheckBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  itemCheckBoxDone: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },

  // ─── All-Done Modal Styles ──────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingHorizontal: 28,
    paddingVertical: 36,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },
  modalBlobTL: {
    position: "absolute",
    top: -60,
    left: -60,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#FFF3EB",
    opacity: 0.8,
  },
  modalBlobBR: {
    position: "absolute",
    bottom: -50,
    right: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#E0F2E9",
    opacity: 0.7,
  },
  modalIconWrap: {
    marginBottom: 16,
  },
  modalEmoji: {
    fontSize: 52,
    textAlign: "center",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1F2937",
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  modalDivider: {
    width: 48,
    height: 3,
    borderRadius: 99,
    backgroundColor: "#FF7E00",
    marginBottom: 16,
    opacity: 0.5,
  },
  modalHint: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  modalCloseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FF7E00",
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    shadowColor: "#FF7E00",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modalCloseBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
});
