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

const MAX_POST_LENGTH = 2800;
const MAX_INSTRUCTIONS_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 2000;
const MAX_CUSTOM_ANGLE_LENGTH = 1000;

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function validateMaxLength(fieldName: string, value: string, maxLength: number): string | null {
  if (value.length > maxLength) {
    return `Field '${fieldName}' must be at most ${maxLength} characters.`;
  }

  return null;
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

  const draftPostLengthError = validateMaxLength("draftPost", draftPost, MAX_POST_LENGTH);

  if (draftPostLengthError) {
    return { ok: false, error: draftPostLengthError };
  }

  const specificInstructions = asString(object.specificInstructions);
  const additionalContext = asString(object.additionalContext);
  const defaultSystemInstructions = asString(object.defaultSystemInstructions);

  const specificInstructionsLengthError = validateMaxLength(
    "specificInstructions",
    specificInstructions,
    MAX_INSTRUCTIONS_LENGTH,
  );

  if (specificInstructionsLengthError) {
    return { ok: false, error: specificInstructionsLengthError };
  }

  const additionalContextLengthError = validateMaxLength(
    "additionalContext",
    additionalContext,
    MAX_CONTEXT_LENGTH,
  );

  if (additionalContextLengthError) {
    return { ok: false, error: additionalContextLengthError };
  }

  const defaultInstructionsLengthError = validateMaxLength(
    "defaultSystemInstructions",
    defaultSystemInstructions,
    MAX_INSTRUCTIONS_LENGTH,
  );

  if (defaultInstructionsLengthError) {
    return { ok: false, error: defaultInstructionsLengthError };
  }

  return {
    ok: true,
    data: {
      draftPost,
      specificInstructions,
      additionalContext,
      defaultSystemInstructions,
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

  const targetPostLengthError = validateMaxLength("targetPost", targetPost, MAX_POST_LENGTH);

  if (targetPostLengthError) {
    return { ok: false, error: targetPostLengthError };
  }

  const customAngleTone = asString(object.customAngleTone);
  const defaultSystemInstructions = asString(object.defaultSystemInstructions);

  const customAngleLengthError = validateMaxLength(
    "customAngleTone",
    customAngleTone,
    MAX_CUSTOM_ANGLE_LENGTH,
  );

  if (customAngleLengthError) {
    return { ok: false, error: customAngleLengthError };
  }

  const defaultInstructionsLengthError = validateMaxLength(
    "defaultSystemInstructions",
    defaultSystemInstructions,
    MAX_INSTRUCTIONS_LENGTH,
  );

  if (defaultInstructionsLengthError) {
    return { ok: false, error: defaultInstructionsLengthError };
  }

  const modeRaw = asString(object.mode);
  const mode: "custom" | "edgy" = modeRaw === "edgy" ? "edgy" : "custom";

  return {
    ok: true,
    data: {
      targetPost,
      customAngleTone,
      mode,
      defaultSystemInstructions,
    },
  };
}
