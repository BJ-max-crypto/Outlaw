"use client";

import { useState } from "react";
import { formatCash } from "@/lib/game/format";
import { businessInterval, formatRate, type EconomyView } from "@/lib/economy/model";

function paycheck(incomePerMin: number, level: number): number {
  const ticks = 60_000 / businessInterval(level);
  if (!Number.isFinite(ticks) || ticks <= 0) return 0;
  return Math.round(incomePerMin / ticks);
}

export type DepthPanel = "goals" | "profile" | "ranks" | null;
export type BoardName = "netWorth" | "cash" | "businesses" | "stocks" | "achievements";

type RankRow = { id: string; username: string; value: number };

type DepthLayerProps = {
  view: EconomyView | null;
  panel: DepthPanel;
  spot: { id: string; name: string } | null;
  board: BoardName;
  rows: RankRow[];
  selfRank: number | null;
  onPanel: (panel: DepthPanel) => void;
  onBoard: (board: BoardName) => void;
  onUpgrade: (id: string) => void;
  onClaimGoal: (id: string) => void;
  onClaimEvent: (id: string) => void;
  onOpenPlayer: (id: string) => void;
};

const BOARDS: { id: BoardName; label: string }[] = [
  { id: "netWorth", label: "WORTH" },
  { id: "cash", label: "CASH" },
  { id: "businesses", label: "SHOPS" },
  { id: "stocks", label: "STOCKS" },
  { id: "achievements", label: "GOALS" },
];

