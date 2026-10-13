import type { BusinessId } from "./config";

export type BusinessState = {
  owned: boolean;
  upgraded: boolean;
};

export type SaveData = {
  version: 1;
  name: string;
  cash: number;
  businesses: Record<BusinessId, BusinessState>;
  bestScore: number;
  /** Clock for the single income settlement. */
  lastSeen: number;
  /** Sub-dollar time carried so a one-second tick does not drop wages. */
  bankedMs: number;
};

export type MissionHud = {
  mode: "roam" | "mission";
  objective: string;
  prompt: string | null;
  timeLeftMs: number;
  tags: number;
  carrying: boolean;
};

export type MissionResult = {
  id: string;
  success: boolean;
  reason: "clear" | "time" | "cornered";
  payout: number;
  timeLeftMs: number;
  tags: number;
  parts: { label: string; amount: number }[];
};

/**
 * Board row. `demo` rows are sample rivals. `local` is this browser.
 * A later account sync can add `account` without changing the table.
 */
export type RankOrigin = "demo" | "local" | "account";

export type RankRow = {
  id: string;
  name: string;
  netWorth: number;
  incomePerMinute: number;
  bestScore: number;
  origin: RankOrigin;
};
