"use client";

import { BUSINESSES, businessDef, type BusinessId } from "@/game/outrun/config";
import { incomePerMinute, netWorth } from "@/game/outrun/economy";
import { formatCash } from "@/lib/game/format";
import type { SaveData } from "@/game/outrun/types";

type BusinessDeskProps = {
  save: SaveData;
  notice: string | null;
  onBuy: (id: BusinessId) => void;
  onUpgrade: (id: BusinessId) => void;
  onReset: () => void;
  onClose: () => void;
};

export default function BusinessDesk({ save, notice, onBuy, onUpgrade, onReset, onClose }: BusinessDeskProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#070b10]/80 p-4">
      <section className="rise max-h-full w-[min(44rem,100%)] overflow-y-auto rounded-3xl border border-white/10 bg-[#121820] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.32em] text-[#d7c08a]">BUSINESSES</p>
            <h2 className="font-display mt-1 text-5xl leading-none text-[#f4f1ea]">The operation</h2>
            <p className="mt-2 text-sm text-[#a39e94]">
              {formatCash(incomePerMinute(save))}/min · worth {formatCash(netWorth(save))}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-[#f4f1ea] px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-[#141820]">
            CITY
          </button>
        </div>
        {notice && <p className="mt-4 text-sm text-[#e7b8a4]">{notice}</p>}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {BUSINESSES.map((def) => {
            const state = save.businesses[def.id];
            const wage = state.upgraded ? def.upgradedIncomePerMinute : def.incomePerMinute;
            return (
              <article key={def.id} className="rounded-2xl border border-white/10 bg-[#0c1018] p-4">
                <p className="text-[10px] font-semibold tracking-[0.22em] text-[#d7c08a]">{state.owned ? "OWNED" : "FOR SALE"}</p>
                <h3 className="mt-1 text-lg text-[#f4f1ea]">{def.name}</h3>
                <p className="mt-1 text-sm text-[#a39e94]">{def.blurb}</p>
                <p className="mt-3 font-display text-4xl text-[#d7c08a]">{state.owned ? `${formatCash(wage)}/MIN` : formatCash(def.cost)}</p>
                <p className="mt-1 text-[11px] tracking-[0.12em] text-[#a39e94]">
                  {state.owned ? `Value ${formatCash(state.upgraded ? def.upgradedValue : def.value)}` : `${formatCash(def.incomePerMinute)}/min after purchase`}
                </p>
                {!state.owned && (
                  <button
                    type="button"
                    disabled={save.cash < def.cost}
                    onClick={() => onBuy(def.id)}
                    className="mt-4 w-full rounded-full bg-[#d7c08a] px-3 py-2 text-[11px] font-semibold tracking-[0.14em] text-[#1a1408] disabled:opacity-40"
                  >
                    BUY {formatCash(def.cost)}
                  </button>
                )}
                {state.owned && !state.upgraded && (
                  <button
                    type="button"
                    disabled={save.cash < businessDef(def.id).upgradeCost}
                    onClick={() => onUpgrade(def.id)}
                    className="mt-4 w-full rounded-full bg-[#e25b2a] px-3 py-2 text-[11px] font-semibold tracking-[0.14em] text-[#1a0d08] disabled:opacity-40"
                  >
                    UPGRADE {formatCash(def.upgradeCost)} · {formatCash(def.upgradedIncomePerMinute)}/MIN
                  </button>
                )}
                {state.upgraded && <p className="mt-4 text-[11px] font-semibold tracking-[0.16em] text-[#9ddeb4]">UPGRADED</p>}
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-xs leading-5 text-[#a39e94]">
          Wages keep running while you are away, up to eight hours. One upgrade is available for each business.
        </p>
        <button type="button" onClick={onReset} className="mt-3 text-[11px] tracking-[0.16em] text-[#a39e94] underline">
          RESET SAVE
        </button>
      </section>
    </div>
  );
}
