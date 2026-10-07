/**
 * Rewarded-ad catalog. The shop UI stays hidden until Adsense is connected.
 * A completed rewarded ad should POST /api/shop with the reward id.
 */
export type ShopReward = {
  id: string;
  name: string;
  detail: string;
  multiplier: number;
  ms: number;
  cash: number;
};

export const SHOP_REWARDS: ShopReward[] = [
  {
    id: "double-earnings",
    name: "DOUBLE EARNINGS",
    detail: "Two times all earnings for 30 seconds.",
    multiplier: 2,
    ms: 30_000,
    cash: 0,
  },
  {
    id: "overtime",
    name: "OVERTIME",
    detail: "Two times all earnings for 60 seconds.",
    multiplier: 2,
    ms: 60_000,
    cash: 0,
  },
  {
    id: "stake",
    name: "QUICK STAKE",
    detail: "A small cash drop after the ad.",
    multiplier: 1,
    ms: 0,
    cash: 80,
  },
];

export const SHOP_VISIBLE = false;

export function rewardById(id: string): ShopReward | undefined {
  return SHOP_REWARDS.find((reward) => reward.id === id);
}
