import type { UIMessage } from "ai";
import { buildImproverPrompt, streamImprovedPost } from "../_lib/generation";
import { requireUserId } from "../_lib/auth";
import { saveImproveGeneration } from "../_lib/generation-store";
import { getUserPreference } from "../_lib/preferences-store";
import { parseImproverPayload } from "../_lib/validation";

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

function parseImproverChatPayload(body: unknown) {
  const object = asObject(body);

  if (!object) {
    return null;
  }

  const draftPost = extractLatestUserText(object.messages);

  if (!draftPost) {
    return null;
  }

  return {
    draftPost,
    specificInstructions: asString(object.specificInstructions),
    additionalContext: asString(object.additionalContext),
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

  const chatPayload = parseImproverChatPayload(body);
  let basePayload = chatPayload;

  if (!basePayload) {
    const parsed = parseImproverPayload(body);

    if (!parsed.ok) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    basePayload = parsed.data;
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "Server is missing GOOGLE_GENERATIVE_AI_API_KEY configuration." },
      { status: 500 },
    );
  }

  let persistedPreferences;

  try {
    persistedPreferences = await getUserPreference(userId);
  } catch {
    return Response.json({ error: "Failed to load user preferences." }, { status: 500 });
  }
  const effectiveDefaultInstructions =
    basePayload.defaultSystemInstructions ||
    persistedPreferences?.defaultSystemInstructions ||
    "";

  const payload = {
    ...basePayload,
    defaultSystemInstructions: effectiveDefaultInstructions,
  };

  const prompt = buildImproverPrompt(payload);

  try {
    const streamResult = streamImprovedPost(payload, prompt, async (output) => {
      try {
        await saveImproveGeneration({
          clerkUserId: userId,
          draftPost: payload.draftPost,
          specificInstructions: payload.specificInstructions,
          additionalContext: payload.additionalContext,
          defaultSystemInstructions: payload.defaultSystemInstructions,
          mergedPrompt: prompt,
          output,
        });
      } catch (error) {
        console.error("Failed to persist improve generation", error);
      }
    });

    return streamResult.toTextStreamResponse({
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { error: "Failed to stream improved post from the language model." },
      { status: 500 },
    );
  }
}
