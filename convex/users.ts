import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const login = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    age: v.number(),
    weight: v.number(),
    height: v.number(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (existingUser) {
      // Just update if they login again with new weight/height
      await ctx.db.patch(existingUser._id, {
        weight: args.weight,
        height: args.height,
        age: args.age,
        name: args.name,
        hasPromptedAI: false,
        reminderLeadMins: existingUser.reminderLeadMins ?? 20,
        currentStreak: existingUser.currentStreak ?? 0,
        bestStreak: existingUser.bestStreak ?? 0,
        badges: existingUser.badges ?? [],
      });
      return existingUser._id;
    }

    const newUserId = await ctx.db.insert("users", {
      name: args.name,
      age: args.age,
      weight: args.weight,
      height: args.height,
      token: args.token,
      hasPromptedAI: false,
      reminderLeadMins: 20,
      currentStreak: 0,
      bestStreak: 0,
      badges: [],
    });
    return newUserId;
  },
});

export const updateWeight = mutation({
  args: {
    userId: v.id("users"),
    newWeight: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      weight: args.newWeight,
    });
  },
});

export const updateReminderLeadMins = mutation({
  args: {
    userId: v.id("users"),
    reminderLeadMins: v.number(),
  },
  handler: async (ctx, args) => {
    const safeLead = Math.max(
      5,
      Math.min(120, Math.round(args.reminderLeadMins)),
    );
    await ctx.db.patch(args.userId, {
      reminderLeadMins: safeLead,
    });
  },
});

export const getUser = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
