import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Animated, { FadeInDown, SlideInRight, Layout, FadeIn } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { CURRENT_USER_ID } from "../index";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const userId = CURRENT_USER_ID as any;
  const user = useQuery(api.users.getUser, userId ? { userId } : "skip");
  const updateWeightMutation = useMutation(api.users.updateWeight);
  const updateReminderLeadMins = useMutation(api.users.updateReminderLeadMins);
  const generatePlan = useAction(api.gemini.generatePlan);
  const streak = useQuery(
    api.dashboard.getStreakStats,
    userId ? { userId } : "skip",
  );

  const [newWeight, setNewWeight] = useState("");
  const [reminderLead, setReminderLead] = useState("20");
  const [loading, setLoading] = useState(false);

  const handleEvaluation = async () => {
    if (!newWeight || !user) return;
    setLoading(true);
    try {
      const numWeight = parseFloat(newWeight);
      await updateWeightMutation({ userId: user._id, newWeight: numWeight });
      await generatePlan({
        userId: user._id,
        prompt: `My new weight is ${numWeight}kg. Please adjust my meal and workout plan to keep me progressing towards my goal.`,
      });
      setNewWeight("");
      alert("Plan updated using your latest weight progress.");
    } catch (e) {
      console.error(e);
      alert("Failed to adjust your plan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof user?.reminderLeadMins === "number") {
      setReminderLead(String(user.reminderLeadMins));
    }
  }, [user?.reminderLeadMins]);

  const handleReminderSave = async () => {
    if (!user) return;
    const mins = parseInt(reminderLead, 10);
    if (Number.isNaN(mins)) {
      alert("Enter a valid reminder lead time in minutes.");
      return;
    }
    try {
      await updateReminderLeadMins({
        userId: user._id,
        reminderLeadMins: mins,
      });
      alert("Reminder settings updated.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      alert(`Failed to update reminder: ${message}`);
    }
  };

  if (!userId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="person-circle-outline" size={48} color="#34D399" />
          <Text style={styles.centerTitle}>
            Please log in to access profile
          </Text>
          <Pressable
            style={styles.actionBtn}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.actionBtnText}>Back to Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (user === undefined) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.centerTitle}>User data was not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgBlobOne} />
      <View style={styles.bgBlobTwo} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 140 },
        ]}
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={styles.profileRow} entering={FadeInDown.delay(100)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.meta}>Current weight: {user.weight} kg</Text>
            <Text style={styles.meta}>Height: {user.height} cm</Text>
            {typeof user.age === "number" && (
              <Text style={styles.meta}>Age: {user.age} years</Text>
            )}
          </View>
        </Animated.View>

        <Text style={styles.pageGuide}>
          Recommended flow: update weekly progress, tune reminders, then review
          badges and tips.
        </Text>

        <Animated.View style={styles.card} entering={FadeInDown.delay(200)}>
          <View style={styles.cardHead}>
            <Ionicons name="pulse" size={20} color="#34D399" />
            <Text style={styles.cardTitle}>1) Weekly Check-in</Text>
          </View>

          <Text style={styles.cardDesc}>
            Update your weight, then AI will recalibrate next week&apos;s meal
            and workout plan so it stays realistic and progressive.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your new weight (kg)"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
            value={newWeight}
            onChangeText={setNewWeight}
          />

          <Pressable
            onPress={handleEvaluation}
            disabled={loading || !newWeight}
            style={({ pressed }) => [
              styles.actionBtn,
              (!newWeight || loading) && styles.actionBtnDisabled,
              pressed && { transform: [{ scale: 0.95 }] },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#ECFDF5" />
            ) : (
              <Text style={styles.actionBtnText}>Recalibrate Plan</Text>
            )}
          </Pressable>
        </Animated.View>

        <Animated.View style={styles.card} entering={FadeInDown.delay(300)}>
          <View style={styles.cardHead}>
            <Ionicons name="notifications-outline" size={20} color="#E87D1A" />
            <Text style={styles.cardTitle}>2) Smart Reminder</Text>
          </View>
          <Text style={styles.cardDesc}>
            Set how many minutes before schedule time your reminder should be
            sent.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Example: 20"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
            value={reminderLead}
            onChangeText={setReminderLead}
          />
          <Pressable 
            onPress={handleReminderSave} 
            style={({ pressed }) => [styles.actionBtn, pressed && { transform: [{ scale: 0.95 }] }]}
          >
            <Text style={styles.actionBtnText}>Save Reminder</Text>
          </Pressable>
        </Animated.View>

        {!!streak?.badges?.length && (
          <Animated.View style={styles.badgesCard} entering={FadeInDown.delay(400)}>
            <Text style={styles.badgesTitle}>3) Your Badges</Text>
            <View style={styles.badgesWrap}>
              {streak.badges.map((badge) => (
                <View key={badge} style={styles.badgeChip}>
                  <Ionicons name="ribbon-outline" size={12} color="#A55511" />
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View style={styles.tipsCard} entering={FadeInDown.delay(500)}>
          <Text style={styles.tipsTitle}>4) This Week&apos;s Tips</Text>
          <Text style={styles.tipText}>
            • Prioritize protein in every meal.
          </Text>
          <Text style={styles.tipText}>
            • Drink 2-3 liters of water daily for recovery.
          </Text>
          <Text style={styles.tipText}>
            • Keep sleep consistent to stabilize appetite.
          </Text>
        </Animated.View>
      </ScrollView>
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
    paddingBottom: 32,
    gap: 16,
  },
  scroll: {
    flex: 1,
  },
  bgBlobOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#FFEBE0",
    top: -80,
    right: -70,
    opacity: 0.6,
  },
  bgBlobTwo: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#E0F2E9",
    bottom: 70,
    left: -60,
    opacity: 0.4,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  centerTitle: {
    color: "#1F2937",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  pageGuide: {
    color: "#4B5563",
    fontSize: 13,
    lineHeight: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: "#FFF3EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF7E00",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  avatarText: {
    color: "#FF7E00",
    fontSize: 28,
    fontWeight: "900",
  },
  profileMeta: {
    gap: 2,
  },
  name: {
    color: "#1F2937",
    fontSize: 26,
    fontWeight: "900",
  },
  meta: {
    color: "#6B7280",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    color: "#1F2937",
    fontWeight: "900",
    fontSize: 18,
  },
  cardDesc: {
    color: "#4B5563",
    lineHeight: 22,
    fontSize: 14,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    color: "#1F2937",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  actionBtn: {
    backgroundColor: "#FF7E00",
    borderRadius: 16,
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 4,
    shadowColor: "#FF7E00",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  actionBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  actionBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  tipsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  badgesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  badgesTitle: {
    color: "#1F2937",
    fontSize: 18,
    fontWeight: "900",
  },
  badgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#FF7E00",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  badgeText: {
    color: "#FF7E00",
    fontSize: 12,
    fontWeight: "800",
  },
  tipsTitle: {
    color: "#1F2937",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  tipText: {
    color: "#4B5563",
    lineHeight: 22,
    fontSize: 14,
  },
});
