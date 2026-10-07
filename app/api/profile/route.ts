import type { CityProfile } from "@/lib/game/types";
import { playerId, PUBLIC_PLAYER_ID } from "@/lib/server/identity";
import { postEconomy, publicCard, readEconomy } from "@/lib/server/ledger";
import { loadAccount } from "@/lib/server/world";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const other = url.searchParams.get("id");
  if (other && PUBLIC_PLAYER_ID.test(other)) {
    const card = await publicCard(other);
    if (!card) return Response.json({ profile: null }, { status: 404 });
    return Response.json({ profile: card });
  }
  const id = await playerId(request);
  if (!id) return Response.json({ profile: null }, { status: 401 });
  const account = await loadAccount(id);
  if (!account) return Response.json({ profile: null });
  const view = await readEconomy(id, account.username);
  const profile: CityProfile = {
    cash: view.cash,
    energy: account.energy,
    employed: account.employed,
    businesses: account.businesses,
    vehicles: account.vehicles,
  };
  return Response.json({ profile, view });
}

export async function POST(request: Request) {
  const id = await playerId(request);
  if (!id) return Response.json({ ok: false }, { status: 401 });
  const body = (await request.json()) as Partial<CityProfile> & {
    onShift?: boolean;
    levels?: Record<string, number>;
    shares?: Record<string, number>;
    basis?: Record<string, number>;
    items?: string[];
    stockProfit?: number;
    objectivesDone?: number;
    username?: string;
  };
  const cash = Number(body.cash);
  const energy = Number(body.energy);
  if (!Number.isFinite(cash) || !Number.isFinite(energy)) {
    return Response.json({ ok: false }, { status: 400 });
  }
  const result = await postEconomy(id, {
    action: "sync",
    cash,
    energy,
    employed: Boolean(body.employed),
    onShift: Boolean(body.onShift),
    businesses: Array.isArray(body.businesses) ? body.businesses.filter((item) => typeof item === "string") : [],
    vehicles: Array.isArray(body.vehicles) ? body.vehicles.filter((item) => typeof item === "string") : [],
    levels: body.levels,
    shares: body.shares,
    basis: body.basis,
    items: body.items,
    stockProfit: body.stockProfit,
    objectivesDone: body.objectivesDone,
    username: body.username,
  });
  if (result.error) return Response.json({ ok: false, view: result.view }, { status: 400 });
  return Response.json({ ok: true, cash: result.view.cash, view: result.view });
}
