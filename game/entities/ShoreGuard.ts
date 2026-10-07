import Phaser from "phaser";
import { TUNING } from "@/game/tuning";
import { copTexture } from "./textures";
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
    this.sprite = scene.add.sprite(x, y, copTexture("w", 0));
    this.sprite.setScale(1.45);
    this.sprite.setFlipX(true);
    this.sprite.setDepth(100 + y);
  }

  update(delta: number, player: Player, riding: boolean): void {
    this.phase += delta;
    const x = this.baseX;
    const y = this.baseY + Math.sin(this.phase / 700) * 18;
    const frame = Math.floor(this.phase / 160) % 2 === 0 ? 0 : 1;
    this.sprite.setPosition(x, y);
    this.sprite.setTexture(copTexture("w", frame));
    this.sprite.setFlipX(true);
    this.sprite.setRotation(0);
    this.sprite.setDepth(100 + y);
    if (riding) return;
    const distance = Phaser.Math.Distance.Between(x, y, player.x, player.y);
    if (distance < 42) player.hurt(TUNING.copDamage);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
