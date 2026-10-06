import Phaser from "phaser";
import type { PlacedRide } from "@/game/map/cityMap";
import type { MoveInput } from "./Player";

const DISPLAY_HEIGHT = 78;

export class Vehicle extends Phaser.Physics.Arcade.Sprite {
  readonly id: string;
  readonly kind: PlacedRide["kind"];
  readonly name: string;
  readonly maxSpeed: number;
  readonly homeX: number;
  readonly homeY: number;
  readonly homeHeading: number;
  owned = false;
  stolen = false;
  occupied = false;
  heading: number;
  speed = 0;
  throttleLock = 0;

  constructor(scene: Phaser.Scene, spec: PlacedRide) {
    super(scene, spec.x, spec.y, spec.texture);
    this.id = spec.id;
    this.kind = spec.kind;
    this.name = spec.name;
    this.maxSpeed = spec.speed;
    this.homeX = spec.x;
    this.homeY = spec.y;
    this.homeHeading = spec.heading;
    this.heading = spec.heading;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.5);
    this.setScale(DISPLAY_HEIGHT / this.frame.height);
    this.setRotation(spec.heading);
    this.setDepth(80 + spec.y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const bw = Math.round(this.frame.width * 0.55);
    const bh = Math.round(this.frame.height * 0.62);
    body.setSize(bw, bh);
    this.setOffset((this.frame.width - bw) / 2, (this.frame.height - bh) / 2);
    body.setCollideWorldBounds(true);
    body.setDrag(0, 0);
    body.setMaxVelocity(1400, 1400);
    body.setImmovable(true);
    body.setVelocity(0, 0);
  }

  refreshLabel(): void {
    this.setDepth(80 + this.y);
  }

  drive(input: MoveInput, delta: number): void {
    const dt = delta / 1000;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.throttleLock > 0) {
      this.throttleLock = Math.max(0, this.throttleLock - delta);
      this.speed = 0;
      body.setVelocity(0, 0);
    } else {
      const accel = this.kind === "boat" ? 280 : 720;
      if (input.up) this.speed = Math.min(this.maxSpeed, this.speed + accel * dt);
      if (input.down) this.speed = Math.max(-this.maxSpeed * 0.42, this.speed - accel * 0.7 * dt);
      if (!input.up && !input.down) {
        this.speed *= Math.exp(-1.6 * dt);
        if (Math.abs(this.speed) < 6) this.speed = 0;
      }
    }

    const turn = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (turn !== 0) {
      const pace = Math.min(1, Math.abs(this.speed) / (this.maxSpeed * 0.45));
      const aim = Math.abs(this.speed) < 36 ? 1.15 : 0;
      const rate = (this.kind === "boat" ? 1.35 : 2.15) * (0.28 + pace) + aim;
      const gear = this.speed < -8 ? -1 : 1;
      this.heading += turn * rate * dt * gear;
    }

    if (this.throttleLock > 0) {
      this.setRotation(this.heading);
      return;
    }

    const targetX = Math.sin(this.heading) * this.speed;
    const targetY = -Math.cos(this.heading) * this.speed;
    const grip = 1 - Math.exp(-(this.kind === "boat" ? 3.2 : 7.5) * dt);
    body.velocity.x += (targetX - body.velocity.x) * grip;
    body.velocity.y += (targetY - body.velocity.y) * grip;
    this.setRotation(this.heading);
  }

  park(): void {
    this.occupied = false;
    this.speed = 0;
    this.throttleLock = 0;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setImmovable(true);
    this.refreshLabel();
  }

  impound(): void {
    this.owned = false;
    this.stolen = false;
    this.occupied = false;
    this.speed = 0;
    this.throttleLock = 0;
    this.heading = this.homeHeading;
    this.setPosition(this.homeX, this.homeY);
    this.setRotation(this.homeHeading);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setImmovable(true);
    this.refreshLabel();
  }

  syncLabel(): void {
    this.setDepth(80 + this.y);
  }
}
