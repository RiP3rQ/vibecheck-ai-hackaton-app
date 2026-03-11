import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import type { ImproverPayload, ResponderPayload } from "./validation";

const IMPROVER_MODEL = "gemini-2.5-flash";

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toSentence(value: string): string {
  const clean = normalizeWhitespace(value);

  if (!clean) {
    return "";
  }

  if (/[.!?]$/.test(clean)) {
    return clean;
  }

  return `${clean}.`;
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

export function buildResponderPrompt(payload: ResponderPayload): string {
  const edgyTemplate =
    "Respond with edgy, sarcastic, but non-hateful tone. Keep it concise and avoid harassment, threats, or protected-class insults.";

  return [
    "You are writing a reply to a social media post.",
    payload.defaultSystemInstructions
      ? `Global System Instructions: ${payload.defaultSystemInstructions}`
      : "Global System Instructions: (none provided)",
    `Target Post: ${payload.targetPost}`,
    payload.mode === "edgy"
      ? `Mode: edgy\nTemplate: ${edgyTemplate}`
      : payload.customAngleTone
        ? `Mode: custom\nCustom Angle/Tone: ${payload.customAngleTone}`
        : "Mode: custom\nCustom Angle/Tone: (none provided)",
  ].join("\n");
}

export function generateImprovedPost(payload: ImproverPayload, mergedPrompt: string): string {
  const draft = normalizeWhitespace(payload.draftPost);
  const context = toSentence(payload.additionalContext);
  const instructions = toSentence(payload.specificInstructions);

  const lead = payload.specificInstructions
    ? "Refined to match your requested tone and direction"
    : mergedPrompt.includes("Additional Context: (none provided)")
      ? "Refined for clarity and impact"
      : "Refined while preserving provided context";

  const pieces = [
    `${lead}: ${draft}`,
    context ? `Context anchor: ${context}` : "",
    instructions ? `Instruction alignment: ${instructions}` : "",
  ].filter(Boolean);

  return pieces.join("\n");
}

export function generateReply(payload: ResponderPayload, mergedPrompt: string): string {
  const target = normalizeWhitespace(payload.targetPost);

  if (payload.mode === "edgy") {
    const hasGlobalInstructions = !mergedPrompt.includes(
      "Global System Instructions: (none provided)",
    );

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
