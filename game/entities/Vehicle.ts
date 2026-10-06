import Phaser from "phaser";
import type { PlacedRide } from "@/game/map/cityMap";
import type { MoveInput } from "./Player";

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
  /** Fresh throttle press required after mounting, so a held walk key cannot roll the car. */
  armed = false;

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
    const length = spec.kind === "car" ? 150 : 124;
    this.setScale(length / this.frame.height);
    this.setRotation(spec.heading);
    this.setDepth(80 + spec.y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    const bw = Math.round(this.frame.width * 0.68);
    const bh = Math.round(this.frame.height * (spec.kind === "car" ? 0.72 : 0.86));
    body.setSize(bw, bh);
    this.setOffset((this.frame.width - bw) / 2, (this.frame.height - bh) / 2);
    body.setDrag(0, 0);
    body.setMaxVelocity(1400, 1400);
    this.stayParked();
  }

  refreshLabel(): void {
    this.setDepth(80 + this.y);
  }

  /** Parked rides ignore collisions and cannot drift. */
  stayParked(): void {
    this.speed = 0;
    this.armed = false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
    body.setImmovable(true);
    body.setCollideWorldBounds(true);
    body.moves = false;
    this.setPushable(false);
  }

  drive(input: MoveInput, delta: number): void {
    if (!this.occupied) return;
    const dt = delta / 1000;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const throttle = input.up || input.down;
    if (!this.armed) {
      this.speed = 0;
      body.setVelocity(0, 0);
      if (!throttle && !input.left && !input.right) this.armed = true;
      this.setRotation(this.heading);
      return;
    }

    const accel = this.kind === "boat" ? 280 : 640;
    if (input.up) this.speed = Math.min(this.maxSpeed, this.speed + accel * dt);
    if (input.down) this.speed = Math.max(-this.maxSpeed * 0.42, this.speed - accel * 0.7 * dt);
    if (!throttle) {
      this.speed *= Math.exp(-2.2 * dt);
      if (Math.abs(this.speed) < 6) this.speed = 0;
    }

    const turn = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (turn !== 0) {
      const pace = Math.min(1, Math.abs(this.speed) / (this.maxSpeed * 0.45));
      const aim = Math.abs(this.speed) < 36 ? 1.05 : 0;
      const rate = (this.kind === "boat" ? 1.25 : 2.05) * (0.25 + pace) + aim;
      const gear = this.speed < -8 ? -1 : 1;
      this.heading += turn * rate * dt * gear;
    }

    const targetX = Math.sin(this.heading) * this.speed;
    const targetY = -Math.cos(this.heading) * this.speed;
    const grip = 1 - Math.exp(-(this.kind === "boat" ? 3.4 : 9) * dt);
    body.velocity.x += (targetX - body.velocity.x) * grip;
    body.velocity.y += (targetY - body.velocity.y) * grip;
    this.setRotation(this.heading);
  }

  wake(): void {
    this.occupied = true;
    this.armed = false;
    this.speed = 0;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.moves = true;
    body.setImmovable(false);
    body.setCollideWorldBounds(true);
    body.setMaxVelocity(1400, 1400);
    body.setVelocity(0, 0);
    this.setPushable(true);
  }

  park(): void {
    this.occupied = false;
    this.stayParked();
    this.refreshLabel();
  }

  impound(): void {
    this.owned = false;
    this.stolen = false;
    this.occupied = false;
    this.heading = this.homeHeading;
    this.setPosition(this.homeX, this.homeY);
    this.setRotation(this.homeHeading);
    this.stayParked();
    this.refreshLabel();
  }

  syncLabel(): void {
    this.setDepth(80 + this.y);
  }
}
