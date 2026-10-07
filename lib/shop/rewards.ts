/**
 * Rewarded-ad catalog. A finished ad POSTs /api/shop with the reward id.
 * Cash and earnings are checked on the server. Speed, energy, and gas run on the player.
 */
export type ShopReward = {
  id: string;
  name: string;
  detail: string;
  ads: number;
  ms: number;
  cash: number;
  earnings: number;
  speed: number;
  energy: number;
  gas: number;
};

export const SHOP_REWARDS: ShopReward[] = [
  {
    id: "double-speed",
    name: "DOUBLE SPEED",
    detail: "Walk and drive at 2× for 30 seconds.",
    ads: 1,
    ms: 30_000,
    cash: 0,
    earnings: 1,
    speed: 2,
    energy: 1,
    gas: 1,
  },
  {
    id: "double-earnings",
    name: "DOUBLE EARNINGS",
    detail: "All pay is 2× for 30 seconds.",
    ads: 1,
    ms: 30_000,
    cash: 0,
    earnings: 2,
    speed: 1,
    energy: 1,
    gas: 1,
  },
  {
    id: "half-energy",
    name: "HALF ENERGY",
    detail: "Energy drains at half speed for 30 seconds.",
    ads: 1,
    ms: 30_000,
    cash: 0,
    earnings: 1,
    speed: 1,
    energy: 0.5,
    gas: 1,
  },
  {
    id: "half-gas",
    name: "HALF GAS",
    detail: "The tank burns at half speed for 30 seconds.",
    ads: 1,
    ms: 30_000,
    cash: 0,
    earnings: 1,
    speed: 1,
    energy: 1,
    gas: 0.5,
  },
  {
    id: "cash-drop",
    name: "$1,000",
    detail: "Watch 2 ads. Take $1,000.",
    ads: 2,
    ms: 0,
    cash: 1000,
    earnings: 1,
    speed: 1,
    energy: 1,
    gas: 1,
  },
];

export const SHOP_VISIBLE = true;

export function rewardById(id: string): ShopReward | undefined {
  return SHOP_REWARDS.find((reward) => reward.id === id);
}
