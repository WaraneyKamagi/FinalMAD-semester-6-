import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, mutation } from "./_generated/server";

function extractJsonPayload(raw: string): unknown {
  const trimmed = raw.trim().replace(/^\uFEFF/, "");

  function stripJsonNoise(input: string): string {
    const noBlockComments = input.replace(/\/\*[\s\S]*?\*\//g, "");
    const noLineComments = noBlockComments.replace(
      /(^|\n)\s*\/\/.*(?=\n|$)/g,
      "$1",
    );
    const noTrailingCommas = noLineComments.replace(/,\s*([}\]])/g, "$1");
    return noTrailingCommas.trim();
  }

  function tryParse(input: string): unknown {
    return JSON.parse(stripJsonNoise(input));
  }

  // 1) Best case: already pure JSON
  try {
    return tryParse(trimmed);
  } catch {
    // continue with fallbacks
  }

  // 2) Markdown fenced JSON
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return tryParse(withoutFence);
  } catch {
    // continue with substring extraction
  }

  // 3) Fallback: parse first JSON object substring
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const candidate = withoutFence.slice(firstBrace, lastBrace + 1);
    return tryParse(candidate);
  }

  throw new Error(
    `Gemini response was not valid JSON. Raw preview: ${trimmed.slice(0, 220)}`,
  );
}

function isUnsafePrompt(prompt: string): boolean {
  const normalized = prompt.toLowerCase();
  const riskyPhrases = [
    "extreme",
    "very low calorie",
    "starvation",
    "lose 5kg in a week",
    "lose 10kg in 2 weeks",
    "detox only",
  ];
  return riskyPhrases.some((phrase) => normalized.includes(phrase));
}

function safeNumber(
  value: number | null | undefined,
  min: number,
  max: number,
): number | undefined {
  if (typeof value !== "number") return undefined;
  return Math.max(min, Math.min(max, value));
}

function planResponseSchema() {
  return {
    type: "object",
    properties: {
      dailyTasks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            dateOffset: { type: "integer" },
            time: { type: "string" },
            type: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            calories: { type: "integer" },
            durationMins: { type: "integer" },
          },
          required: ["dateOffset", "time", "type", "title", "description"],
        },
      },
      groceryList: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: { type: "string" },
            amount: { type: "string" },
          },
          required: ["name", "category", "amount"],
        },
      },
    },
    required: ["dailyTasks", "groceryList"],
  };
}

function swapResponseSchema() {
  return {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      calories: { type: "integer" },
      durationMins: { type: "integer" },
    },
    required: ["title", "description"],
  };
}

function recipeResponseSchema() {
  return {
    type: "object",
    properties: {
      recipes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            prepMins: { type: "integer" },
            calories: { type: "integer" },
            ingredients: { type: "array", items: { type: "string" } },
            steps: { type: "array", items: { type: "string" } },
          },
          required: ["title", "ingredients", "steps"],
        },
      },
    },
    required: ["recipes"],
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestGeminiJson(args: {
  apiKey: string;
  prompt: string;
  maxOutputTokens: number;
  temperature: number;
  responseSchema?: Record<string, unknown>;
}): Promise<any> {
  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  const retryableStatus = new Set([429, 500, 502, 503, 504]);
  const maxAttemptsPerModel = 3;

  let lastErrorText = "Unknown Groq API error";

  // Inject schema directly into prompt for Groq JSON Mode
  let finalPrompt = args.prompt;
  if (args.responseSchema) {
    finalPrompt += "\n\nCRUCIAL: You must return ONLY raw JSON matching this schema exactly:\n";
    finalPrompt += JSON.stringify(args.responseSchema, null, 2);
  }

  for (const model of models) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
      const endpoint = `https://api.groq.com/openai/v1/chat/completions`;

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${args.apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { "role": "system", "content": "You are a highly capable AI assistant that MUST output strictly valid JSON format. Provide no markdown formatting, no comments, just raw parsable JSON." },
              { "role": "user", "content": finalPrompt }
            ],
            temperature: args.temperature,
            // Only max_tokens is supported commonly
            max_completion_tokens: args.maxOutputTokens,
            response_format: { type: "json_object" }
          }),
        });

        if (res.ok) {
          const groqData = await res.json();
          // Map to Gemini response format to avoid changing other code
          return {
            candidates: [
              {
                finishReason: groqData.choices?.[0]?.finish_reason === "stop" ? "STOP" : groqData.choices?.[0]?.finish_reason,
                content: {
                  parts: [{ text: groqData.choices?.[0]?.message?.content || "" }]
                }
              }
            ]
          };
        }

        const errorText = await res.text();
        lastErrorText = errorText;

        if (!retryableStatus.has(res.status)) {
          throw new Error(`Groq API error (${res.status}): ${errorText}`);
        }

        if (attempt < maxAttemptsPerModel) {
          const backoffMs = 300 * Math.pow(2, attempt - 1);
          await sleep(backoffMs);
          continue;
        }
      } catch (error) {
        lastErrorText = error instanceof Error ? error.message : String(error);
        if (attempt < maxAttemptsPerModel) {
          const backoffMs = 300 * Math.pow(2, attempt - 1);
          await sleep(backoffMs);
          continue;
        }
      }
    }
  }

  throw new Error(
    `Groq API is temporarily unavailable due to high demand. Please retry in 30-60 seconds. Details: ${lastErrorText}`,
  );
}

