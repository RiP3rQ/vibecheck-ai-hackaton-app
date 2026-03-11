import type { UIMessage } from "ai";
import { generateReply } from "../_lib/generation";
import { requireUserId } from "../_lib/auth";
import { saveResponderGeneration } from "../_lib/generation-store";
import { createTextStreamResponse } from "../_lib/stream";
import { parseResponderPayload } from "../_lib/validation";

export const maxDuration = 30;

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) {
    return "";
  }

  let text = "";

  for (const part of parts) {
    if (
      part &&
      typeof part === "object" &&
      "type" in part &&
      "text" in part &&
      part.type === "text" &&
      typeof part.text === "string"
    ) {
      text += part.text;
    }
  }

  return text.trim();
}

function extractLatestUserText(messages: unknown): string {
  if (!Array.isArray(messages)) {
    return "";
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as UIMessage;

    if (message?.role !== "user") {
      continue;
    }

    const text = textFromParts(message.parts);

    if (text) {
      return text;
    }
  }

  return "";
}

function parseResponderChatPayload(body: unknown) {
  const object = asObject(body);

  if (!object) {
    return null;
  }

  const targetPost = extractLatestUserText(object.messages);

  if (!targetPost) {
    return null;
  }

  const modeRaw = asString(object.mode);
  const mode: "custom" | "edgy" = modeRaw === "edgy" ? "edgy" : "custom";

  return {
    targetPost,
    customAngleTone: asString(object.customAngleTone),
    mode,
    defaultSystemInstructions: asString(object.defaultSystemInstructions),
  };
}

export async function POST(request: Request): Promise<Response> {
  const user = await requireUserId(request);

  if ("response" in user) {
    return user.response;
  }

  const userId = user.userId;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const chatPayload = parseResponderChatPayload(body);
  let payload = chatPayload;

  if (!payload) {
    const parsed = parseResponderPayload(body);

    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    payload = parsed.data;
  }

  const output = generateReply(payload);

  try {
    await saveResponderGeneration({
      clerkUserId: userId,
      targetPost: payload.targetPost,
      customAngleTone: payload.customAngleTone,
      mode: payload.mode,
      defaultSystemInstructions: payload.defaultSystemInstructions,
      output,
    });
  } catch {
    return Response.json({ error: "Failed to persist generated response." }, { status: 500 });
  }

  return createTextStreamResponse(output);
}
