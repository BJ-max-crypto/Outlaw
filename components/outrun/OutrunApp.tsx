"use client";

import { useEffect, useRef, useState } from "react";
import GameCanvas from "@/components/game/GameCanvas";
import BusinessDesk from "@/components/outrun/BusinessDesk";
import MissionResultCard from "@/components/outrun/MissionResult";
import RankBoard from "@/components/outrun/RankBoard";
import { outrunBus } from "@/game/outrun/bus";
import type { BusinessId } from "@/game/outrun/config";
import { freshSave, grantScore, incomePerMinute, netWorth, purchase, settle, upgrade } from "@/game/outrun/economy";
import { loadSettled, writeSave } from "@/game/outrun/save";
import type { MissionHud, MissionResult, SaveData } from "@/game/outrun/types";
import { formatCash } from "@/lib/game/format";

type Panel = "city" | "business" | "ranks";

const idleHud: MissionHud = {
  mode: "roam",
  objective: "Walk the block, or start a getaway.",
  prompt: "WASD to move",
  timeLeftMs: 0,
  tags: 0,
  carrying: false,
};

export default function OutrunApp() {
  const [ready, setReady] = useState(false);
  const [save, setSave] = useState<SaveData | null>(null);
  const [hud, setHud] = useState<MissionHud>(idleHud);
  const [panel, setPanel] = useState<Panel>("city");
  const [result, setResult] = useState<MissionResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetArmed, setResetArmed] = useState(false);
  const saveRef = useRef<SaveData | null>(null);
  const paidRef = useRef("");

  const commit = (next: SaveData) => {
    saveRef.current = next;
    writeSave(next);
    setSave(next);
  };

  useEffect(() => {
    commit(loadSettled(Date.now()));
    const unsub = [
      outrunBus.on("ready", () => setReady(true)),
      outrunBus.on("hud", setHud),
      outrunBus.on("result", (next) => {
        if (paidRef.current === next.id) return;
        paidRef.current = next.id;
        const current = saveRef.current;
        if (current && next.success) commit(grantScore(current, next.payout, Date.now()));
        setResult(next);
        setPanel("city");
        outrunBus.emit("pause");
      }),
    ];
    const accrue = () => {
      const current = saveRef.current;
      if (!current) return;
      commit(settle(current, Date.now()));
    };
    const timer = window.setInterval(accrue, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") accrue();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      for (const off of unsub) off();
    };
  }, []);

  const openPanel = (next: Panel) => {
    setNotice(null);
    setResetArmed(false);
    if (next === "city") setResult(null);
    setPanel(next);
    if (next === "city") outrunBus.emit("resume");
    else outrunBus.emit("pause");
  };

  const buy = (id: BusinessId) => {
    const current = saveRef.current;
    if (!current) return;
    const outcome = purchase(current, id, Date.now());
    commit(outcome.save);
    setNotice(outcome.error ?? null);
  };

  const lift = (id: BusinessId) => {
    const current = saveRef.current;
    if (!current) return;
    const outcome = upgrade(current, id, Date.now());
    commit(outcome.save);
    setNotice(outcome.error ?? null);
  };

  const reset = () => {
    if (!resetArmed) {
      setResetArmed(true);
      setNotice("Press reset again to wipe this browser save.");
      return;
    }
    commit(freshSave(Date.now(), saveRef.current?.name || "Runner"));
    setResetArmed(false);
    setNotice("Save cleared. Cash is back to $1,000.");
  };

  const startMission = () => {
    setResult(null);
    setPanel("city");
    outrunBus.emit("resume");
    outrunBus.emit("mission-start");
    document.querySelector("canvas")?.focus();
  };

  const closeResult = () => openPanel("city");

  if (!save) {
    return <div className="flex h-dvh items-center justify-center bg-[#070b10] text-sm tracking-[0.28em] text-[#a39e94]">LOADING OUTRUN</div>;
  }

  const seconds = Math.max(0, Math.ceil(hud.timeLeftMs / 1000));
  const wage = incomePerMinute(save);

  return (
    <main className="flex h-dvh flex-col bg-[#070b10] text-[#f4f1ea]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.28em] text-[#d7c08a]">OUTRUN</p>
            <p key={save.cash} className="pop font-display text-4xl leading-none text-[#d7c08a]">
              {formatCash(save.cash)}
            </p>
          </div>
          <div className="text-[11px] tracking-[0.12em] text-[#a39e94]">
            <p>{formatCash(wage)}/MIN</p>
            <p>WORTH {formatCash(netWorth(save))}</p>
            <p>BEST {formatCash(save.bestScore)}</p>
          </div>
        </div>
        <label className="text-[10px] tracking-[0.16em] text-[#a39e94]">
          NAME
          <input
            value={save.name}
            maxLength={16}
            onChange={(event) => commit({ ...saveRef.current!, name: event.target.value.slice(0, 16) })}
            className="ml-2 rounded-full border border-white/15 bg-transparent px-3 py-1 text-sm tracking-normal text-[#f4f1ea] outline-none"
          />
        </label>
        <nav className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openPanel("city")} className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold tracking-[0.14em]">
            CITY
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={startMission}
            className="rounded-full bg-[#d7c08a] px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-[#1a1408] disabled:opacity-40"
          >
            GETAWAY
          </button>
          {hud.mode === "mission" && (
            <button
              type="button"
              onClick={() => outrunBus.emit("mission-abort")}
              className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold tracking-[0.14em]"
            >
              ABORT
            </button>
          )}
          <button type="button" onClick={() => openPanel("business")} className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold tracking-[0.14em]">
            BUSINESS
          </button>
          <button type="button" onClick={() => openPanel("ranks")} className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold tracking-[0.14em]">
            RANKS
          </button>
        </nav>
      </header>
      <div className="relative min-h-0 flex-1">
        <GameCanvas onReady={() => undefined} />
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-4">
          <div className="rounded-full border border-white/10 bg-[#121820]/90 px-4 py-2 text-center text-sm text-[#f4f1ea]">
            {hud.mode === "mission" && (
              <span className={seconds <= 15 ? "mr-3 text-[#e7b8a4]" : "mr-3 text-[#d7c08a]"}>
                {seconds}s · {hud.tags}/3 TAGS{hud.carrying ? " · CARRYING" : ""}
              </span>
            )}
            {hud.objective}
          </div>
        </div>
        {hud.prompt && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
            <p className="rounded-full bg-[#f4f1ea] px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-[#141820]">{hud.prompt}</p>
          </div>
        )}
        {panel === "business" && (
          <BusinessDesk save={save} notice={notice} onBuy={buy} onUpgrade={lift} onReset={reset} onClose={() => openPanel("city")} />
        )}
        {panel === "ranks" && <RankBoard save={save} onClose={() => openPanel("city")} />}
        {result && <MissionResultCard result={result} onReplay={startMission} onCity={closeResult} />}
      </div>
    </main>
  );
}
