import Phaser from "phaser";
import type { PlacedRide } from "@/game/map/cityMap";
import type { MoveInput } from "./Player";

export class Vehicle extends Phaser.Physics.Arcade.Sprite {
  readonly id: string;
  readonly kind: PlacedRide["kind"];
  readonly price: number;
  readonly forSale: boolean;
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
  label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, spec: PlacedRide) {
    super(scene, spec.x, spec.y, spec.kind === "boat" ? "boat" : "car");
    this.id = spec.id;
    this.kind = spec.kind;
    this.price = spec.price;
    this.forSale = spec.forSale;
    this.name = spec.name;
    this.maxSpeed = spec.speed;
    this.homeX = spec.x;
    this.homeY = spec.y;
    this.homeHeading = spec.heading;
    this.heading = spec.heading;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setTint(spec.color);
    this.setRotation(spec.heading);
    this.setDepth(80 + spec.y);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setDrag(0, 0);
    body.setMaxVelocity(1400, 1400);
    body.setImmovable(true);
    if (spec.kind === "boat") {
      body.setSize(78, 22);
      this.setOffset(9, 8);
    } else {
      body.setSize(72, 28);
      this.setOffset(8, 8);
    }
    this.label = scene.add
      .text(spec.x, spec.y - 34, "", {
        fontFamily: "Arial, sans-serif",
        fontSize: "13px",
        color: "#f4f1ea",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(140);
    this.refreshLabel();
  }

  refreshLabel(): void {
    if (this.occupied) {
      this.label.setVisible(false);
      return;
    }
    this.label.setVisible(true);
    if (this.owned) this.label.setText(this.kind === "boat" ? "SKIFF" : "YOURS");
    else if (this.forSale) this.label.setText(`$${this.price}`);
    else this.label.setText("STEAL");
  }

  drive(input: MoveInput, delta: number): void {
    const dt = delta / 1000;
    const accel = this.kind === "boat" ? 240 : 560;
    if (input.up) this.speed = Math.min(this.maxSpeed, this.speed + accel * dt);
    if (input.down) this.speed = Math.max(-this.maxSpeed * 0.35, this.speed - accel * dt);
    if (!input.up && !input.down) {
      this.speed *= Math.exp(-2.1 * dt);
      if (Math.abs(this.speed) < 8) this.speed = 0;
    }
    const turn = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (turn !== 0 && Math.abs(this.speed) > 22) {
      const rate = this.kind === "boat" ? 1.55 : 2.35;
      this.heading += turn * rate * dt * Math.sign(this.speed);
    }
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(Math.cos(this.heading) * this.speed, Math.sin(this.heading) * this.speed);
    this.setRotation(this.heading);
  }

  park(): void {
    this.occupied = false;
    this.speed = 0;
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
    this.label.setPosition(this.x, this.y - 34);
    this.label.setDepth(140 + this.y);
  }
}
