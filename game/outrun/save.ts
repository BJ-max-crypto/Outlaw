import { freshSave, settle } from "./economy";
import type { BusinessId } from "./config";
import type { SaveData } from "./types";

const KEY = "outrun-save";

function owned(value: unknown, upgraded: boolean): { owned: boolean; upgraded: boolean } {
  const flag = Boolean(value && typeof value === "object" && (value as { owned?: boolean }).owned);
  return { owned: flag, upgraded: flag && upgraded };
}

export function sanitize(input: unknown, now: number): SaveData {
  const blank = freshSave(now);
  if (!input || typeof input !== "object") return blank;
  const raw = input as Partial<SaveData>;
  const businesses = raw.businesses ?? blank.businesses;
  const convenience = businesses.convenience;
  const warehouse = businesses.warehouse;
  const cash = Number(raw.cash);
  const best = Number(raw.bestScore);
  const lastSeen = Number(raw.lastSeen);
  const banked = Number(raw.bankedMs);
  const name = typeof raw.name === "string" ? raw.name.trim().slice(0, 16) : "";
  return {
    version: 1,
    name: name.length >= 2 ? name : blank.name,
    cash: Number.isFinite(cash) ? Math.max(0, Math.floor(cash)) : blank.cash,
    businesses: {
      convenience: owned(convenience, Boolean(convenience?.upgraded)),
      warehouse: owned(warehouse, Boolean(warehouse?.upgraded)),
    },
    bestScore: Number.isFinite(best) ? Math.max(0, Math.floor(best)) : 0,
    lastSeen: Number.isFinite(lastSeen) ? lastSeen : now,
    bankedMs: Number.isFinite(banked) ? Math.max(0, banked) : 0,
  };
}

export function readSave(now = Date.now()): SaveData {
  if (typeof window === "undefined") return freshSave(now);
  try {
    const text = window.localStorage.getItem(KEY);
    if (!text) return freshSave(now);
    return sanitize(JSON.parse(text) as unknown, now);
  } catch {
    return freshSave(now);
  }
}

export function writeSave(save: SaveData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(save));
}

export function loadSettled(now = Date.now()): SaveData {
  return settle(readSave(now), now);
}

export function businessIds(): BusinessId[] {
  return ["convenience", "warehouse"];
}
