import Phaser from "phaser";
import { TUNING } from "@/game/tuning";
import { textureKey } from "./textures";

export type MoveInput = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  facing: "n" | "s" | "e" | "w" = "n";
  health: number = TUNING.playerHealth;
  private invuln = 0;
  private walkMs = 0;
  private walkFrame: 0 | 1 = 0;
  private moving = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player-n-0");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(200);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setDrag(TUNING.playerDrag, TUNING.playerDrag);
    body.setMaxVelocity(TUNING.playerMaxSpeed, TUNING.playerMaxSpeed);
    body.setSize(18, 16);
    this.setOffset(15, 26);
  }

  update(input: MoveInput, delta: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    let x = 0;
    let y = 0;
    if (input.left) x -= 1;
    if (input.right) x += 1;
    if (input.up) y -= 1;
    if (input.down) y += 1;

    if (x !== 0 || y !== 0) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
      this.moving = true;
      if (Math.abs(x) > Math.abs(y)) this.facing = x > 0 ? "e" : "w";
      else this.facing = y > 0 ? "s" : "n";
    } else {
      this.moving = false;
    }

    body.setAcceleration(x * TUNING.playerAccel, y * TUNING.playerAccel);

    const speed = Math.hypot(body.velocity.x, body.velocity.y);
    if (speed > TUNING.playerMaxSpeed) {
      body.velocity.scale(TUNING.playerMaxSpeed / speed);
    }

    this.walkMs += delta;
    if (this.moving && this.walkMs > 130) {
      this.walkMs = 0;
      this.walkFrame = this.walkFrame === 0 ? 1 : 0;
    }
    if (!this.moving) this.walkFrame = 0;

    this.setTexture(textureKey("player", this.facing, this.walkFrame));
    this.setFlipX(this.facing === "w");
    this.setDepth(100 + this.y);

    if (this.invuln > 0) {
      this.invuln -= delta;
      this.setAlpha(Math.floor(this.invuln / 80) % 2 === 0 ? 0.55 : 1);
      if (this.invuln <= 0) this.setAlpha(1);
    }
  }

  hurt(amount: number): boolean {
    if (this.invuln > 0 || this.health <= 0) return false;
    this.health = Math.max(0, this.health - amount);
    this.invuln = TUNING.copHitCooldown;
    this.setTint(0xffb4a8);
    this.scene.time.delayedCall(110, () => {
      if (this.active) this.clearTint();
    });
    return true;
  }
}
