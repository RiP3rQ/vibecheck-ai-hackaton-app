const USER_ID_HEADERS = ["x-clerk-user-id", "x-user-id"] as const;

export function getUserId(request: Request): string | null {
  for (const header of USER_ID_HEADERS) {
    const value = request.headers.get(header)?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

export function requireUserId(request: Request):
  | { ok: true; userId: string }
  | { ok: false; response: Response } {
  const userId = getUserId(request);

  if (!userId) {
    return {
      ok: false,
      response: Response.json(
        {
          error:
            "Unauthorized. Provide user identity (placeholder until Clerk middleware is integrated).",
        },
        { status: 401 },
      ),
    };
  }

  return { ok: true, userId };
}
