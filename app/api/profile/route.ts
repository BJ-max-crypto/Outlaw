import type { CityProfile } from "@/lib/game/types";
import { playerId } from "@/lib/server/identity";
import { loadAccount, saveAccount } from "@/lib/server/world";

export async function GET(request: Request) {
  const id = await playerId(request);
  if (!id) return Response.json({ profile: null }, { status: 401 });
  const account = await loadAccount(id);
  if (!account) return Response.json({ profile: null });
  const profile: CityProfile = {
    cash: account.cash,
    energy: account.energy,
    employed: account.employed,
    businesses: account.businesses,
    vehicles: account.vehicles,
  };
  return Response.json({ profile });
}

export async function POST(request: Request) {
  const id = await playerId(request);
  if (!id) return Response.json({ ok: false }, { status: 401 });
  const body = (await request.json()) as Partial<CityProfile>;
  const cash = Number(body.cash);
  const energy = Number(body.energy);
  if (!Number.isFinite(cash) || !Number.isFinite(energy)) {
    return Response.json({ ok: false }, { status: 400 });
  }
  const existing = (await loadAccount(id)) ?? {
    id,
    username: "",
    cash: 0,
    energy: 100,
    employed: false,
    businesses: [],
    vehicles: [],
  };
  saveAccount({
    ...existing,
    id,
    cash,
    energy,
    employed: Boolean(body.employed),
    businesses: Array.isArray(body.businesses) ? body.businesses.filter((item) => typeof item === "string") : [],
    vehicles: Array.isArray(body.vehicles) ? body.vehicles.filter((item) => typeof item === "string") : [],
  });
  return Response.json({ ok: true });
}
