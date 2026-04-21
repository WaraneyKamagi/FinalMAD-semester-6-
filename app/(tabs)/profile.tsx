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
        <View style={styles.profileRow}>
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
        </View>

        <Text style={styles.pageGuide}>
          Recommended flow: update weekly progress, tune reminders, then review
          badges and tips.
        </Text>

        <View style={styles.card}>
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
            style={[
              styles.actionBtn,
              (!newWeight || loading) && styles.actionBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#ECFDF5" />
            ) : (
              <Text style={styles.actionBtnText}>Recalibrate Plan</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
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
          <Pressable onPress={handleReminderSave} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Save Reminder</Text>
          </Pressable>
        </View>

        {!!streak?.badges?.length && (
          <View style={styles.badgesCard}>
            <Text style={styles.badgesTitle}>3) Your Badges</Text>
            <View style={styles.badgesWrap}>
              {streak.badges.map((badge) => (
                <View key={badge} style={styles.badgeChip}>
                  <Ionicons name="ribbon-outline" size={12} color="#A55511" />
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.tipsCard}>
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
    paddingBottom: 26,
    gap: 14,
  },
  scroll: {
    flex: 1,
  },
  bgBlobOne: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#FFE7CC",
    top: -80,
    right: -70,
    opacity: 0.55,
  },
  bgBlobTwo: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: "#DDF5E8",
    bottom: 70,
    left: -60,
    opacity: 0.45,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  centerTitle: {
    color: "#2D2620",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  pageGuide: {
    color: "#6F6258",
    fontSize: 12,
    lineHeight: 18,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: "#FFF0E1",
    borderWidth: 1,
    borderColor: "#EBCDA8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  avatarText: {
    color: "#AF5A13",
    fontSize: 25,
    fontWeight: "900",
  },
  profileMeta: {
    gap: 1,
  },
  name: {
    color: "#201A16",
    fontSize: 24,
    fontWeight: "900",
  },
  meta: {
    color: "#857162",
    fontSize: 13,
  },
  card: {
    backgroundColor: "#FFFDF9",
    borderWidth: 1,
    borderColor: "#EADBCB",
    borderRadius: 18,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    color: "#201A16",
    fontWeight: "900",
    fontSize: 18,
  },
  cardDesc: {
    color: "#756455",
    lineHeight: 20,
    fontSize: 13,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5D5C3",
    borderWidth: 1,
    borderRadius: 14,
    color: "#201A16",
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
  },
  actionBtn: {
    backgroundColor: "#F28C22",
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 12,
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  actionBtnText: {
    color: "#FFFDF9",
    fontWeight: "700",
  },
  tipsCard: {
    backgroundColor: "#FFFDF9",
    borderColor: "#EADBCB",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  badgesCard: {
    backgroundColor: "#FFFDF9",
    borderColor: "#EADBCB",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  badgesTitle: {
    color: "#201A16",
    fontSize: 16,
    fontWeight: "900",
  },
  badgesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF4E8",
    borderColor: "#F2D5B5",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#9A560F",
    fontSize: 11,
    fontWeight: "800",
  },
  tipsTitle: {
    color: "#201A16",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  tipText: {
    color: "#756455",
    lineHeight: 20,
    fontSize: 13,
  },
});
