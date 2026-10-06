import { TUNING } from "@/game/tuning";

export class RobberySystem {
  progress = 0;

  /** Returns true on the frame a hold finishes. Letting go cancels the bar. */
  update(delta: number, holding: boolean, inZone: boolean): boolean {
    if (holding && inZone) {
      this.progress = Math.min(1, this.progress + delta / TUNING.robberyMs);
      return this.progress >= 1;
    }
    if (this.progress > 0 && this.progress < 1) this.progress = 0;
    return false;
  }

  reset(): void {
    this.progress = 0;
  }
}
