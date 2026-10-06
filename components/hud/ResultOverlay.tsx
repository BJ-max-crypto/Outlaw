"use client";

import { useEffect, useState } from "react";
import { formatCash } from "@/lib/game/format";
import type { HeistResult } from "@/lib/game/types";

type ResultOverlayProps = {
  kind: "complete" | "busted";
  result: HeistResult;
  onAgain: () => void;
};

export default function ResultOverlay({ kind, result, onAgain }: ResultOverlayProps) {
  const earned = useCountUp(kind === "complete" ? result.earned : result.seized);
  const success = kind === "complete";

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0e0f12]/78 p-6">
      <div className="rise w-full max-w-md rounded-3xl border border-white/10 bg-[#17191e] px-8 py-10 text-center shadow-2xl">
        <p className="text-[11px] font-semibold tracking-[0.36em] text-[#a39e94]">
          {success ? "CLEAN ENOUGH" : "NO GETAWAY"}
        </p>
        <h2 className="font-display mt-2 text-7xl leading-none text-[#f4f1ea]">
          {success ? "HEIST COMPLETE" : "BUSTED"}
        </h2>
        <p className="mt-4 text-[#d9d3c7]">
          {success ? "You actually got out." : "They kept the bag."}
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 text-left">
          <Stat
            label={success ? "MONEY EARNED" : "SEIZED"}
            value={formatCash(earned)}
            tone={success ? "gold" : "danger"}
          />
          <Stat label="TOTAL CASH" value={formatCash(result.total)} tone="cream" />
        </div>
        <button
          type="button"
          onClick={onAgain}
          className="mt-8 w-full rounded-full bg-[#e25b2a] px-6 py-3 text-sm font-semibold tracking-[0.18em] text-[#1a0d08] transition hover:bg-[#ef6d3a] active:translate-y-px"
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "gold" | "cream" | "danger";
}) {
  const color =
    tone === "gold" ? "text-[#d7c08a]" : tone === "danger" ? "text-[#f0a8a2]" : "text-[#f4f1ea]";
  return (
    <div className="rounded-2xl bg-black/25 px-4 py-3">
      <p className="text-[10px] tracking-[0.2em] text-[#a39e94]">{label}</p>
      <p className={`font-display mt-1 text-4xl leading-none ${color}`}>{value}</p>
    </div>
  );
}

function useCountUp(target: number): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 680;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return value;
}
