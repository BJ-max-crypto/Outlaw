import Phaser from "phaser";
import { TUNING } from "@/game/tuning";
import { hasLineOfSight } from "@/game/systems/sight";
import { AVATAR_COP, faceAngle, fitCircle, placeAvatar } from "./textures";
import type { Player } from "./Player";

export class PoliceOfficer extends Phaser.Physics.Arcade.Sprite {
  private lastX: number;
  private lastY: number;
  private stuckMs = 0;
  private memoryMs = 0;
  private steer = 1;
  private walkMs = 0;
  private facing: "n" | "s" | "e" | "w" = "s";
  private awakeAt: number;
  halted = false;
  seesPlayer = false;

  constructor(scene: Phaser.Scene, x: number, y: number, wakeDelay: number, crime: { x: number; y: number }) {
    super(scene, x, y, AVATAR_COP);
    scene.add.existing(this);
    placeAvatar(this);
    this.lastX = crime.x;
    this.lastY = crime.y;
    const dx = crime.x - x;
    const dy = crime.y - y;
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx > 0 ? "e" : "w";
    else this.facing = dy > 0 ? "s" : "n";
    this.setRotation(faceAngle(this.facing));
    this.awakeAt = scene.time.now + TUNING.copWakeMs + wakeDelay;
    this.setDepth(100 + y);
    this.setAlpha(0);
    scene.tweens.add({ targets: this, alpha: 1, duration: 220 });
  }

  arm(body: Phaser.Physics.Arcade.Body): void {
    body.setDrag(TUNING.copDrag, TUNING.copDrag);
    body.setMaxVelocity(TUNING.copMaxSpeed, TUNING.copMaxSpeed);
    body.setCollideWorldBounds(true);
    fitCircle(this);
  }

  halt(): void {
    this.halted = true;
    this.seesPlayer = false;
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    body?.setAcceleration(0, 0);
    body?.setVelocity(0, 0);
  }

  alert(crime: { x: number; y: number }, at: { x: number; y: number }): void {
    this.halted = false;
    this.seesPlayer = false;
    this.awakeAt = this.scene.time.now + 280;
    this.lastX = crime.x;
    this.lastY = crime.y;
    this.setPosition(at.x, at.y);
    this.setAlpha(1);
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);
  }

  /** A second crime while the clock is running. Stay where you are and keep moving. */
  press(crime: { x: number; y: number }): void {
    this.halted = false;
    this.lastX = crime.x;
    this.lastY = crime.y;
    this.memoryMs = 0;
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
      this.seesPlayer = false;
      body.setAcceleration(0, 0);
      if (!active || this.halted) body.setVelocity(0, 0);
      return;
    }

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const sees =
      distance < TUNING.copDetectRange &&
      hasLineOfSight(this.x, this.y, player.x, player.y, blockers);

    this.seesPlayer = sees;
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

    let goalX = this.lastX;
    let goalY = this.lastY;
    if (sees) {
      const quarry = player.body as Phaser.Physics.Arcade.Body;
      goalX += quarry.velocity.x * 0.4;
      goalY += quarry.velocity.y * 0.4;
    }
    let dx = goalX - this.x;
    let dy = goalY - this.y;
    const length = Math.hypot(dx, dy) || 1;
    let nx = dx / length;
    let ny = dy / length;

    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    if (speed < 22 && length > 28) this.stuckMs += delta;
    else this.stuckMs = Math.max(0, this.stuckMs - delta * 0.5);

    if (this.stuckMs > 160) {
      nx = (-dy / length) * this.steer;
      ny = (dx / length) * this.steer;
    }
    if (this.stuckMs > 520) {
      this.steer *= -1;
      this.stuckMs = 160;
    }

    body.setAcceleration(nx * TUNING.copAccel, ny * TUNING.copAccel);
    if (speed > TUNING.copMaxSpeed) {
      body.velocity.scale(TUNING.copMaxSpeed / speed);
    }

    if (Math.abs(nx) > Math.abs(ny)) this.facing = nx > 0 ? "e" : "w";
    else this.facing = ny > 0 ? "s" : "n";

    this.walkMs += delta;
    const step = Math.sin(this.walkMs / 70) * 0.07;
    this.setRotation(faceAngle(this.facing) + step);
    this.setDepth(100 + this.y);
  }
}
