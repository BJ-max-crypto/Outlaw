/** Single source for prices, wages, and the getaway clock. */

export type BusinessId = "convenience" | "warehouse";

export type BusinessDef = {
  id: BusinessId;
  name: string;
  blurb: string;
  cost: number;
  incomePerMinute: number;
  upgradeCost: number;
  upgradedIncomePerMinute: number;
  value: number;
  upgradedValue: number;
};

export const OUTRUN = {
  startCash: 1_000,
  /** Offline wages stop accruing after this long away. */
  offlineCapMs: 8 * 60 * 60 * 1000,
  missionMs: 90_000,
  baseReward: 180,
  timeBonusPerSecond: 3,
  cleanBonus: 200,
  tagPenalty: 50,
  minimumClearPay: 40,
  tagLimit: 3,
  playerAccel: 2400,
  playerDrag: 1700,
  playerMaxSpeed: 270,
  taggedSpeed: 0.42,
  spotSpeed: 148,
  catchDistance: 34,
  tagCooldownMs: 1100,
  playerSlowMs: 900,
  spotStunMs: 700,
} as const;

export const BUSINESSES: readonly BusinessDef[] = [
  {
    id: "convenience",
    name: "Convenience Store",
    blurb: "Night counter on the south block.",
    cost: 500,
    incomePerMinute: 30,
    upgradeCost: 350,
    upgradedIncomePerMinute: 55,
    value: 500,
    upgradedValue: 850,
  },
  {
    id: "warehouse",
    name: "Warehouse",
    blurb: "The crate bay on the north road.",
    cost: 1_200,
    incomePerMinute: 90,
    upgradeCost: 700,
    upgradedIncomePerMinute: 140,
    value: 1_200,
    upgradedValue: 1_900,
  },
] as const;

export function businessDef(id: BusinessId): BusinessDef {
  const found = BUSINESSES.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown business ${id}`);
  return found;
}
