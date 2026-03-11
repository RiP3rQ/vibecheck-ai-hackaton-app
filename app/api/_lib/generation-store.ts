import { db } from "@/db";
import { improveGenerations, responderGenerations } from "@/db/schema";

type ImproveGenerationRecord = {
  clerkUserId: string;
  draftPost: string;
  specificInstructions: string;
  additionalContext: string;
  defaultSystemInstructions: string;
  mergedPrompt: string;
  output: string;
};

type ResponderGenerationRecord = {
  clerkUserId: string;
  targetPost: string;
  customAngleTone: string;
  mode: "custom" | "edgy";
  defaultSystemInstructions: string;
  output: string;
};

export async function saveImproveGeneration(record: ImproveGenerationRecord): Promise<void> {
  await db.insert(improveGenerations).values(record);
}

export async function saveResponderGeneration(record: ResponderGenerationRecord): Promise<void> {
  await db.insert(responderGenerations).values(record);
}
