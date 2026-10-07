"use client";

import { SHOP_REWARDS, SHOP_VISIBLE } from "@/lib/shop/rewards";

type ShopButtonProps = {
  onReward: (rewardId: string) => void;
};

/** Present in the client, rendered only after Adsense is connected. */
export default function ShopButton({ onReward }: ShopButtonProps) {
  if (!SHOP_VISIBLE) return null;
  return (
    <div className="pointer-events-auto absolute right-4 top-40 z-20 w-52 rounded-2xl border border-white/10 bg-[#17191e]/92 p-3">
      <p className="text-[10px] font-semibold tracking-[0.28em] text-[#a39e94]">SHOP</p>
      <ul className="mt-2 space-y-2">
        {SHOP_REWARDS.map((reward) => (
          <li key={reward.id}>
            <button type="button" onClick={() => onReward(reward.id)} className="w-full rounded-xl bg-white/5 px-2 py-2 text-left">
              <span className="block text-[11px] font-semibold tracking-[0.12em] text-[#f4f1ea]">{reward.name}</span>
              <span className="block text-[10px] text-[#a39e94]">{reward.detail}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
