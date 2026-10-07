export const REWARDED_AD_UNIT = "/22639388115/rewarded_web_example";

export type RewardPayload = {
  amount: number;
  type: string;
};

type ReadyEvent = {
  makeRewardedVisible: () => void;
};

declare global {
  interface Window {
    __rewardedSlotReady?: ReadyEvent | null;
    __onRewardedSlotGranted?: (payload: RewardPayload) => void;
  }
}

export function rewardedAdReady(): boolean {
  return typeof window.__rewardedSlotReady?.makeRewardedVisible === "function";
}

/** Shows the out-of-page rewarded slot when `rewardedSlotReady` has already fired. */
export function showRewardedAd(): boolean {
  const event = window.__rewardedSlotReady;
  if (!event || typeof event.makeRewardedVisible !== "function") return false;
  window.__rewardedSlotReady = null;
  event.makeRewardedVisible();
  return true;
}
