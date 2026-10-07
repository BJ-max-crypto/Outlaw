import { creditWatchedReward } from "@/lib/server/world";
import { playerId } from "@/lib/server/identity";

export async function POST(request: Request) {
  const id = await playerId(request);
  if (!id) return Response.json({ ok: false }, { status: 401 });
  const body = (await request.json()) as { amount?: number; type?: string };
  const cash = await creditWatchedReward(id, Number(body.amount));
  if (cash === null) return Response.json({ ok: false }, { status: 400 });
  return Response.json({ ok: true, cash, type: typeof body.type === "string" ? body.type : "" });
}