export const generatePlan = action({
  args: {
    userId: v.id("users"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    if (isUnsafePrompt(args.prompt)) {
      throw new Error(
        "Your request is too extreme. Please use safe nutrition and weight-loss targets.",
      );
    }

    const user = await ctx.runQuery(api.users.getUser, { userId: args.userId });
    if (!user) throw new Error("User not found");

    const systemPrompt = `You are an elite personal nutritionist and physical trainer.
Create a concise 7-day health plan based on the user's prompt and profile.
Client profile: Name: ${user.name}, Weight: ${user.weight}kg, Height: ${user.height}cm.
Prompt: "${args.prompt}"

INSTRUCTIONS: 
- Provide highly specific, clear, and unambiguous action plans. Get straight to the point.
- For Meals: State EXACTLY what to eat, exact ingredients, and precise portion sizes context. (e.g. "150g Dada Ayam Bakar, 2 lembar bayam rebus, 1 sdm minyak zaitun").
- For Exercise: State EXACTLY the movements, sets, and reps. (e.g. "Pemanasan ringan 5 menit, 4 set x 15 Pushup, 20 Squat, dan lari 30 menit").
- No commentary outside the JSON block. Return JSON ONLY. Do not use markdown blocks.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const data = await requestGeminiJson({
      apiKey,
      prompt: systemPrompt,
      temperature: 0.4,
      maxOutputTokens: 8192,
      responseSchema: planResponseSchema(),
    });
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput || typeof textOutput !== "string") {
      throw new Error("Gemini returned empty or invalid text content");
    }

    let parsed: {
      dailyTasks?: Array<{
        dateOffset?: number;
        time?: string;
        type?: string;
        title?: string;
        description?: string;
        calories?: number | null;
        durationMins?: number | null;
      }>;
      groceryList?: Array<{
        name?: string;
        category?: string;
        amount?: string;
      }>;
    };

    try {
      parsed = extractJsonPayload(textOutput) as typeof parsed;
    } catch (err) {
      console.error("FAILED TEXT OUTPUT:", textOutput);
      console.error("FINISH REASON:", data?.candidates?.[0]?.finishReason);
      const textLen = textOutput.length;
      const endStr = textOutput.slice(-100);
      throw new Error(`Failed to parse JSON. Length: ${textLen}. FinishReason: ${data?.candidates?.[0]?.finishReason}. Ends with: ${endStr}`);
    }

    if (
      !Array.isArray(parsed.dailyTasks) ||
      !Array.isArray(parsed.groceryList)
    ) {
      throw new Error("Gemini response is missing dailyTasks or groceryList array");
    }

    const normalizedDailyTasks = parsed.dailyTasks.slice(0, 28).map((task) => ({
      dateOffset: typeof task.dateOffset === "number" ? task.dateOffset : 0,
      time: task.time ?? "08:00",
      type: task.type ?? "meal",
      title: task.title ?? "Planned activity",
      description: task.description ?? "Auto-generated by AI coach",
      calories: safeNumber(task.calories, 150, 1400),
      durationMins: safeNumber(task.durationMins, 5, 180),
    }));

    const normalizedGroceryList = parsed.groceryList
      .slice(0, 80)
      .filter((item) => item && item.name)
      .map((item) => ({
        name: item.name ?? "Unnamed item",
        category: item.category ?? "Other",
        amount: item.amount ?? "1",
      }));

    // Call internal mutation to save the plan
    await ctx.runMutation(api.gemini.savePlan, {
      userId: args.userId,
      dailyTasks: normalizedDailyTasks,
      groceryList: normalizedGroceryList,
    });
  },
});

export const swapTask = action({
  args: {
    taskId: v.id("dailyTasks"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.runQuery(api.dashboard.getTaskById, {
      taskId: args.taskId,
    });
    if (!task) throw new Error("Task not found");

    const user = await ctx.runQuery(api.users.getUser, { userId: task.userId });
    if (!user) throw new Error("User not found");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const swapPrompt = `Create one alternative ${task.type} task for this user.
User: ${user.name}, weight ${user.weight}kg, height ${user.height}cm.
Current task: ${task.title} - ${task.description}.
Return ONLY JSON:
{
  "title": "...",
  "description": "...",
  "calories": 300,
  "durationMins": 30
}`;

    const data = await requestGeminiJson({
      apiKey,
      prompt: swapPrompt,
      temperature: 0.5,
      maxOutputTokens: 500,
      responseSchema: swapResponseSchema(),
    });
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput || typeof textOutput !== "string") {
      throw new Error("Gemini returned empty swap content");
    }

    const parsed = extractJsonPayload(textOutput) as {
      title?: string;
      description?: string;
      calories?: number | null;
      durationMins?: number | null;
    };

    await ctx.runMutation(api.dashboard.applyTaskSwap, {
      taskId: task._id,
      title: parsed.title ?? `Alternative ${task.type}`,
      description: parsed.description ?? "Updated by AI coach",
      calories: safeNumber(parsed.calories, 150, 1400),
      durationMins: safeNumber(parsed.durationMins, 5, 180),
    });
  },
});

export const generateWeeklyRecipes = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getUser, { userId: args.userId });
    if (!user) throw new Error("User not found");

    const grocery = await ctx.runQuery(api.dashboard.getGroceryList, {
      userId: args.userId,
    });
    if (!grocery || grocery.items.length === 0) {
      throw new Error("Grocery list is empty");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const prompt = `Build 3 healthy recipes from this grocery list for user ${user.name}.
Items: ${grocery.items.map((i) => `${i.name} (${i.amount})`).join(", ")}.
Return JSON only and keep it concise.`;

    const data = await requestGeminiJson({
      apiKey,
      prompt,
      temperature: 0.5,
      maxOutputTokens: 2500,
      responseSchema: recipeResponseSchema(),
    });
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput || typeof textOutput !== "string") {
      throw new Error("Gemini returned empty recipes content");
    }

    const parsed = extractJsonPayload(textOutput) as {
      recipes?: Array<{
        title?: string;
        prepMins?: number | null;
        calories?: number | null;
        ingredients?: string[];
        steps?: string[];
      }>;
    };

    const safeRecipes = (parsed.recipes ?? []).slice(0, 5).map((r, idx) => ({
      title: r.title ?? `Recipe ${idx + 1}`,
      prepMins: safeNumber(r.prepMins, 5, 120),
      calories: safeNumber(r.calories, 150, 1200),
      ingredients: Array.isArray(r.ingredients)
        ? r.ingredients.slice(0, 12)
        : ["Ingredient list unavailable"],
      steps: Array.isArray(r.steps)
        ? r.steps.slice(0, 10)
        : ["Step details unavailable"],
    }));

    const weekStart = new Date().toISOString().split("T")[0];
    await ctx.runMutation(api.dashboard.upsertWeeklyRecipes, {
      userId: args.userId,
      weekStart,
      recipes: safeRecipes,
    });
  },
});

export const savePlan = mutation({
  args: {
    userId: v.id("users"),
    dailyTasks: v.array(
      v.object({
        dateOffset: v.number(),
        time: v.string(),
        type: v.string(),
        title: v.string(),
        description: v.string(),
        calories: v.optional(v.number()),
        durationMins: v.optional(v.number()),
      }),
    ),
    groceryList: v.array(
      v.object({
        name: v.string(),
        category: v.string(),
        amount: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // 1. Delete uncompleted current/future tasks only.
    // This avoids scanning historical rows which can slow down plan regeneration.
    const todayIso = new Date().toISOString().split("T")[0];
    const existingTasks = await ctx.db
      .query("dailyTasks")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).gte("date", todayIso),
      )
      .collect();

    for (const task of existingTasks) {
      if (!task.completed) {
        await ctx.db.delete(task._id);
      }
    }

    const today = new Date();

    // 2. Insert new daily tasks
    for (const task of args.dailyTasks) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + task.dateOffset);

      await ctx.db.insert("dailyTasks", {
        userId: args.userId,
        date: targetDate.toISOString().split("T")[0],
        time: task.time,
        type: task.type,
        title: task.title,
        description: task.description,
        calories: task.calories,
        durationMins: task.durationMins,
        completed: false,
      });
    }

    // 3. Update Grocery List (clean old list for simplicity)
    const existingGroceries = await ctx.db
      .query("groceryLists")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const list of existingGroceries) {
      await ctx.db.delete(list._id);
    }

    await ctx.db.insert("groceryLists", {
      userId: args.userId,
      weekStart: today.toISOString().split("T")[0],
      items: args.groceryList.map((item) => ({
        ...item,
        purchased: false,
      })),
    });

    await ctx.db.patch(args.userId, { hasPromptedAI: true });
  },
});
