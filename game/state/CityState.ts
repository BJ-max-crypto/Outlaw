import type { HudSnapshot } from "@/lib/game/types";
import { TUNING } from "@/game/tuning";
import { businessById, type FoodItem } from "@/game/world/catalog";

export class CityState {
  cash: number;
  health: number = TUNING.playerHealth;
  readonly maxHealth = TUNING.playerHealth;
  energy: number = TUNING.maxEnergy;
  readonly maxEnergy = TUNING.maxEnergy;
  wanted = 0;
  readonly maxWanted = TUNING.maxWanted;
  employed = false;
  food: FoodItem[] = [];
  readonly ownedBusinesses = new Set<string>();
  readonly ownedVehicles = new Set<string>();
  private incomeMs = 0;

  constructor(cash = TUNING.startingCash) {
    this.cash = cash;
  }

  spend(amount: number): boolean {
    if (this.cash < amount) return false;
    this.cash -= amount;
    return true;
  }

  /** Arrest keeps half the wallet, rounded down. */
  cutInHalf(): number {
    const kept = Math.floor(this.cash * 0.5);
    const lost = this.cash - kept;
    this.cash = kept;
    return lost;
  }

  owns(id: string): boolean {
    return this.ownedBusinesses.has(id);
  }

  eat(): FoodItem | null {
    return this.food.shift() ?? null;
  }

  tickIncome(delta: number): number {
    this.incomeMs += delta;
    if (this.incomeMs < TUNING.jobIntervalMs) return 0;
    this.incomeMs -= TUNING.jobIntervalMs;
    let pay = this.employed ? TUNING.jobPay : 0;
    for (const id of this.ownedBusinesses) pay += businessById(id)?.income ?? 0;
    if (pay <= 0) return 0;
    this.cash += pay;
    return pay;
  }

  snapshot(objective: string): HudSnapshot {
    return {
      cash: this.cash,
      health: this.health,
      maxHealth: this.maxHealth,
      energy: Math.ceil(this.energy),
      maxEnergy: this.maxEnergy,
      wanted: this.wanted,
      maxWanted: this.maxWanted,
      objective,
      food: this.food.length,
      employed: this.employed,
      businesses: [...this.ownedBusinesses],
      vehicles: [...this.ownedVehicles],
    };
  }
}