export default function DepthLayer({
  view,
  panel,
  spot,
  board,
  rows,
  selfRank,
  onPanel,
  onBoard,
  onUpgrade,
  onClaimGoal,
  onClaimEvent,
  onOpenPlayer,
}: DepthLayerProps) {
  const [hiddenEvent, setHiddenEvent] = useState<string | null>(null);
  const owned = view?.businesses.find((business) => business.id === spot?.id);
  const event = view?.event;
  const showEvent = Boolean(event && (event.claimable || hiddenEvent !== event.id));
  return (
    <>
      {showEvent && event && (
        <div className="rise pointer-events-auto absolute left-1/2 top-16 z-20 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-[#d7c08a]/40 bg-[#17191e]/95 px-4 py-3 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-semibold tracking-[0.28em] text-[#d7c08a]">{event.name}</p>
            <button type="button" onClick={() => setHiddenEvent(event.id)} className="text-[10px] tracking-[0.14em] text-[#a39e94]">
              HIDE
            </button>
          </div>
          <p className="mt-1 text-sm text-[#f4f1ea]">{event.detail}</p>
          <p className="mt-1 text-[10px] tracking-[0.12em] text-[#a39e94]">{Math.max(1, Math.ceil(event.endsIn / 60000))} MIN LEFT</p>
          {event.claimable && (
            <button
              type="button"
              onClick={() => onClaimEvent(event.id)}
              className="mt-2 rounded-full bg-[#d7c08a] px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-[#1a1408]"
            >
              CLAIM
            </button>
          )}
        </div>
      )}
      {owned && spot && (
        <div className="pointer-events-auto absolute bottom-36 left-1/2 z-20 w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#17191e]/95 p-4 shadow-xl">
          <p className="text-[10px] font-semibold tracking-[0.28em] text-[#a39e94]">{spot.name}</p>
          <p className="mt-1 text-sm text-[#f4f1ea]">
            Pays {formatCash(paycheck(owned.incomePerMin, owned.level))} every {formatRate(businessInterval(owned.level))} · {formatCash(owned.incomePerMin)}/min
          </p>
          {owned.upgradeCost !== null && (
            <button
              type="button"
              onClick={() => onUpgrade(owned.id)}
              className="mt-3 rounded-full bg-[#e25b2a] px-4 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-[#1a0d08]"
            >
              EVERY {formatRate(businessInterval(owned.level + 1))} · {formatCash(owned.upgradeCost)}
            </button>
          )}
        </div>
      )}
      {panel && view && (
        <div className="pointer-events-auto absolute left-1/2 top-1/2 z-40 max-h-[80dvh] w-[min(32rem,calc(100%-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-white/10 bg-[#14161b] p-5 shadow-2xl">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.32em] text-[#e25b2a]">
              {panel === "goals" ? "TODAY" : panel === "profile" ? "PROFILE" : "RANKS"}
            </p>
            <button type="button" onClick={() => onPanel(null)} className="rounded-full bg-[#f4f1ea] px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-[#17191e]">
              CLOSE
            </button>
          </div>
          {panel === "goals" && (
            <ul className="mt-4 space-y-3">
              {view.objectives.map((goal) => (
                <li key={goal.id} className="rounded-2xl border border-white/10 p-3">
                  <div className="flex items-center justify-between gap-3 text-sm text-[#f4f1ea]">
                    <span>{goal.title}</span>
                    <span className="text-[11px] text-[#a39e94]">{formatCash(goal.reward)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-[#e25b2a]" style={{ width: `${Math.min(100, (goal.progress / goal.goal) * 100)}%` }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[10px] tracking-[0.12em] text-[#a39e94]">
                      {Math.min(goal.progress, goal.goal)} / {goal.goal}
                    </p>
                    <button
                      type="button"
                      disabled={goal.claimed || goal.progress < goal.goal}
                      onClick={() => onClaimGoal(goal.id)}
                      className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-[#f4f1ea] disabled:opacity-40"
                    >
                      {goal.claimed ? "CLAIMED" : "CLAIM"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {panel === "profile" && (
            <div className="mt-4 space-y-4 text-sm text-[#f4f1ea]">
              <div>
                <p className="font-display text-4xl">{view.username || "PLAYER"}</p>
                <p className="mt-1 text-[11px] tracking-[0.16em] text-[#a39e94]">RANK {view.rank}</p>
              </div>
              <p>Cash {formatCash(view.cash)}</p>
              <p>Net worth {formatCash(view.netWorth)}</p>
              <p>
                Portfolio {formatCash(view.portfolio)} · {view.returnPct}%
              </p>
              <div>
                <p className="text-[10px] tracking-[0.22em] text-[#a39e94]">BUSINESSES</p>
                <ul className="mt-1 space-y-1">
                  {view.businesses.length === 0 && <li className="text-[#a39e94]">None yet</li>}
                  {view.businesses.map((business) => (
                    <li key={business.id}>
                      {business.name} · every {formatRate(businessInterval(business.level))} · {formatCash(business.incomePerMin)}/min
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.22em] text-[#a39e94]">ACHIEVEMENTS</p>
                <ul className="mt-1 space-y-1">
                  {view.achievements.filter((entry) => entry.unlocked).length === 0 && <li className="text-[#a39e94]">None yet</li>}
                  {view.achievements
                    .filter((entry) => entry.unlocked)
                    .map((entry) => (
                      <li key={entry.id}>{entry.name}</li>
                    ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.22em] text-[#a39e94]">ITEMS</p>
                <ul className="mt-1 space-y-1">
                  {view.items.length === 0 && <li className="text-[#a39e94]">None yet</li>}
                  {view.items.map((item) => (
                    <li key={item.id}>
                      {item.name} · {formatCash(item.value)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          {panel === "ranks" && (
            <div className="mt-4">
              <div className="flex flex-wrap gap-1">
                {BOARDS.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onBoard(entry.id)}
                    className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.12em] ${board === entry.id ? "bg-[#e25b2a] text-[#1a0d08]" : "border border-white/10 text-[#f4f1ea]"}`}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              {selfRank !== null && <p className="mt-3 text-[11px] tracking-[0.16em] text-[#a39e94]">YOUR RANK {selfRank}</p>}
              <ol className="mt-4 space-y-2">
                {rows.map((row, index) => (
                  <li key={row.id}>
                    <button type="button" onClick={() => onOpenPlayer(row.id)} className="flex w-full items-center justify-between text-left text-sm text-[#f4f1ea]">
                      <span>
                        {index + 1}. {row.username}
                      </span>
                      <span className="text-[#d7c08a]">{board === "stocks" ? `${row.value}%` : board === "businesses" || board === "achievements" ? row.value : formatCash(row.value)}</span>
                    </button>
                  </li>
                ))}
                {rows.length === 0 && <li className="text-sm text-[#a39e94]">No scores yet.</li>}
              </ol>
            </div>
          )}
        </div>
      )}
    </>
  );
}
