"use client";

import { useEffect, useRef, useState } from "react";
import { gameBus } from "@/lib/game/bus";
import { rewardedAdReady, showRewardedAd, type RewardPayload } from "@/lib/ads/gptRewarded";

type WatchAdButtonProps = {
  onReward: (reward: RewardPayload) => void;
};

export default function WatchAdButton({ onReward }: WatchAdButtonProps) {
  const onRewardRef = useRef(onReward);
  onRewardRef.current = onReward;
  const [note, setNote] = useState("");
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    window.__onRewardedSlotGranted = (payload) => {
      if (!payload || !Number.isFinite(payload.amount)) return;
      onRewardRef.current({ amount: payload.amount, type: String(payload.type ?? "") });
    };
    const release = () => {
      setPlaying(false);
      gameBus.emit("ad-hold", false);
    };
    window.addEventListener("rewarded-slot-closed", release);
    return () => {
      delete window.__onRewardedSlotGranted;
      window.removeEventListener("rewarded-slot-closed", release);
    };
  }, []);

  return (
    <div className="runout-chrome pointer-events-auto absolute bottom-20 left-4 z-20 flex max-w-xs flex-col items-start gap-1">
      <button
        type="button"
        style={playing ? { visibility: "hidden" } : undefined}
        onClick={() => {
          if (!rewardedAdReady()) {
            setNote("The ad is not ready yet.");
            return;
          }
          setNote("");
          setPlaying(true);
          gameBus.emit("ad-hold", true);
          if (!showRewardedAd()) {
            setPlaying(false);
            gameBus.emit("ad-hold", false);
          }
        }}
        className="rounded-full border border-[#d7c08a] bg-[#17191e]/92 px-4 py-2.5 text-left text-sm font-semibold text-[#f4f1ea]"
      >
        Watch an ad to get money
      </button>
      {note ? <p className="text-[10px] font-semibold tracking-[0.14em] text-[#a39e94]">{note}</p> : null}
    </div>
  );
}
