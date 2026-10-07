import { playerId } from "@/lib/server/identity";
import { postEconomy, readEconomy } from "@/lib/server/ledger";

export async function GET(request: Request) {
  const id = await playerId(request);
  if (!id) return Response.json({ view: null }, { status: 401 });
  const url = new URL(request.url);
  const view = await readEconomy(id, url.searchParams.get("username") ?? "");
  return Response.json({ view });
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
  if (result.error) return Response.json({ ok: false, reason: result.error, view: result.view }, { status: 400 });
  return Response.json({ ok: true, view: result.view });
}
