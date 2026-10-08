import {
  buyBoat,
  buyIsland,
  buyReinforcement,
  createSession,
  joinSession,
  leading,
  readSession,
  reportMove,
  startSession,
  syncMember,
} from "@/lib/server/world";
import { playerId } from "@/lib/server/identity";

type Body = {
  action?: string;
  code?: string;
  username?: string;
  cash?: number;
  targetId?: string;
  businesses?: string[];
  employed?: boolean;
  islandId?: string;
  x?: number;
  y?: number;
  fromId?: string;
  toId?: string;
  along?: number;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const session = await readSession(code);
  if (!session) return Response.json({ session: null }, { status: 404 });
  const id = await playerId(request);
  return Response.json({ session, leading: id ? leading(session, id) : false });
}

export async function POST(request: Request) {
  const id = await playerId(request);
  if (!id) return Response.json({ ok: false }, { status: 401 });
  const body = (await request.json()) as Body;
  const username = (body.username ?? "").trim().slice(0, 16) || "PLAYER";
  if (body.action === "create") {
    return Response.json({ ok: true, session: await createSession(id, username) });
  }
  if (body.action === "join") {
    const result = await joinSession(body.code ?? "", id, username);
    if ("error" in result) {
      const status = result.error === "started" ? 409 : result.error === "full" ? 409 : 404;
      return Response.json({ ok: false, reason: result.error }, { status });
    }
    return Response.json({ ok: true, session: result.session });
  }
  if (body.action === "start") {
    const session = await startSession(body.code ?? "", id);
    if (!session) return Response.json({ ok: false, reason: "host" }, { status: 403 });
    return Response.json({ ok: true, session });
  }
  if (body.action === "move") {
    const places = await reportMove(body.code ?? "", id, username, {
      islandId: body.islandId ?? "",
      x: Number(body.x),
      y: Number(body.y),
      fromId: body.fromId ?? "",
      toId: body.toId ?? "",
      along: Number(body.along),
    });
    if (!places) return Response.json({ ok: false }, { status: 404 });
    return Response.json({ ok: true, places });
  }
  if (body.action === "sync") {
    const session = await syncMember(body.code ?? "", id, {
      cash: body.cash,
      businesses: body.businesses,
      employed: body.employed,
    });
    if (!session) return Response.json({ ok: false }, { status: 404 });
    return Response.json({ ok: true, session, leading: leading(session, id) });
  }
  if (body.action === "boat" || body.action === "reinforcement" || body.action === "island") {
    const cash = Number(body.cash);
    const result =
      body.action === "boat"
        ? await buyBoat(body.code ?? "", id, cash)
        : body.action === "reinforcement"
          ? await buyReinforcement(body.code ?? "", id, cash)
          : await buyIsland(body.code ?? "", id, body.targetId ?? "", cash);
    if ("error" in result) return Response.json({ ok: false, reason: result.error }, { status: 400 });
    return Response.json({ ok: true, session: result.session, leading: leading(result.session, id) });
  }
  return Response.json({ ok: false }, { status: 400 });
}
