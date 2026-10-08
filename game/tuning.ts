export const TUNING = {
  playerAccel: 2200,
  playerDrag: 1250,
  playerMaxSpeed: 308,
  copAccel: 2700,
  copDrag: 820,
  copMaxSpeed: 368,
  copDetectRange: 1320,
  copWakeMs: 140,
  robberyMs: 2300,
  maxWanted: 5,
  playerHealth: 100,
  maxEnergy: 100,
  copDamage: 20,
  copHitCooldown: 520,
  startingCash: 40,
  jobPay: 28,
  jobIntervalMs: 4000,
  /** Each paycheck on the clock adds half a step, and this is the ceiling. */
  payStreakCap: 4,
  wantedDecayMs: 18000,
  packSize: 5,
  energyWalk: 1.15,
  energySprint: 3.1,
  energyDrive: 0.35,
  bustSafetyMs: 2400,
  escapeMs: 90000,
  gasBurn: 2.2,
  gasFillCost: 45,
  crossingBoatCost: 1_000_000,
  islandBuyCost: 1_000_000_000,
  reinforcementCost: 100_000,
  reinforcementPay: 24,
} as const;

/** 1 on the first paycheck, then +0.5 each payout, capped. Leaving the job resets the count. */
export function payStreakMultiplier(ticks: number): number {
  const step = Math.max(1, Math.floor(ticks));
  return Math.min(TUNING.payStreakCap, 1 + (step - 1) * 0.5);
}

export function formatStreak(multiplier: number): string {
  return Number.isInteger(multiplier) ? String(multiplier) : multiplier.toFixed(1);
}
