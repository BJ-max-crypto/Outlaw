import type { HudSnapshot } from "@/lib/game/types";
import { TUNING } from "@/game/tuning";

export type HeistPhase = "idle" | "infiltrating" | "escaping" | "complete" | "busted";

export class HeistState {
  cash: number;
  health: number = TUNING.playerHealth;
  readonly maxHealth = TUNING.playerHealth;
  wanted = 0;
  readonly maxWanted = TUNING.maxWanted;
  heistTake = 0;
  robbed = false;
  phase: HeistPhase = "idle";

  constructor(cash = 0) {
    this.cash = cash;
  }

  objective(): string {
    if (this.phase === "escaping") return "Cops are coming. Reach the getaway van.";
    if (this.phase === "complete") return "You made it out.";
    if (this.phase === "busted") return "Caught.";
    return "Get into Quick Stop and hold E at the register.";
  }

  snapshot(): HudSnapshot {
    return {
      cash: this.cash,
      health: this.health,
      maxHealth: this.maxHealth,
      wanted: this.wanted,
      maxWanted: this.maxWanted,
      objective: this.objective(),
    };
  }
}

export function seizeTake(cash: number, take: number): number {
  return Math.max(0, cash - take);
}
