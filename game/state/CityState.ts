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
  private shares = new Map<string, number>();
  private jobMs = 0;
  private bizMs = 0;

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

  sharesOf(id: string): number {
    return this.shares.get(id) ?? 0;
  }

  addShare(id: string): void {
    this.shares.set(id, this.sharesOf(id) + 1);
  }

  takeShare(id: string): boolean {
    const count = this.sharesOf(id);
    if (count <= 0) return false;
    if (count === 1) this.shares.delete(id);
    else this.shares.set(id, count - 1);
    return true;
  }

  /** Wages follow you after you clock in. Business income has its own timer. */
  tickIncome(delta: number): number {
    let pay = 0;
    if (!this.employed) {
      this.jobMs = 0;
    } else {
      this.jobMs += delta;
      if (this.jobMs >= TUNING.jobIntervalMs) {
        this.jobMs -= TUNING.jobIntervalMs;
        pay += TUNING.jobPay;
      }
    }
    this.bizMs += delta;
    if (this.bizMs >= TUNING.jobIntervalMs) {
      this.bizMs -= TUNING.jobIntervalMs;
      for (const id of this.ownedBusinesses) pay += businessById(id)?.income ?? 0;
    }
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
      driving: false,
      gas: 0,
      maxGas: 100,
      businesses: [...this.ownedBusinesses],
      vehicles: [...this.ownedVehicles],
    };
  }
}
