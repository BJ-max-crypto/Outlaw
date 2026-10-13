"use client";

import { buildBoard } from "@/game/outrun/leaderboard";
import { formatCash } from "@/lib/game/format";
import type { SaveData } from "@/game/outrun/types";

type RankBoardProps = {
  save: SaveData;
  onClose: () => void;
};

export default function RankBoard({ save, onClose }: RankBoardProps) {
  const rows = buildBoard(save);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#070b10]/80 p-4">
      <section className="rise max-h-full w-[min(44rem,100%)] overflow-y-auto rounded-3xl border border-white/10 bg-[#121820] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.32em] text-[#d7c08a]">RANKS</p>
            <h2 className="font-display mt-1 text-5xl leading-none text-[#f4f1ea]">Net worth</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-[#f4f1ea] px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-[#141820]">
            CITY
          </button>
        </div>
        <p className="mt-3 rounded-2xl border border-[#d7c08a]/30 bg-[#d7c08a]/10 px-3 py-2 text-sm text-[#f4f1ea]">
          Rows marked DEMO are sample rivals for this prototype. They are not live players.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm text-[#f4f1ea]">
            <thead className="bg-white/5 text-[10px] tracking-[0.16em] text-[#a39e94]">
              <tr>
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">NAME</th>
                <th className="px-3 py-2 font-semibold">WORTH</th>
                <th className="px-3 py-2 font-semibold">INCOME</th>
                <th className="px-3 py-2 font-semibold">BEST</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className={row.origin === "local" ? "bg-[#d7c08a]/10" : "border-t border-white/5"}>
                  <td className="px-3 py-2 text-[#a39e94]">{index + 1}</td>
                  <td className="px-3 py-2">
                    {row.name}{" "}
                    {row.origin === "demo" && <span className="text-[10px] tracking-[0.14em] text-[#d7c08a]">DEMO</span>}
                    {row.origin === "local" && <span className="text-[10px] tracking-[0.14em] text-[#9ddeb4]">YOU</span>}
                  </td>
                  <td className="px-3 py-2">{formatCash(row.netWorth)}</td>
                  <td className="px-3 py-2">{formatCash(row.incomePerMinute)}/m</td>
                  <td className="px-3 py-2">{formatCash(row.bestScore)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
