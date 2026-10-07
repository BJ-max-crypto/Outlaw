"use client";

import { useEffect, useState } from "react";
import { SHOP_REWARDS, SHOP_VISIBLE, type ShopReward } from "@/lib/shop/rewards";

type ShopButtonProps = {
  onReward: (reward: ShopReward, report: (index: number, total: number) => void) => Promise<boolean>;
};

type ActiveBoost = { id: string; name: string; until: number };

export default function ShopButton({ onReward }: ShopButtonProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState("");
  const [active, setActive] = useState<ActiveBoost[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  if (!SHOP_VISIBLE) return null;
  const live = active.filter((boost) => boost.until > now);

  const choose = async (reward: ShopReward) => {
    if (busy) return;
    setBusy(true);
    setNote("");
    setProgress(reward.ads > 1 ? "AD 1 OF 2" : "AD PLAYING");
    const ok = await onReward(reward, (index, total) => {
      setProgress(total > 1 ? `AD ${index} OF ${total}` : "AD PLAYING");
    });
    setBusy(false);
    setProgress("");
    if (!ok) {
      setNote("The ad did not finish.");
      return;
    }
    setNote("");
    if (reward.ms > 0) {
      setActive((current) => [...current.filter((boost) => boost.id !== reward.id), { id: reward.id, name: reward.name, until: Date.now() + reward.ms }]);
    }
    setOpen(false);
  };

  return (
    <>
      <div className="pointer-events-auto absolute bottom-4 left-4 z-20 flex flex-col items-start gap-2">
        {live.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#17191e]/92 px-3 py-2">
            {live.map((boost) => (
              <p key={boost.id} className="text-[10px] font-semibold tracking-[0.16em] text-[#d7c08a]">
                {boost.name} · {Math.ceil((boost.until - now) / 1000)}s
              </p>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setNote("");
            setOpen(true);
          }}
          className="rounded-full bg-[#e25b2a] px-5 py-2.5 text-sm font-semibold tracking-[0.18em] text-[#1a0d08]"
        >
          STORE
        </button>
      </div>
      {open && (
        <div className="runout-chrome absolute inset-0 z-40 flex items-center justify-center bg-[#0e0f12]/75 p-6">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#17191e] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.42em] text-[#e25b2a]">STORE</p>
                <h2 className="font-display mt-2 text-5xl leading-none text-[#f4f1ea]">Add-ons</h2>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
                className="text-sm tracking-[0.16em] text-[#a39e94] disabled:opacity-40"
              >
                CLOSE
              </button>
            </div>
            <ul className="mt-5 space-y-2">
              {SHOP_REWARDS.map((reward) => (
                <li key={reward.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void choose(reward)}
                    className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left disabled:opacity-60"
                  >
                    <span className="block text-[12px] font-semibold tracking-[0.14em] text-[#f4f1ea]">{reward.name}</span>
                    <span className="mt-1 block text-[12px] text-[#a39e94]">{reward.detail}</span>
                    <span className="mt-2 block text-[10px] font-semibold tracking-[0.18em] text-[#d7c08a]">
                      {reward.ads === 1 ? "WATCH 1 AD" : `WATCH ${reward.ads} ADS`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {(progress || note) && <p className="mt-4 text-sm text-[#e7b8a4]">{progress || note}</p>}
          </div>
        </div>
      )}
    </>
  );
}
