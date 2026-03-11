import { auth } from "@clerk/nextjs/server";

const USER_ID_HEADERS = ["x-clerk-user-id", "x-user-id"] as const;

async function getUserIdFromClerk(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

function getUserIdFromHeaders(request: Request): string | null {
  for (const header of USER_ID_HEADERS) {
    const value = request.headers.get(header)?.trim();

    if (value) {
      return value;
    }
  }

  return null;
}

export async function getUserId(request: Request): Promise<string | null> {
  const clerkUserId = await getUserIdFromClerk();

  if (clerkUserId) {
    return clerkUserId;
  }

  return getUserIdFromHeaders(request);
}

export async function requireUserId(request: Request): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: Response }
> {
  const userId = await getUserId(request);

  if (!userId) {
    return {
      ok: false,
      response: Response.json(
        {
          error: "Unauthorized. Sign in with Clerk to access this resource.",
        },
        { status: 401 },
      ),
    };
  }

  return { ok: true, userId };
}
