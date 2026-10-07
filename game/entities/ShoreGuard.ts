import Phaser from "phaser";
import { TUNING } from "@/game/tuning";
import { AVATAR_COP, faceAngle, placeAvatar } from "./textures";
import type { Player } from "./Player";

/** A reinforcement posted between the dock and the middle of someone else's island. */
export class ShoreGuard {
  readonly sprite: Phaser.GameObjects.Sprite;
  private phase: number;
  private readonly baseX: number;
  private readonly baseY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, phase: number) {
    this.phase = phase;
    this.baseX = x;
    this.baseY = y;
    this.sprite = scene.add.sprite(x, y, AVATAR_COP);
    placeAvatar(this.sprite);
    this.sprite.setDepth(100 + y);
  }

  update(delta: number, player: Player, riding: boolean): void {
    this.phase += delta;
    const x = this.baseX;
    const y = this.baseY + Math.sin(this.phase / 700) * 18;
    this.sprite.setPosition(x, y);
    this.sprite.setRotation(faceAngle("w") + Math.sin(this.phase / 500) * 0.2);
    this.sprite.setDepth(100 + y);
    if (riding) return;
    const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
    if (distance < 42) player.hurt(TUNING.copDamage);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
