"use client";

import { formatCash } from "@/lib/game/format";
import type { MissionResult as Result } from "@/game/outrun/types";

type MissionResultProps = {
  result: Result;
  onReplay: () => void;
  onCity: () => void;
};

export default function MissionResult({ result, onReplay, onCity }: MissionResultProps) {
  const title = result.success ? "CLEAR" : result.reason === "time" ? "OUT OF TIME" : "CORNERED";
  const seconds = Math.max(0, Math.floor(result.timeLeftMs / 1000));
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#070b10]/75 p-4">
      <section className="rise w-[min(28rem,100%)] rounded-3xl border border-white/10 bg-[#121820] p-6 text-center shadow-2xl">
        <p className="text-[11px] font-semibold tracking-[0.32em] text-[#d7c08a]">GETAWAY</p>
        <h2 className="font-display mt-2 text-6xl leading-none text-[#f4f1ea]">{title}</h2>
        <p className="font-display mt-4 text-5xl text-[#d7c08a]">{result.success ? formatCash(result.payout) : "$0"}</p>
        <p className="mt-2 text-sm text-[#a39e94]">
          {seconds}s left · {result.tags} tag{result.tags === 1 ? "" : "s"}
        </p>
        {result.parts.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm text-[#f4f1ea]">
            {result.parts.map((part) => (
              <li key={part.label} className="flex justify-between gap-4">
                <span className="text-[#a39e94]">{part.label}</span>
                <span>{part.amount < 0 ? `−${formatCash(-part.amount)}` : formatCash(part.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={onReplay} className="rounded-full bg-[#d7c08a] px-5 py-2 text-[11px] font-semibold tracking-[0.16em] text-[#1a1408]">
            REPLAY
          </button>
          <button type="button" onClick={onCity} className="rounded-full border border-white/15 px-5 py-2 text-[11px] font-semibold tracking-[0.16em] text-[#f4f1ea]">
            CITY
          </button>
        </div>
      </section>
    </div>
  );
}
