import { buildImproverPrompt, streamImprovedPost } from "../_lib/generation";
import { requireUserId } from "../_lib/auth";
import { getUserPreference } from "../_lib/preferences-store";
import { parseImproverPayload } from "../_lib/validation";

export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const user = await requireUserId(request);

  if (!user.ok) {
    return user.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseImproverPayload(body);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      { error: "Server is missing GOOGLE_GENERATIVE_AI_API_KEY configuration." },
      { status: 500 },
    );
  }

  const persistedPreferences = getUserPreference(user.userId);
  const effectiveDefaultInstructions =
    parsed.data.defaultSystemInstructions ||
    persistedPreferences?.defaultSystemInstructions ||
    "";

  const payload = {
    ...parsed.data,
    defaultSystemInstructions: effectiveDefaultInstructions,
  };

  const prompt = buildImproverPrompt(payload);

  try {
    const streamResult = streamImprovedPost(payload, prompt);
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
