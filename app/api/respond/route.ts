import { buildResponderPrompt, generateReply } from "../_lib/generation";
import { createTextStreamResponse } from "../_lib/stream";
import { parseResponderPayload } from "../_lib/validation";

export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseResponderPayload(body);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const prompt = buildResponderPrompt(parsed.data);
  const output = generateReply(parsed.data, prompt);

  return createTextStreamResponse(output);
}
