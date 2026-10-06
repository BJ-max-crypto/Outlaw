import { TUNING } from "@/game/tuning";
import type { HeistState } from "@/game/state/HeistState";

export class WantedSystem {
  constructor(private state: HeistState) {}

  raiseTo(level: number): void {
    const next = Math.max(0, Math.min(TUNING.maxWanted, Math.floor(level)));
    this.state.wanted = Math.max(this.state.wanted, next);
  }

  clear(): void {
    this.state.wanted = 0;
  }

  get active(): boolean {
    return this.state.wanted > 0 && this.state.phase === "escaping";
  }
}
