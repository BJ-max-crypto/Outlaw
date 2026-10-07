import type { HudSnapshot } from "@/lib/game/types";
import { businessTick, businessValue, itemById, netWorth, portfolioValue } from "@/lib/economy/model";
import { TUNING } from "@/game/tuning";
import type { FoodItem } from "@/game/world/catalog";

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
  readonly businessLevels = new Map<string, number>();
  readonly items = new Set<string>();
  private shares = new Map<string, number>();
  private basis = new Map<string, number>();
  stockProfit = 0;
  incomeScale = 1;
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

  levelOf(id: string): number {
    return this.businessLevels.get(id) ?? 1;
  }

  holdings(): { shares: Record<string, number>; basis: Record<string, number>; levels: Record<string, number>; items: string[] } {
    return {
      shares: Object.fromEntries(this.shares),
      basis: Object.fromEntries(this.basis),
      levels: Object.fromEntries(this.businessLevels),
      items: [...this.items],
    };
  }

  applyHoldings(input: {
    cash: number;
    levels: Record<string, number>;
    shares: Record<string, number>;
    basis: Record<string, number>;
    items: { id: string }[];
    realized: number;
    incomeScale: number;
  }): void {
    this.cash = input.cash;
    this.stockProfit = input.realized;
    this.incomeScale = input.incomeScale;
    this.ownedBusinesses.clear();
    this.businessLevels.clear();
    for (const [id, level] of Object.entries(input.levels)) {
      this.ownedBusinesses.add(id);
      this.businessLevels.set(id, level);
    }
    this.shares.clear();
    this.basis.clear();
    for (const [id, count] of Object.entries(input.shares)) this.shares.set(id, count);
    for (const [id, value] of Object.entries(input.basis)) this.basis.set(id, value);
    this.items.clear();
    for (const item of input.items) this.items.add(item.id);
  }

  worth(prices: Record<string, number>): number {
    return netWorth({
      cash: this.cash,
      levels: Object.fromEntries(this.businessLevels),
      shares: Object.fromEntries(this.shares),
      prices,
      items: [...this.items],
    });
  }

  portfolio(prices: Record<string, number>): number {
    return portfolioValue(Object.fromEntries(this.shares), prices);
  }

  invested(): number {
    return [...this.basis.values()].reduce((sum, value) => sum + value, 0);
  }

  itemValue(): number {
    return [...this.items].reduce((sum, id) => sum + (itemById(id)?.value ?? 0), 0);
  }

  businessAssetValue(): number {
    return [...this.businessLevels].reduce((sum, [id, level]) => sum + businessValue(id, level), 0);
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
        for (const id of this.ownedBusinesses) pay += businessTick(id, this.levelOf(id), this.incomeScale);
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
      netWorth: this.cash,
    };
  }
}
