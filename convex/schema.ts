import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    phone: v.optional(v.string()),
    age: v.optional(v.number()),
    weight: v.number(),
    height: v.number(),
    // We use a simple unique username/token for identifying the user in this prototype
    token: v.string(),
    hasPromptedAI: v.optional(v.boolean()),
    reminderLeadMins: v.optional(v.number()),
    currentStreak: v.optional(v.number()),
    bestStreak: v.optional(v.number()),
    lastCompletedDate: v.optional(v.string()),
    badges: v.optional(v.array(v.string())),
  }).index("by_token", ["token"]),

  dailyTasks: defineTable({
    userId: v.id("users"),
    date: v.string(), // Format: YYYY-MM-DD
    time: v.string(), // E.g., "08:00"
    type: v.string(), // "meal", "workout", "other"
    title: v.string(), // "Breakfast: Oatmeal"
    description: v.string(), // "300 calories, with berries"
    calories: v.optional(v.number()),
    durationMins: v.optional(v.number()),
    completed: v.boolean(),
  }).index("by_user_date", ["userId", "date"]),

  groceryLists: defineTable({
    userId: v.id("users"),
    weekStart: v.string(), // Format: YYYY-MM-DD
    items: v.array(
      v.object({
        name: v.string(),
        category: v.string(),
        amount: v.string(),
        purchased: v.boolean(),
      }),
    ),
  }).index("by_user", ["userId"]),

  notifications: defineTable({
    userId: v.id("users"),
    message: v.string(),
    createdAt: v.number(), // timestamp
    read: v.boolean(),
    kind: v.optional(v.string()),
    taskId: v.optional(v.id("dailyTasks")),
  }).index("by_user_read", ["userId", "read"]),

  weeklyRecipes: defineTable({
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
  }).index("by_user_week", ["userId", "weekStart"]),

  // Prompt history — logs every AI generation for reference & future use
  promptHistory: defineTable({
    userId: v.id("users"),
    userPrompt: v.string(),         // Raw input text from the user
    systemPrompt: v.string(),       // Full system prompt sent to AI
    createdAt: v.number(),          // Unix timestamp (Date.now())
    planVersion: v.optional(v.string()), // e.g. "v1.0" for future versioning
  }).index("by_user", ["userId"]),
});
