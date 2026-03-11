export type UserPreferenceRecord = {
  clerkUserId: string;
  defaultSystemInstructions: string;
  createdAt: string;
  updatedAt: string;
};

const preferenceStore = new Map<string, UserPreferenceRecord>();

export function getUserPreference(clerkUserId: string): UserPreferenceRecord | null {
  return preferenceStore.get(clerkUserId) ?? null;
}

export function upsertUserPreference(
  clerkUserId: string,
  defaultSystemInstructions: string,
): UserPreferenceRecord {
  const existing = preferenceStore.get(clerkUserId);
  const now = new Date().toISOString();

  const record: UserPreferenceRecord = {
    clerkUserId,
    defaultSystemInstructions,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  preferenceStore.set(clerkUserId, record);

  return record;
}
