import Phaser from "phaser";
import { TUNING } from "@/game/tuning";
import { hasLineOfSight } from "@/game/systems/sight";
import { textureKey } from "./textures";
import type { Player } from "./Player";

export class PoliceOfficer extends Phaser.Physics.Arcade.Sprite {
  private lastX: number;
  private lastY: number;
  private stuckMs = 0;
  private memoryMs = 0;
  private steer = 1;
  private walkMs = 0;
  private walkFrame: 0 | 1 = 0;
  private facing: "n" | "s" | "e" | "w" = "s";
  private awakeAt: number;
  halted = false;

  constructor(scene: Phaser.Scene, x: number, y: number, wakeDelay: number, crime: { x: number; y: number }) {
    super(scene, x, y, "cop-s-0");
    scene.add.existing(this);
    this.lastX = crime.x;
    this.lastY = crime.y;
    this.awakeAt = scene.time.now + TUNING.copWakeMs + wakeDelay;
    this.setDepth(100 + y);
    this.setAlpha(0);
    scene.tweens.add({ targets: this, alpha: 1, duration: 220 });
  }

  arm(body: Phaser.Physics.Arcade.Body): void {
    body.setDrag(TUNING.copDrag, TUNING.copDrag);
    body.setMaxVelocity(TUNING.copMaxSpeed, TUNING.copMaxSpeed);
    body.setSize(18, 16);
    this.setOffset(15, 26);
    body.setCollideWorldBounds(true);
  }

  halt(): void {
    this.halted = true;
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    body?.setAcceleration(0, 0);
    body?.setVelocity(0, 0);
  }

  update(
    delta: number,
    player: Player,
    active: boolean,
    blockers: Phaser.Geom.Rectangle[],
  ): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    if (!active || this.halted || this.scene.time.now < this.awakeAt) {
      body.setAcceleration(0, 0);
      if (!active || this.halted) body.setVelocity(0, 0);
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const sees =
      distance < TUNING.copDetectRange &&
      hasLineOfSight(this.x, this.y, player.x, player.y, blockers);

    if (sees) {
      this.lastX = player.x;
      this.lastY = player.y;
      this.memoryMs = 0;
    } else {
      this.memoryMs += delta;
      const atLast = Phaser.Math.Distance.Between(this.x, this.y, this.lastX, this.lastY) < 20;
      if (atLast && this.memoryMs > 480) {
        this.lastX = player.x;
        this.lastY = player.y;
        this.memoryMs = 0;
      }
    }

    let dx = this.lastX - this.x;
    let dy = this.lastY - this.y;
    const length = Math.hypot(dx, dy) || 1;
    let nx = dx / length;
    let ny = dy / length;

    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    if (speed < 22 && length > 28) this.stuckMs += delta;
    else this.stuckMs = Math.max(0, this.stuckMs - delta * 0.5);

    if (this.stuckMs > 260) {
      nx = -dy / length * this.steer;
      ny = dx / length * this.steer;
    }
    if (this.stuckMs > 680) {
      this.steer *= -1;
      this.stuckMs = 260;
    }

    body.setAcceleration(nx * TUNING.copAccel, ny * TUNING.copAccel);
    if (speed > TUNING.copMaxSpeed) {
      body.velocity.scale(TUNING.copMaxSpeed / speed);
    }

    if (Math.abs(nx) > Math.abs(ny)) this.facing = nx > 0 ? "e" : "w";
    else this.facing = ny > 0 ? "s" : "n";

    this.walkMs += delta;
    if (this.walkMs > 120) {
      this.walkMs = 0;
      this.walkFrame = this.walkFrame === 0 ? 1 : 0;
    }
    this.setTexture(textureKey("cop", this.facing, this.walkFrame));
    this.setFlipX(this.facing === "w");
    this.setDepth(100 + this.y);
  }
}
