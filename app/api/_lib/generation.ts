import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import type { ImproverPayload, ResponderPayload } from "./validation";

const IMPROVER_MODEL = "gemini-2.5-flash";
const STREAM_TIMEOUT_MS = 25_000;

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

export function streamImprovedPost(
  payload: ImproverPayload,
  mergedPrompt: string,
  onFinish?: (output: string) => Promise<void> | void,
  abortSignal?: AbortSignal,
) {
  return streamText({
    model: google(IMPROVER_MODEL),
    temperature: 0.7,
    maxOutputTokens: 320,
    timeout: STREAM_TIMEOUT_MS,
    abortSignal,
    prompt: [
      "You improve tweet drafts for clarity, punch, and readability while preserving user intent.",
      "Return only the improved tweet text with no preamble, labels, or markdown.",
      "Keep the result concise and suitable for posting.",
      mergedPrompt,
      `Original Draft: ${payload.draftPost}`,
    ].join("\n\n"),
    onFinish: async ({ text }) => {
      if (!onFinish) {
        return;
      }

      await onFinish(text);
    },
  });
}

function buildResponderPrompt(payload: ResponderPayload): string {
  const target = normalizeWhitespace(payload.targetPost);
  const globalInstructions = normalizeWhitespace(payload.defaultSystemInstructions);
  const customAngle = normalizeWhitespace(payload.customAngleTone);

  return [
    "You write concise, high-quality social media replies.",
    globalInstructions
      ? `Global System Instructions: ${globalInstructions}`
      : "Global System Instructions: (none provided)",
    payload.mode === "edgy"
      ? "Mode: edgy. Write a sharp but not abusive reply with high confidence."
      : "Mode: custom. Match the requested custom angle and tone.",
    customAngle ? `Custom Angle/Tone: ${customAngle}` : "Custom Angle/Tone: (none provided)",
    `Target Post: ${target}`,
    "Return only the final reply text with no labels or markdown.",
  ].join("\n\n");
}

export function streamResponderReply(
  payload: ResponderPayload,
  onFinish?: (output: string) => Promise<void> | void,
  abortSignal?: AbortSignal,
) {
  return streamText({
    model: google(IMPROVER_MODEL),
    temperature: payload.mode === "edgy" ? 0.8 : 0.6,
    maxOutputTokens: 220,
    timeout: STREAM_TIMEOUT_MS,
    abortSignal,
    prompt: buildResponderPrompt(payload),
    onFinish: async ({ text }) => {
      if (!onFinish) {
        return;
      }

      await onFinish(text);
    },
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
