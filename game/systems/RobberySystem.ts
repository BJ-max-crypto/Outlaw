import { TUNING } from "@/game/tuning";
import type { HeistState } from "@/game/state/HeistState";

export function stepRobbery(
  progress: number,
  delta: number,
  holding: boolean,
  inZone: boolean,
  duration = TUNING.robberyMs,
): number {
  if (holding && inZone) return Math.min(1, progress + delta / duration);
  if (progress > 0 && progress < 1) return 0;
  return progress;
}

export class RobberySystem {
  progress = 0;
  private done = false;

  constructor(private state: HeistState) {}

  /**
   * Returns true on the frame the robbery finishes.
   * Releasing E or leaving the zone cancels an in-progress rob.
   */
  update(delta: number, holding: boolean, inZone: boolean): boolean {
    if (this.done || this.state.robbed) return false;
    const next = stepRobbery(this.progress, delta, holding, inZone);
    this.progress = next;
    if (next < 1) return false;

    this.done = true;
    const span = TUNING.takeMax - TUNING.takeMin;
    const take = TUNING.takeMin + Math.floor(Math.random() * (span + 1));
    this.state.heistTake = take;
    this.state.cash += take;
    this.state.robbed = true;
    this.state.phase = "escaping";
    return true;
  }
}
