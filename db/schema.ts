import { index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

const timestampColumns = {
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
};

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    defaultSystemInstructions: text("default_system_instructions").notNull().default(""),
    ...timestampColumns,
  },
  (table) => [index("user_preferences_clerk_user_id_idx").on(table.clerkUserId)],
);

export const improveGenerations = pgTable(
  "improve_generations",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    draftPost: text("draft_post").notNull(),
    specificInstructions: text("specific_instructions").notNull().default(""),
    additionalContext: text("additional_context").notNull().default(""),
    defaultSystemInstructions: text("default_system_instructions").notNull().default(""),
    mergedPrompt: text("merged_prompt").notNull(),
    output: text("output").notNull().default(""),
    ...timestampColumns,
  },
  (table) => [index("improve_generations_clerk_user_id_idx").on(table.clerkUserId)],
);

export const responderGenerations = pgTable(
  "responder_generations",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    targetPost: text("target_post").notNull(),
    customAngleTone: text("custom_angle_tone").notNull().default(""),
    mode: text("mode").notNull(),
    defaultSystemInstructions: text("default_system_instructions").notNull().default(""),
    output: text("output").notNull(),
    ...timestampColumns,
  },
  (table) => [index("responder_generations_clerk_user_id_idx").on(table.clerkUserId)],
);
