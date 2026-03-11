import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import type { ImproverPayload, ResponderPayload } from "./validation";

const IMPROVER_MODEL = "gemini-2.5-flash";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function buildImproverPrompt(payload: ImproverPayload): string {
  return [
    "You are rewriting a social media post.",
    payload.defaultSystemInstructions
      ? `Global System Instructions: ${payload.defaultSystemInstructions}`
      : "Global System Instructions: (none provided)",
    payload.additionalContext
      ? `Additional Context: ${payload.additionalContext}`
      : "Additional Context: (none provided)",
    payload.specificInstructions
      ? `Specific Instructions: ${payload.specificInstructions}`
      : "Specific Instructions: (none provided)",
    `Draft Post Content: ${payload.draftPost}`,
  ].join("\n");
}

export function streamImprovedPost(payload: ImproverPayload, mergedPrompt: string) {
  return streamText({
    model: google(IMPROVER_MODEL),
    temperature: 0.7,
    maxOutputTokens: 320,
    prompt: [
      "You improve tweet drafts for clarity, punch, and readability while preserving user intent.",
      "Return only the improved tweet text with no preamble, labels, or markdown.",
      "Keep the result concise and suitable for posting.",
      mergedPrompt,
      `Original Draft: ${payload.draftPost}`,
    ].join("\n\n"),
  });
}

export function generateReply(payload: ResponderPayload): string {
  const target = normalizeWhitespace(payload.targetPost);

  if (payload.mode === "edgy") {
    const hasGlobalInstructions = normalizeWhitespace(payload.defaultSystemInstructions).length > 0;

    return [
      "Edgy reply:",
      hasGlobalInstructions
        ? `Bold take: "${target}"? Sure, because subtlety clearly called in sick today - with your house style intact.`
        : `Bold take: "${target}"? Sure, because subtlety clearly called in sick today.`,
    ].join("\n");
  }

  const angle = payload.customAngleTone
    ? `(${normalizeWhitespace(payload.customAngleTone)})`
    : "";

  return [
    "Custom reply:",
    `I see your point ${angle}. One practical next step is to focus on what moves the outcome forward today.`,
  ].join("\n");
}
