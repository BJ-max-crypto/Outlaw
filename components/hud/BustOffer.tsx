"use client";

import { formatCash } from "@/lib/game/format";

type BustOfferProps = {
  cash: number;
  loseHalf: number;
  loseQuarter: number;
  busy: boolean;
  note: string;
  onWatch: () => void;
  onTake: () => void;
};

export default function BustOffer({ cash, loseHalf, loseQuarter, busy, note, onWatch, onTake }: BustOfferProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0e0f12]/80 p-6">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#17191e] p-6 shadow-2xl">
        <p className="text-[11px] font-semibold tracking-[0.42em] text-[#e25b2a]">BUSTED</p>
        <h2 className="font-display mt-2 text-6xl leading-none text-[#f4f1ea]">Caught</h2>
        <p className="mt-4 text-sm leading-snug text-[#d9d3c7]">
          You are holding {formatCash(cash)}. Take the hit and lose half, or watch an ad and lose a quarter.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onWatch}
            className="rounded-full bg-[#e25b2a] px-6 py-3 text-sm font-semibold tracking-[0.16em] text-[#1a0d08] disabled:opacity-60"
          >
            {busy ? "AD PLAYING" : `WATCH AN AD · LOSE ${formatCash(loseQuarter)}`}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onTake}
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold tracking-[0.16em] text-[#f4f1ea] disabled:opacity-60"
          >
            TAKE THE HIT · LOSE {formatCash(loseHalf)}
          </button>
        </div>
        {note && <p className="mt-4 text-sm text-[#e7b8a4]">{note}</p>}
      </div>
    </div>
  );
}
