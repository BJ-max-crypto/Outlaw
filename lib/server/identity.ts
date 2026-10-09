const GUEST_PLAYER_ID = /^[a-zA-Z0-9-]{8,80}$/;

/** Clerk user ids include an underscore (`user_…`). Guest ids stay hyphenated. */
export const PUBLIC_PLAYER_ID = /^[a-zA-Z0-9_-]{8,80}$/;

export function clerkConfigured(): boolean {
  return Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

/**
 * A signed-in Clerk user always wins. Otherwise a guest id is accepted, even when
 * Clerk is configured, so someone can play without an account.
 */
export function resolvePlayerId(_clerk: boolean, userId: string | null | undefined, guestHeader: string | null): string | null {
  if (userId) return userId;
  if (guestHeader && GUEST_PLAYER_ID.test(guestHeader)) return guestHeader;
  return null;
}

export async function playerId(request: Request): Promise<string | null> {
  const clerk = clerkConfigured();
  let userId: string | null = null;
  if (clerk) {
    try {
      const { auth } = await import("@clerk/nextjs/server");
      const session = await auth();
      userId = session.userId ?? null;
    } catch {
      userId = null;
    }
  }
  return resolvePlayerId(clerk, userId, request.headers.get("x-runout-player"));
}
