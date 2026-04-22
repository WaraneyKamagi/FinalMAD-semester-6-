import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import Animated, { FadeInDown, FadeIn, Layout, BounceIn, SlideInRight } from "react-native-reanimated";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { api } from "../../convex/_generated/api";
import { CURRENT_USER_ID } from "../index";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const todayStr = new Date().toISOString().split("T")[0];
  const userId = CURRENT_USER_ID as any;

  const tasks = useQuery(
    api.dashboard.getTodayTasks,
    userId ? { userId, date: todayStr } : "skip",
  );
  const notifications = useQuery(
    api.dashboard.getNotifications,
    userId ? { userId } : "skip",
  );
  const streak = useQuery(
    api.dashboard.getStreakStats,
    userId ? { userId } : "skip",
  );

  const generatePlan = useAction(api.gemini.generatePlan);
  const swapTask = useAction(api.gemini.swapTask);
  const toggleTask = useMutation(api.dashboard.toggleTaskCompletion);
  const markRead = useMutation(api.dashboard.markNotificationRead);

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [swappingTaskId, setSwappingTaskId] = useState<string | null>(null);
  const [goalPreview, setGoalPreview] = useState<{
    status: "idle" | "pending" | "safe" | "unsafe";
    prompt: string;
    message?: string;
  }>({
    status: "idle",
    prompt: "",
  });

  const doneCount = useMemo(
    () => (tasks ? tasks.filter((t: any) => t.completed).length : 0),
    [tasks],
  );
  const totalCount = tasks?.length ?? 0;
  const completion = totalCount === 0 ? 0 : doneCount / totalCount;

  const quickPrompts = [
    "I want to lose 2kg in 1 month",
    "Build a budget-friendly 7-day meal prep",
    "Improve morning energy and sleep quality",
  ];

  const handlePrompt = async () => {
    if (!prompt.trim() || !userId) return;
    setLoading(true);
    setGoalPreview({
      status: "pending",
      prompt: prompt.trim(),
    });
    try {
      await generatePlan({ userId, prompt: prompt.trim() });
      setGoalPreview({
        status: "safe",
        prompt: prompt.trim(),
        message:
          "Accepted. The plan is laid out as a weekly roadmap with balanced meals, workouts, and progress checks.",
      });
      setPrompt("");
    } catch (e) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Unknown error";
      if (message.toLowerCase().includes("too extreme")) {
        setGoalPreview({
          status: "unsafe",
          prompt: prompt.trim(),
          message:
            "This goal is too aggressive for a safe plan. The app will recommend a more gradual target and a recovery-friendly layout instead.",
        });
      } else {
        setGoalPreview({
          status: "unsafe",
          prompt: prompt.trim(),
          message,
        });
      }
      alert(`Failed to contact AI: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapTask = async (taskId: string) => {
    setSwappingTaskId(taskId);
    try {
      await swapTask({ taskId: taskId as any });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      alert(`Failed to swap task: ${message}`);
    } finally {
      setSwappingTaskId(null);
    }
  };

  const handleShareSchedule = async () => {
    if (!tasks || tasks.length === 0) {
      alert("No schedule is available to share yet.");
      return;
    }

    const text = tasks.map((t: any) => `${t.time} - ${t.title}`).join("\n");

    await Share.share({
      message: `Today's Nutrition & Workout Schedule\n\n${text}`,
      title: "Today's Schedule",
    });
  };

  if (!userId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerWrap}>
          <Ionicons name="lock-closed-outline" size={44} color="#34D399" />
          <Text style={styles.centerTitle}>Session is not active</Text>
          <Text style={styles.centerText}>
            Please sign in from the start screen before opening the dashboard.
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.primaryBtnText}>Back to Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgGlowTop} />
      <View style={styles.bgGlowBottom} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 140 },
          ]}
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headRow}>
            <View>
              <View style={styles.kickerPill}>
                <Text style={styles.kickerText}>Today</Text>
              </View>
              <Text style={styles.headTitle}>Today&apos;s Focus</Text>
              <Text style={styles.headDate}>{new Date().toDateString()}</Text>
              <Text style={styles.headGuide}>
                Recommended flow: complete tasks, review reminders, then ask AI
                for updates.
              </Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {doneCount}/{totalCount} done
              </Text>
            </View>
          </View>

          {goalPreview.status !== "idle" && (
            <View
              style={[
                styles.goalCard,
                goalPreview.status === "unsafe"
                  ? styles.goalCardUnsafe
                  : goalPreview.status === "safe"
                    ? styles.goalCardSafe
                    : styles.goalCardPending,
              ]}
            >
              <View style={styles.goalCardHead}>
                <View
                  style={[
                    styles.goalIconWrap,
                    goalPreview.status === "unsafe"
                      ? styles.goalIconUnsafe
                      : goalPreview.status === "safe"
                        ? styles.goalIconSafe
                        : styles.goalIconPending,
                  ]}
                >
                  <Ionicons
                    name={
                      goalPreview.status === "unsafe"
                        ? "warning-outline"
                        : goalPreview.status === "safe"
                          ? "checkmark-circle-outline"
                          : "sparkles-outline"
                    }
                    size={18}
                    color={
                      goalPreview.status === "unsafe"
                        ? "#B42318"
                        : goalPreview.status === "safe"
                          ? "#167E4D"
                          : "#B35F14"
                    }
                  />
                </View>
                <View style={styles.goalHeadCopy}>
                  <Text style={styles.goalTitle}>
                    {goalPreview.status === "unsafe"
                      ? "Unsafe Goal Layout"
                      : goalPreview.status === "safe"
                        ? "Safe Goal Layout"
                        : "Building Goal Layout"}
                  </Text>
                  <Text style={styles.goalSubtitle}>{goalPreview.prompt}</Text>
                </View>
              </View>

              <Text style={styles.goalBodyText}>
                {goalPreview.message ??
                  "Your plan will be structured into weekly progress, daily meals, workouts, and check-ins."}
              </Text>

              {goalPreview.status === "unsafe" ? (
                <View style={styles.goalList}>
                  <View style={styles.goalListItem}>
                    <Text style={styles.goalListBullet}>1</Text>
                    <Text style={styles.goalListText}>
                      Show a warning card instead of a full schedule.
                    </Text>
                  </View>
                  <View style={styles.goalListItem}>
                    <Text style={styles.goalListBullet}>2</Text>
                    <Text style={styles.goalListText}>
                      Offer a safer pacing target and a gentler weekly plan.
                    </Text>
                  </View>
                  <View style={styles.goalListItem}>
                    <Text style={styles.goalListBullet}>3</Text>
                    <Text style={styles.goalListText}>
                      Prompt the user to try again with a realistic goal.
                    </Text>
                  </View>
                </View>
              ) : goalPreview.status === "safe" ? (
                <View style={styles.goalGrid}>
                  <View style={styles.goalMiniCard}>
                    <Text style={styles.goalMiniLabel}>Weekly roadmap</Text>
                    <Text style={styles.goalMiniValue}>
                      7-day rotation with checkpoints
                    </Text>
                  </View>
                  <View style={styles.goalMiniCard}>
                    <Text style={styles.goalMiniLabel}>Meal layout</Text>
                    <Text style={styles.goalMiniValue}>
                      Breakfast, lunch, dinner, snack
                    </Text>
                  </View>
                  <View style={styles.goalMiniCard}>
                    <Text style={styles.goalMiniLabel}>Workout layout</Text>
                    <Text style={styles.goalMiniValue}>
                      Moderate sessions with recovery days
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.goalList}>
                  <View style={styles.goalListItem}>
                    <Text style={styles.goalListBullet}>1</Text>
                    <Text style={styles.goalListText}>
                      Validating your request and preparing the structure.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(8, completion * 100)}%` },
              ]}
            />
          </View>

          <View style={styles.streakRow}>
            <View style={styles.streakCard}>
              <View style={styles.iconBadgeWarm}>
                <Ionicons name="flame" size={16} color="#B85B0D" />
              </View>
              <Text style={styles.streakText}>
                Streak: {streak?.currentStreak ?? 0} days
              </Text>
            </View>
            <Pressable style={styles.syncBtn} onPress={handleShareSchedule}>
              <Ionicons name="share-social-outline" size={15} color="#B35F14" />
              <Text style={styles.syncBtnText}>Sync/Share</Text>
            </Pressable>
          </View>

          {!!streak?.badges?.length && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesRow}
            >
              {streak.badges.map((badge) => (
                <View key={badge} style={styles.badgeChip}>
                  <Ionicons name="ribbon-outline" size={12} color="#B35F14" />
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1) Action Plan</Text>
            <Text style={styles.sectionHint}>
              Start here. Tap each card to mark a task as completed.
            </Text>

            {tasks === undefined ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator color="#10B981" />
              </View>
            ) : tasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="leaf-outline" size={34} color="#1BAE73" />
                </View>
                <Text style={styles.emptyTitle}>No schedule yet</Text>
                <Text style={styles.emptyText}>
                  Use Ask AI Coach to generate your weekly meal and workout
                  plan.
                </Text>
                <Pressable
                  style={styles.emptyAction}
                  onPress={() => setPrompt(quickPrompts[0])}
                >
                  <Text style={styles.emptyActionText}>
                    Load an example prompt
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.taskList}>
                {tasks.map((task: any, index: number) => (
                  <Animated.View
                    key={task._id}
                    entering={FadeInDown.delay(index * 100).springify().damping(14)}
                    layout={Layout.springify().damping(16)}
                  >
                    <Pressable
                      onPress={() =>
                        toggleTask({
                          taskId: task._id,
                          completed: !task.completed,
                        })
                      }
                      style={({ pressed }) => [
                        styles.taskCard,
                        task.completed && styles.taskCardDone,
                        pressed && { transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      <View
                        style={[
                          styles.taskIconWrap,
                          task.type === "workout"
                            ? styles.workoutBg
                            : styles.mealBg,
                        ]}
                      >
                        <Ionicons
                          name={
                            task.type === "workout" ? "barbell" : "restaurant"
                          }
                          size={18}
                          color={task.type === "workout" ? "#FB923C" : "#34D399"}
                        />
                      </View>
                      <View style={styles.taskMain}>
                        <Text
                          style={[
                            styles.taskTitle,
                            task.completed && styles.taskTextDone,
                          ]}
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>
                        <Text style={styles.taskSub} numberOfLines={2}>
                          {task.time} • {task.description}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleSwapTask(task._id)}
                        style={styles.swapBtn}
                        disabled={swappingTaskId === task._id}
                      >
                        {swappingTaskId === task._id ? (
                          <ActivityIndicator size="small" color="#B35F14" />
                        ) : (
                          <Ionicons
                            name="shuffle-outline"
                            size={14}
                            color="#B35F14"
                          />
                        )}
                      </Pressable>
                      <View
                        style={[
                          styles.checkCircle,
                          task.completed && styles.checkCircleDone,
                        ]}
                      >
                        {task.completed ? (
                          <Animated.View entering={BounceIn}>
                            <Ionicons name="checkmark" size={14} color="#06231A" />
                          </Animated.View>
                        ) : null}
                      </View>
                    </Pressable>
                  </Animated.View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2) Reminders</Text>
            <Text style={styles.sectionHint}>
              Important alerts for today. Tap any card to mark it as read.
            </Text>
            {notifications && notifications.length > 0 ? (
              notifications.map((n: any, index: number) => (
                <Animated.View
                  key={n._id}
                  entering={SlideInRight.delay(index * 100).springify().damping(14)}
                  layout={Layout.springify()}
                >
                  <Pressable
                    onPress={() => markRead({ notificationId: n._id })}
                    style={({ pressed }) => [styles.notificationCard, pressed && { transform: [{ scale: 0.98 }] }]}
                  >
                    <Ionicons name="notifications" size={20} color="#38BDF8" />
                    <Text style={styles.notificationText}>{n.message}</Text>
                  </Pressable>
                </Animated.View>
              ))
            ) : (
              <Animated.View entering={FadeInDown} style={styles.emptyReminderCard}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color="#A18F7B"
                />
                <Text style={styles.emptyReminderText}>
                  No reminders yet. They will appear here when your schedule
                  includes alerts.
                </Text>
              </Animated.View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3) Ask AI Coach</Text>
            <Text style={styles.sectionHint}>
              Use this after reviewing today&apos;s progress for better AI
              suggestions.
            </Text>
            <Animated.View 
              style={styles.promptCard} 
              layout={Layout.springify()}
              entering={FadeInDown.delay(200)}
            >
              <TextInput
                style={styles.promptInput}
                placeholder="Example: Build a high-protein 7-day meal plan"
                placeholderTextColor="#6B7280"
                value={prompt}
                onChangeText={setPrompt}
                onSubmitEditing={handlePrompt}
              />
              <Pressable
                onPress={handlePrompt}
                disabled={loading || !prompt.trim()}
                style={({ pressed }) => [
                  styles.sendBtn,
                  (!prompt.trim() || loading) && styles.sendBtnDisabled,
                  pressed && { transform: [{ scale: 0.92 }] },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#ECFDF5" />
                ) : (
                  <Animated.View entering={BounceIn}>
                    <Ionicons name="sparkles" size={19} color="#FFFDF9" />
                  </Animated.View>
                )}
              </Pressable>
            </Animated.View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRow}
            >
              {quickPrompts.map((item, index) => (
                <Animated.View key={item} entering={SlideInRight.delay(index * 100)}>
                  <Pressable
                    style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}
                    onPress={() => setPrompt(item)}
                  >
                    <Text style={styles.quickChipText}>{item}</Text>
                  </Pressable>
                </Animated.View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF6F0",
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 18,
  },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  bgGlowTop: {
    position: "absolute",
    top: -70,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#FFE4C8",
    opacity: 0.55,
  },
  bgGlowBottom: {
    position: "absolute",
    left: -80,
    bottom: 90,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#DDF5E8",
    opacity: 0.45,
  },
  kickerPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF0E1",
    borderColor: "#F1D3B2",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 8,
  },
  kickerText: {
    color: "#B35F14",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headTitle: {
    color: "#201A16",
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  headDate: {
    color: "#866E5C",
    marginTop: 6,
    fontSize: 13,
  },
  headGuide: {
    color: "#6F6258",
    marginTop: 10,
    maxWidth: 280,
    lineHeight: 19,
    fontSize: 12,
  },
  pill: {
    backgroundColor: "#FFF8F0",
    borderWidth: 1,
    borderColor: "#EFCFA8",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    marginTop: 2,
  },
  pillText: {
    color: "#A85A12",
    fontWeight: "800",
    fontSize: 12,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#F0E4D8",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#F28C22",
    borderRadius: 999,
  },
  goalCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 14,
    gap: 12,
  },
  goalCardSafe: {
    backgroundColor: "#F2FBF6",
    borderColor: "#CBEBD8",
  },
  goalCardUnsafe: {
    backgroundColor: "#FFF5F5",
    borderColor: "#F4C7C7",
  },
  goalCardPending: {
    backgroundColor: "#FFF9F0",
    borderColor: "#F1D8BC",
  },
  goalCardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  goalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  goalIconSafe: {
    backgroundColor: "#DDF5E8",
  },
  goalIconUnsafe: {
    backgroundColor: "#FCE4E4",
  },
  goalIconPending: {
    backgroundColor: "#FFF0E1",
  },
  goalHeadCopy: {
    flex: 1,
    gap: 2,
  },
  goalTitle: {
    color: "#201A16",
    fontSize: 16,
    fontWeight: "900",
  },
  goalSubtitle: {
    color: "#7A6A5B",
    fontSize: 12,
    lineHeight: 17,
  },
  goalBodyText: {
    color: "#5D5148",
    fontSize: 13,
    lineHeight: 19,
  },
  goalList: {
    gap: 8,
  },
  goalListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  goalListBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#FFFDF9",
    color: "#B35F14",
    fontWeight: "900",
    fontSize: 12,
    overflow: "hidden",
  },
  goalListText: {
    flex: 1,
    color: "#5D5148",
    fontSize: 13,
    lineHeight: 19,
  },
  goalGrid: {
    gap: 8,
  },
  goalMiniCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  goalMiniLabel: {
    color: "#8A4A0E",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  goalMiniValue: {
    color: "#201A16",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  streakRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  streakCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF9F3",
    borderColor: "#F1D8BC",
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  streakText: {
    color: "#8A4A0E",
    fontWeight: "800",
    fontSize: 13,
  },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFF9F3",
    borderColor: "#EFD8C0",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  syncBtnText: {
    color: "#9C5614",
    fontWeight: "800",
    fontSize: 12,
  },
  badgesRow: {
    gap: 8,
    paddingRight: 16,
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF3E6",
    borderColor: "#F2D5B5",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: "#A55511",
    fontSize: 11,
    fontWeight: "700",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: "#201A16",
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  sectionHint: {
    color: "#7A6A5B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
  },
  notificationCard: {
    backgroundColor: "#FFFDF9",
    borderWidth: 1,
    borderColor: "#ECDAC3",
    padding: 14,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  notificationText: {
    color: "#4A4037",
    flex: 1,
    fontSize: 13,
  },
  emptyReminderCard: {
    backgroundColor: "#FFFDF9",
    borderWidth: 1,
    borderColor: "#EADBCB",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  emptyReminderText: {
    color: "#756455",
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  promptCard: {
    backgroundColor: "#FFFCF8",
    borderWidth: 1,
    borderColor: "#EAD7BF",
    borderRadius: 18,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  promptInput: {
    flex: 1,
    color: "#2D2620",
    minHeight: 46,
    paddingHorizontal: 12,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F28C22",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#B35F14",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  quickRow: {
    gap: 8,
    paddingRight: 18,
  },
  quickChip: {
    backgroundColor: "#FFFDF9",
    borderWidth: 1,
    borderColor: "#E9D5C0",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickChipText: {
    color: "#9A560F",
    fontSize: 12,
    fontWeight: "700",
  },
  loaderBox: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    backgroundColor: "#FFFDF9",
    borderColor: "#ECD8C1",
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  emptyIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF7EF",
  },
  emptyTitle: {
    color: "#7D420B",
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: "#7C6651",
    textAlign: "center",
    lineHeight: 20,
    fontSize: 13,
  },
  emptyAction: {
    marginTop: 4,
    backgroundColor: "#FFE9D2",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyActionText: {
    color: "#9B5310",
    fontWeight: "800",
    fontSize: 12,
  },
  taskList: {
    gap: 10,
  },
  taskCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EADBCB",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.035,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  taskCardDone: {
    opacity: 0.72,
    backgroundColor: "#FBFBFB",
  },
  taskIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  workoutBg: {
    backgroundColor: "#FFEFE0",
  },
  mealBg: {
    backgroundColor: "#EAF7EF",
  },
  taskMain: {
    flex: 1,
  },
  taskTitle: {
    color: "#201A16",
    fontWeight: "800",
    fontSize: 15,
  },
  taskSub: {
    color: "#857162",
    marginTop: 3,
    fontSize: 12,
  },
  taskTextDone: {
    textDecorationLine: "line-through",
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#D9C7B5",
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEDCC8",
    backgroundColor: "#FFF8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleDone: {
    backgroundColor: "#F3C37C",
    borderColor: "#F3C37C",
    alignItems: "center",
    justifyContent: "center",
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  centerTitle: {
    color: "#201A16",
    fontSize: 20,
    fontWeight: "800",
  },
  centerText: {
    color: "#7A6A5B",
    textAlign: "center",
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: "#F28C22",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: "#FFFDF9",
    fontWeight: "800",
  },
});
