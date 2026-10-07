import { TUNING } from "@/game/tuning";
import type { CityState } from "@/game/state/CityState";

export class WantedSystem {
  constructor(private state: CityState) {}

  raiseTo(level: number): void {
    const next = Math.max(0, Math.min(TUNING.maxWanted, Math.floor(level)));
    this.state.wanted = Math.max(this.state.wanted, next);
  }

  clear(): void {
    this.state.wanted = 0;
  }

  get active(): boolean {
    return this.state.wanted > 0;
  }
}
