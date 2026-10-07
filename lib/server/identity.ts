export async function playerId(request: Request): Promise<string | null> {
  if (process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    const { auth } = await import("@clerk/nextjs/server");
    const session = await auth();
    if (session.userId) return session.userId;
  }
  const guest = request.headers.get("x-runout-player");
  if (guest && /^[a-zA-Z0-9-]{8,80}$/.test(guest)) return guest;
  return null;
}
