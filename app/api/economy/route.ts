import { playerId } from "@/lib/server/identity";
import { postEconomy, readEconomy, readSocial } from "@/lib/server/ledger";

export async function GET(request: Request) {
  const id = await playerId(request);
  if (!id) return Response.json({ view: null }, { status: 401 });
  const url = new URL(request.url);
  const username = url.searchParams.get("username") ?? "";
  const view = await readEconomy(id, username);
  const social = await readSocial(id, username);
  return Response.json({ view, social });
}

export async function POST(request: Request) {
  const id = await playerId(request);
  if (!id) return Response.json({ ok: false }, { status: 401 });
  const body = (await request.json()) as {
    action?: string;
    cash?: number;
    energy?: number;
    employed?: boolean;
    onShift?: boolean;
    vehicles?: string[];
    businesses?: string[];
    levels?: Record<string, number>;
    shares?: Record<string, number>;
    basis?: Record<string, number>;
    items?: string[];
    stockProfit?: number;
    objectivesDone?: number;
    username?: string;
    businessId?: string;
    stockId?: string;
    quantity?: number;
    side?: "buy" | "sell";
    eventId?: string;
  };
  const result = await postEconomy(id, body);
  if (result.error) return Response.json({ ok: false, reason: result.error, view: result.view, social: result.social }, { status: 400 });
  return Response.json({ ok: true, view: result.view, social: result.social });
}
