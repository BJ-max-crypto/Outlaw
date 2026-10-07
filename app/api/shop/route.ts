import { SHOP_REWARDS } from "@/lib/shop/rewards";
import { claimReward } from "@/lib/server/world";
import { playerId } from "@/lib/server/identity";

export async function GET() {
  return Response.json({
    visible: true,
    rewards: SHOP_REWARDS,
  });
}

export async function POST(request: Request) {
  const id = await playerId(request);
  if (!id) return Response.json({ ok: false }, { status: 401 });
  const body = (await request.json()) as { rewardId?: string };
  const reward = await claimReward(id, body.rewardId ?? "");
  if (!reward) return Response.json({ ok: false, reason: "reward" }, { status: 400 });
  return Response.json({ ok: true, reward });
}
