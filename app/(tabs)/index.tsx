import { Ionicons } from "@expo/vector-icons";
import { useAction, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import Animated, { FadeInDown, FadeIn, Layout, BounceIn, SlideInRight } from "react-native-reanimated";
import OffTopicModal from "../../components/OffTopicModal";
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
  const [offTopicVisible, setOffTopicVisible] = useState(false);
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

      // Off-topic → show the premium modal, reset card to idle
      if (
        message.includes("hanya dapat membantu") ||
        message.toLowerCase().includes("off-topic") ||
        message.toLowerCase().includes("topik")
      ) {
        setGoalPreview({ status: "idle", prompt: "" });
        setOffTopicVisible(true);
        return;
      }

      // Too extreme / unsafe goal
      if (message.toLowerCase().includes("too extreme")) {
        setGoalPreview({
          status: "unsafe",
          prompt: prompt.trim(),
          message:
            "This goal is too aggressive for a safe plan. The app will recommend a more gradual target and a recovery-friendly layout instead.",
        });
        return;
      }

      // Generic API / network errors
      setGoalPreview({
        status: "unsafe",
        prompt: prompt.trim(),
        message: `Something went wrong: ${message}`,
      });
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
      {/* ── Off-topic Error Modal ── */}
      <OffTopicModal
        visible={offTopicVisible}
        onClose={() => setOffTopicVisible(false)}
      />

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
            <View style={styles.headLeft}>
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
            {/* GAP 6: Display both currentStreak AND bestStreak (Journal Sec 3.9) */}
            <View style={styles.streakCard}>
              <View style={styles.iconBadgeWarm}>
                <Ionicons name="flame" size={16} color="#B85B0D" />
              </View>
              <View style={styles.streakInfo}>
                <Text style={styles.streakText}>
                  {streak?.currentStreak ?? 0} day streak
                </Text>
                <Text style={styles.streakBest}>
                  Best: {streak?.bestStreak ?? 0} days
                </Text>
              </View>
            </View>
            <Pressable style={styles.syncBtn} onPress={handleShareSchedule}>
              <Ionicons name="share-social-outline" size={15} color="#B35F14" />
              <Text style={styles.syncBtnText}>Share</Text>
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
                        >
                          {task.title}
                        </Text>
                        <Text style={styles.taskSub}>
                          {task.time} • {task.description}
                        </Text>
                        {/* GAP 5: Calorie/duration annotation badge (Journal Sec 3.5) */}
                        {task.type === "meal" && typeof task.calories === "number" && (
                          <View style={styles.annotationBadge}>
                            <Text style={styles.annotationText}>🔥 {task.calories} kcal</Text>
                          </View>
                        )}
                        {task.type === "workout" && typeof task.durationMins === "number" && (
                          <View style={[styles.annotationBadge, styles.annotationBadgeWorkout]}>
                            <Text style={[styles.annotationText, styles.annotationTextWorkout]}>⏱ {task.durationMins} min</Text>
                          </View>
                        )}
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
    backgroundColor: "#FAF9F6",
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 20,
  },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headLeft: {
    flex: 1,
    flexShrink: 1,
  },
  bgGlowTop: {
    position: "absolute",
    top: -70,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#FFEBE0",
    opacity: 0.6,
  },
  bgGlowBottom: {
    position: "absolute",
    left: -80,
    bottom: 90,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#E0F2E9",
    opacity: 0.4,
  },
  kickerPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF3EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 8,
  },
  kickerText: {
    color: "#FF7E00",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headTitle: {
    color: "#1F2937",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  headDate: {
    color: "#6B7280",
    marginTop: 6,
    fontSize: 14,
  },
  headGuide: {
    color: "#4B5563",
    marginTop: 10,
    lineHeight: 20,
    fontSize: 13,
  },
  pill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  pillText: {
    color: "#FF7E00",
    fontWeight: "800",
    fontSize: 13,
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FF7E00",
    borderRadius: 999,
  },
  goalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  goalCardSafe: {
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 4,
    borderColor: "#10B981",
  },
  goalCardUnsafe: {
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 4,
    borderColor: "#EF4444",
  },
  goalCardPending: {
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 4,
    borderColor: "#FF7E00",
  },
  goalCardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  goalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  goalIconSafe: {
    backgroundColor: "#D1FAE5",
  },
  goalIconUnsafe: {
    backgroundColor: "#FEE2E2",
  },
  goalIconPending: {
    backgroundColor: "#FFEDD5",
  },
  goalHeadCopy: {
    flex: 1,
    gap: 4,
  },
  goalTitle: {
    color: "#1F2937",
    fontSize: 18,
    fontWeight: "900",
  },
  goalSubtitle: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 18,
  },
  goalBodyText: {
    color: "#374151",
    fontSize: 14,
    lineHeight: 22,
  },
  goalList: {
    gap: 12,
  },
  goalListItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  goalListBullet: {
    width: 26,
    height: 26,
    borderRadius: 13,
    textAlign: "center",
    textAlignVertical: "center",
    backgroundColor: "#FFF3EB",
    color: "#FF7E00",
    fontWeight: "900",
    fontSize: 13,
    overflow: "hidden",
  },
  goalListText: {
    flex: 1,
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 2,
  },
  goalGrid: {
    gap: 10,
  },
  goalMiniCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    gap: 6,
  },
  goalMiniLabel: {
    color: "#FF7E00",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  goalMiniValue: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
  },
  streakRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  streakCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  // GAP 6: streakInfo stacks currentStreak + bestStreak vertically
  streakInfo: {
    flex: 1,
    gap: 2,
  },
  streakBest: {
    color: "#9CA3AF",
    fontSize: 11,
    fontWeight: "600",
  },
  iconBadgeWarm: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FFF3EB",
    alignItems: "center",
    justifyContent: "center",
  },
  streakText: {
    color: "#1F2937",
    fontWeight: "800",
    fontSize: 14,
  },
  syncBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  syncBtnText: {
    color: "#1F2937",
    fontWeight: "800",
    fontSize: 13,
  },
  badgesRow: {
    gap: 10,
    paddingRight: 20,
  },
  badgeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
  section: {
    gap: 16,
  },
  sectionTitle: {
    color: "#1F2937",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  sectionHint: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  notificationCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  notificationText: {
    color: "#374151",
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  emptyReminderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  emptyReminderText: {
    color: "#6B7280",
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  promptCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  promptInput: {
    flex: 1,
    color: "#1F2937",
    minHeight: 50,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  sendBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#FF7E00",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF7E00",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  sendBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  quickRow: {
    gap: 10,
    paddingRight: 20,
  },
  quickChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  quickChipText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "700",
  },
  loaderBox: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  emptyTitle: {
    color: "#1F2937",
    fontSize: 20,
    fontWeight: "900",
  },
  emptyText: {
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    fontSize: 14,
  },
  emptyAction: {
    marginTop: 8,
    backgroundColor: "#FFEDD5",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
  },
  emptyActionText: {
    color: "#FF7E00",
    fontWeight: "900",
    fontSize: 14,
  },
  taskList: {
    gap: 12,
  },
  taskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  taskCardDone: {
    opacity: 0.65,
    backgroundColor: "#F9FAFB",
    shadowOpacity: 0,
    elevation: 0,
  },
  taskIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  workoutBg: {
    backgroundColor: "#FFEDD5",
  },
  mealBg: {
    backgroundColor: "#D1FAE5",
  },
  taskMain: {
    flex: 1,
    flexShrink: 1,
    gap: 2,
  },
  taskTitle: {
    color: "#1F2937",
    fontWeight: "800",
    fontSize: 16,
    lineHeight: 22,
    flexWrap: "wrap",
  },
  taskSub: {
    color: "#6B7280",
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
    flexWrap: "wrap",
  },
  // GAP 5: Calorie/duration annotation badge (Journal Sec 3.5)
  annotationBadge: {
    alignSelf: "flex-start",
    marginTop: 6,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  annotationBadgeWorkout: {
    backgroundColor: "#FFEDD5",
  },
  annotationText: {
    color: "#065F46",
    fontSize: 11,
    fontWeight: "700",
  },
  annotationTextWorkout: {
    color: "#92400E",
  },
  taskTextDone: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    alignSelf: "flex-start",
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  checkCircleDone: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 14,
    backgroundColor: "#FAF9F6",
  },
  centerTitle: {
    color: "#1F2937",
    fontSize: 22,
    fontWeight: "900",
  },
  centerText: {
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    fontSize: 15,
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: "#FF7E00",
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: "#FF7E00",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
});
