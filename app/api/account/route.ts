import { loadAccount, saveAccount } from "@/lib/server/world";
import { playerId } from "@/lib/server/identity";

export async function GET(request: Request) {
  const id = await playerId(request);
  if (!id) return Response.json({ account: null }, { status: 401 });
  const account = await loadAccount(id);
  return Response.json({
    account: account ?? { id, username: "", cash: 0, energy: 100, employed: false, businesses: [], vehicles: [] },
  });
}

export async function POST(request: Request) {
  const id = await playerId(request);
  if (!id) return Response.json({ ok: false }, { status: 401 });
  const body = (await request.json()) as { username?: string };
  const username = (body.username ?? "").trim().replace(/\s+/g, " ");
  if (username.length < 2 || username.length > 16) {
    return Response.json({ ok: false, reason: "username" }, { status: 400 });
  }
  const existing = (await loadAccount(id)) ?? {
    id,
    username,
    cash: 40,
    energy: 100,
    employed: false,
    businesses: [],
    vehicles: [],
  };
  const account = saveAccount({ ...existing, id, username });
  return Response.json({ ok: true, account });
}
