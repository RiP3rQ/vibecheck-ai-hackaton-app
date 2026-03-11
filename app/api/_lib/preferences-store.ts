import { eq } from "drizzle-orm";

import { db } from "@/db";
import { userPreferences } from "@/db/schema";

export type UserPreferenceRecord = {
  clerkUserId: string;
  defaultSystemInstructions: string;
  createdAt: string;
  updatedAt: string;
};

function mapRecord(record: typeof userPreferences.$inferSelect): UserPreferenceRecord {
  return {
    clerkUserId: record.clerkUserId,
    defaultSystemInstructions: record.defaultSystemInstructions,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function getUserPreference(clerkUserId: string): Promise<UserPreferenceRecord | null> {
  const [record] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.clerkUserId, clerkUserId))
    .limit(1);

  return record ? mapRecord(record) : null;
}

export async function upsertUserPreference(
  clerkUserId: string,
  defaultSystemInstructions: string,
): Promise<UserPreferenceRecord> {
  const now = new Date().toISOString();

  const [record] = await db
    .insert(userPreferences)
    .values({
      clerkUserId,
      defaultSystemInstructions,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userPreferences.clerkUserId,
      set: {
        defaultSystemInstructions,
        updatedAt: now,
      },
    })
    .returning();

  return mapRecord(record);
}
