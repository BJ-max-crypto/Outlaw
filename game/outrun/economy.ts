import { BUSINESSES, OUTRUN, businessDef, type BusinessId } from "./config";
import type { BusinessState, SaveData } from "./types";

export function emptyBusinesses(): Record<BusinessId, BusinessState> {
  return {
    convenience: { owned: false, upgraded: false },
    warehouse: { owned: false, upgraded: false },
  };
}

export function freshSave(now: number, name = "Runner"): SaveData {
  return {
    version: 1,
    name: name.trim().slice(0, 16) || "Runner",
    cash: OUTRUN.startCash,
    businesses: emptyBusinesses(),
    bestScore: 0,
    lastSeen: now,
    bankedMs: 0,
  };
}

export function incomePerMinute(save: SaveData): number {
  return BUSINESSES.reduce((sum, def) => {
    const state = save.businesses[def.id];
    if (!state?.owned) return sum;
    return sum + (state.upgraded ? def.upgradedIncomePerMinute : def.incomePerMinute);
  }, 0);
}

export function assetValue(save: SaveData): number {
  return BUSINESSES.reduce((sum, def) => {
    const state = save.businesses[def.id];
    if (!state?.owned) return sum;
    return sum + (state.upgraded ? def.upgradedValue : def.value);
  }, 0);
}

export function netWorth(save: SaveData): number {
  return Math.max(0, Math.floor(save.cash)) + assetValue(save);
}

/**
 * Turns elapsed time into whole dollars once.
 * Call this from the single app clock. Do not also run a second income timer.
 * Time away longer than eight hours only pays for eight hours.
 */
export function settle(save: SaveData, now: number): SaveData {
  const rate = incomePerMinute(save);
  const elapsed = Math.max(0, now - save.lastSeen);
  const capped = Math.min(OUTRUN.offlineCapMs, elapsed);
  const totalMs = save.bankedMs + capped;
  const earned = rate > 0 ? Math.floor((totalMs * rate) / 60_000) : 0;
  const usedMs = rate > 0 ? Math.floor((earned * 60_000) / rate) : totalMs;
  return {
    ...save,
    cash: Math.max(0, Math.floor(save.cash) + earned),
    bankedMs: Math.max(0, totalMs - usedMs),
    lastSeen: now,
  };
}

export function purchase(
  save: SaveData,
  id: BusinessId,
  now: number,
): { save: SaveData; error?: string } {
  const next = settle(save, now);
  const state = next.businesses[id];
  const def = businessDef(id);
  if (state.owned) return { save: next, error: "Already owned." };
  if (next.cash < def.cost) return { save: next, error: "Not enough cash." };
  return {
    save: {
      ...next,
      cash: next.cash - def.cost,
      businesses: { ...next.businesses, [id]: { owned: true, upgraded: false } },
    },
  };
}

export function upgrade(
  save: SaveData,
  id: BusinessId,
  now: number,
): { save: SaveData; error?: string } {
  const next = settle(save, now);
  const state = next.businesses[id];
  const def = businessDef(id);
  if (!state.owned) return { save: next, error: "Buy it first." };
  if (state.upgraded) return { save: next, error: "Already upgraded." };
  if (next.cash < def.upgradeCost) return { save: next, error: "Not enough cash." };
  return {
    save: {
      ...next,
      cash: next.cash - def.upgradeCost,
      businesses: { ...next.businesses, [id]: { owned: true, upgraded: true } },
    },
  };
}

export function grantScore(save: SaveData, payout: number, now: number): SaveData {
  const next = settle(save, now);
  const pay = Math.max(0, Math.floor(payout));
  return {
    ...next,
    cash: next.cash + pay,
    bestScore: Math.max(next.bestScore, pay),
  };
}

export function missionPayout(timeLeftMs: number, tags: number): { payout: number; parts: { label: string; amount: number }[] } {
  const seconds = Math.max(0, Math.floor(timeLeftMs / 1000));
  const timeBonus = seconds * OUTRUN.timeBonusPerSecond;
  const clean = tags === 0 ? OUTRUN.cleanBonus : 0;
  const penalty = tags * OUTRUN.tagPenalty;
  const raw = OUTRUN.baseReward + timeBonus + clean - penalty;
  const payout = Math.max(OUTRUN.minimumClearPay, raw);
  const parts = [
    { label: "Clear", amount: OUTRUN.baseReward },
    { label: "Time left", amount: timeBonus },
  ];
  if (clean > 0) parts.push({ label: "Clean run", amount: clean });
  if (penalty > 0) parts.push({ label: "Tagged", amount: -penalty });
  if (payout !== raw) parts.push({ label: "Floor", amount: payout - raw });
  return { payout, parts };
}
