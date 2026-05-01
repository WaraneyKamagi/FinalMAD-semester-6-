import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function toYmd(date: Date): string {
  return date.toISOString().split("T")[0];
}

function previousDate(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return toYmd(d);
}

export const getTodayTasks = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.hasPromptedAI) return [];

    return await ctx.db
      .query("dailyTasks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date),
      )
      .collect();
  },
});

export const getTaskById = query({
  args: { taskId: v.id("dailyTasks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.taskId);
  },
});

export const toggleTaskCompletion = mutation({
  args: { taskId: v.id("dailyTasks"), completed: v.boolean() },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) return;

    await ctx.db.patch(args.taskId, { completed: args.completed });

    const user = await ctx.db.get(task.userId);
    if (!user) return;

    if (!args.completed) {
      // If user unchecks any task, keep streak unchanged for now.
      return;
    }

    const dayTasks = await ctx.db
      .query("dailyTasks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", task.userId).eq("date", task.date),
      )
      .collect();

    const allCompleted =
      dayTasks.length > 0 &&
      dayTasks.every((t) => t.completed || t._id === args.taskId);
    if (!allCompleted) return;

    const alreadyCounted = user.lastCompletedDate === task.date;
    if (alreadyCounted) return;

    const wasYesterday = user.lastCompletedDate === previousDate(task.date);
    const nextStreak = wasYesterday ? (user.currentStreak ?? 0) + 1 : 1;
    const nextBest = Math.max(user.bestStreak ?? 0, nextStreak);

    const badges = new Set(user.badges ?? []);
    if (nextStreak >= 3) badges.add("3-day streak");
    if (nextStreak >= 7) badges.add("7-day streak");
    if (nextStreak >= 30) badges.add("30-day streak");

    await ctx.db.patch(task.userId, {
      currentStreak: nextStreak,
      bestStreak: nextBest,
      lastCompletedDate: task.date,
      badges: Array.from(badges),
    });
  },
});

export const applyTaskSwap = mutation({
  args: {
    taskId: v.id("dailyTasks"),
    title: v.string(),
    description: v.string(),
    calories: v.optional(v.number()),
    durationMins: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      title: args.title,
      description: args.description,
      calories: args.calories,
      durationMins: args.durationMins,
    });
  },
});

export const getGroceryList = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.hasPromptedAI) return null;

    return await ctx.db
      .query("groceryLists")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const getWeeklyRecipes = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.hasPromptedAI) return null;

    const weekStart = toYmd(new Date());
    return await ctx.db
      .query("weeklyRecipes")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", args.userId).eq("weekStart", weekStart),
      )
      .first();
  },
});

export const upsertWeeklyRecipes = mutation({
  args: {
    userId: v.id("users"),
    weekStart: v.string(),
    recipes: v.array(
      v.object({
        title: v.string(),
        prepMins: v.optional(v.number()),
        calories: v.optional(v.number()),
        ingredients: v.array(v.string()),
        steps: v.array(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("weeklyRecipes")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", args.userId).eq("weekStart", args.weekStart),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { recipes: args.recipes });
    } else {
      await ctx.db.insert("weeklyRecipes", {
        userId: args.userId,
        weekStart: args.weekStart,
        recipes: args.recipes,
      });
    }
  },
});

export const toggleGroceryItem = mutation({
  args: {
    listId: v.id("groceryLists"),
    itemIndex: v.number(),
    purchased: v.boolean(),
  },
  handler: async (ctx, args) => {
    const list = await ctx.db.get(args.listId);
    if (!list) return;

    list.items[args.itemIndex].purchased = args.purchased;
    await ctx.db.patch(args.listId, { items: list.items });
  },
});

export const getNotifications = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user?.hasPromptedAI) return [];

    return await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) =>
        q.eq("userId", args.userId).eq("read", false),
      )
      .collect();
  },
});

export const getStreakStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        badges: [] as string[],
      };
    }

    return {
      currentStreak: user.currentStreak ?? 0,
      bestStreak: user.bestStreak ?? 0,
      badges: user.badges ?? [],
    };
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { read: true });
  },
});

// ─── Reset Plan ───────────────────────────────────────────────────────────────

/**
 * resetPlan — Wipes all AI-generated data for a user and resets hasPromptedAI.
 * Streak and badges are intentionally preserved.
 */
export const resetPlan = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // 1. Delete ALL daily tasks for this user
    const allTasks = await ctx.db
      .query("dailyTasks")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .collect();
    for (const task of allTasks) {
      await ctx.db.delete(task._id);
    }

    // 2. Delete all grocery lists for this user
    const allGroceries = await ctx.db
      .query("groceryLists")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const list of allGroceries) {
      await ctx.db.delete(list._id);
    }

    // 3. Delete all weekly recipes for this user
    const allRecipes = await ctx.db
      .query("weeklyRecipes")
      .withIndex("by_user_week", (q) => q.eq("userId", args.userId))
      .collect();
    for (const recipe of allRecipes) {
      await ctx.db.delete(recipe._id);
    }

    // 4. Reset the AI flag — streak & badges stay intact
    await ctx.db.patch(args.userId, { hasPromptedAI: false });
  },
});

