import { requireUserId } from "../_lib/auth";
import { getUserPreference, upsertUserPreference } from "../_lib/preferences-store";
import { parsePreferencesPayload } from "../_lib/validation";

export async function GET(request: Request): Promise<Response> {
  const user = await requireUserId(request);

  if (!user.ok) {
    return user.response;
  }

  let existing;

  try {
    existing = await getUserPreference(user.userId);
  } catch {
    return Response.json({ error: "Failed to load default system instructions." }, { status: 500 });
  }

  return Response.json({
    data: {
      clerkUserId: user.userId,
      defaultSystemInstructions: existing?.defaultSystemInstructions ?? "",
      createdAt: existing?.createdAt ?? null,
      updatedAt: existing?.updatedAt ?? null,
    },
  });
}

export async function PUT(request: Request): Promise<Response> {
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

  const parsed = parsePreferencesPayload(body);

  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  let record;

  try {
    record = await upsertUserPreference(user.userId, parsed.data.defaultSystemInstructions);
  } catch {
    return Response.json({ error: "Failed to save default system instructions." }, { status: 500 });
  }

  return Response.json({
    data: {
      clerkUserId: record.clerkUserId,
      defaultSystemInstructions: record.defaultSystemInstructions,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
  });
}
