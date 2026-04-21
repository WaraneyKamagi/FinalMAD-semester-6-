import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

export const notifyTasks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    const tasks = await ctx.db
      .query("dailyTasks")
      .filter((q) => q.eq(q.field("date"), today))
      .collect();

    const uncompleted = tasks.filter((t) => !t.completed);

    if (uncompleted.length > 0) {
      const users = [...new Set(uncompleted.map((t) => t.userId))];

      for (const userId of users) {
        const user = await ctx.db.get(userId);
        const leadMins = user?.reminderLeadMins ?? 20;
        const userTasks = uncompleted.filter((t) => t.userId === userId);

        for (const task of userTasks) {
          const [hh, mm] = (task.time ?? "00:00")
            .split(":")
            .map((v) => parseInt(v, 10));
          if (Number.isNaN(hh) || Number.isNaN(mm)) continue;

          const taskDateTime = new Date(
            `${today}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00.000Z`,
          );
          const diffMinutes = Math.round(
            (taskDateTime.getTime() - now.getTime()) / 60000,
          );

          // Trigger reminder when task is near and still upcoming.
          if (diffMinutes < 0 || diffMinutes > leadMins) continue;

          // Dedupe reminder for same task within last 90 minutes.
          const existing = await ctx.db
            .query("notifications")
            .withIndex("by_user_read", (q) =>
              q.eq("userId", userId).eq("read", false),
            )
            .collect();
          const recentlyNotified = existing.some(
            (n) =>
              n.taskId === task._id &&
              n.kind === "task-reminder" &&
              Date.now() - n.createdAt < 90 * 60 * 1000,
          );
          if (recentlyNotified) continue;

          await ctx.db.insert("notifications", {
            userId,
            message: `Reminder: ${task.title} starts at ${task.time}`,
            createdAt: Date.now(),
            read: false,
            kind: "task-reminder",
            taskId: task._id,
          });
        }
      }
    }
  },
});

const crons = cronJobs();

crons.interval(
  "proactive check-in",
  { minutes: 15 },
  internal.crons.notifyTasks,
);

export default crons;
