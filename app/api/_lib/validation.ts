export type ImproverPayload = {
  draftPost: string;
  specificInstructions: string;
  additionalContext: string;
  defaultSystemInstructions: string;
};

export type ResponderPayload = {
  targetPost: string;
  customAngleTone: string;
  mode: "custom" | "edgy";
  defaultSystemInstructions: string;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function parsePreferencesPayload(body: unknown): Result<{ defaultSystemInstructions: string }> {
  const object = asObject(body);

  if (!object) {
    return { ok: false, error: "Invalid JSON body." };
  }

  return {
    ok: true,
    data: {
      defaultSystemInstructions: asString(object.defaultSystemInstructions),
    },
  };
}

export function parseImproverPayload(body: unknown): Result<ImproverPayload> {
  const object = asObject(body);

  if (!object) {
    return { ok: false, error: "Invalid JSON body." };
  }

  const draftPost = asString(object.draftPost);

  if (!draftPost) {
    return { ok: false, error: "Field 'draftPost' is required." };
  }

  return {
    ok: true,
    data: {
      draftPost,
      specificInstructions: asString(object.specificInstructions),
      additionalContext: asString(object.additionalContext),
      defaultSystemInstructions: asString(object.defaultSystemInstructions),
    },
  };
}

export function parseResponderPayload(body: unknown): Result<ResponderPayload> {
  const object = asObject(body);

  if (!object) {
    return { ok: false, error: "Invalid JSON body." };
  }

  const targetPost = asString(object.targetPost);

  if (!targetPost) {
    return { ok: false, error: "Field 'targetPost' is required." };
  }

  const modeRaw = asString(object.mode);
  const mode: "custom" | "edgy" = modeRaw === "edgy" ? "edgy" : "custom";

  return {
    ok: true,
    data: {
      targetPost,
      customAngleTone: asString(object.customAngleTone),
      mode,
      defaultSystemInstructions: asString(object.defaultSystemInstructions),
    },
  };
}
