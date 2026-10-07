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
  /** Income taken from islands you bought, paid on the business timer. */
  islandPay = 0;
  /** Someone else bought this island, so its wages and store income leave with it. */
  incomeFrozen = false;
  /** Ad reward scale. 2 doubles every earning until it expires. */
  earningsScale = 1;

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

  addShares(id: string, count: number): void {
    const next = Math.floor(count);
    if (next <= 0) return;
    this.shares.set(id, this.sharesOf(id) + next);
  }

  /** Removes up to `count` shares and returns how many were sold. */
  takeShares(id: string, count: number): number {
    const owned = this.sharesOf(id);
    const sold = Math.min(owned, Math.floor(count));
    if (sold <= 0) return 0;
    const left = owned - sold;
    if (left === 0) this.shares.delete(id);
    else this.shares.set(id, left);
    return sold;
  }

  /** Wages pay only while you are standing in the job. Business income has its own timer. */
  tickIncome(delta: number, onShift: boolean): number {
    let pay = 0;
    if (this.incomeFrozen || !this.employed || !onShift) {
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
      if (!this.incomeFrozen) {
        for (const id of this.ownedBusinesses) pay += businessById(id)?.income ?? 0;
      }
      pay += this.islandPay;
    }
    pay = Math.round(pay * this.earningsScale);
    if (pay <= 0) return 0;
    this.cash += pay;
    return pay;
  }

  snapshot(objective: string, onShift = false): HudSnapshot {
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
      onShift,
      driving: false,
      gas: 0,
      maxGas: 100,
      businesses: [...this.ownedBusinesses],
      vehicles: [...this.ownedVehicles],
    };
  }
}
