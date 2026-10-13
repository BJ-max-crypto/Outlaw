import Phaser from "phaser";
import { createActorTextures, textureKey } from "@/game/entities/textures";
import { outrunBus } from "@/game/outrun/bus";
import { contains, EXIT, obstacles, PACKAGE, PATROL, SPAWN, WORLD } from "@/game/outrun/city";
import { OUTRUN } from "@/game/outrun/config";
import { missionPayout } from "@/game/outrun/economy";
import { paintCity } from "@/game/outrun/paint";
import type { MissionHud, MissionResult } from "@/game/outrun/types";

type Facing = "n" | "s" | "e" | "w";

export class OutrunScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private spotter!: Phaser.Physics.Arcade.Sprite;
  private crate!: Phaser.GameObjects.Rectangle;
  private keys!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private arrows!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;
  private mode: "roam" | "mission" = "roam";
  private carrying = false;
  private tags = 0;
  private timeLeft: number = OUTRUN.missionMs;
  private waypoint = 0;
  private tagReadyAt = 0;
  private slowUntil = 0;
  private stunUntil = 0;
  private resolved = false;
  private lastHud = "";
  private facing: Facing = "s";
  private spotFacing: Facing = "e";
  private walkMs = 0;
  private walkFrame: 0 | 1 = 0;
  private offs: (() => void)[] = [];
  private bob!: Phaser.Tweens.Tween;

  constructor() {
    super("outrun");
  }

  create(): void {
    this.mode = "roam";
    this.carrying = false;
    this.tags = 0;
    this.timeLeft = OUTRUN.missionMs;
    this.waypoint = 0;
    this.resolved = false;
    this.lastHud = "";
    this.facing = "s";

    paintCity(this);
    createActorTextures(this);
    this.paintTail();
    this.physics.world.setBounds(0, 0, WORLD.w, WORLD.h);

    const walls = this.physics.add.staticGroup();
    for (const rect of obstacles()) {
      const block = this.add.rectangle(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h, 0x000000, 0);
      block.setVisible(false);
      this.physics.add.existing(block, true);
      (block.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      walls.add(block);
    }

    this.player = this.makeRunner(SPAWN.x, SPAWN.y, "player-s-0");
    this.spotter = this.makeRunner(PATROL[0].x, PATROL[0].y, "tail-e-0");
    this.crate = this.add.rectangle(PACKAGE.x, PACKAGE.y, 22, 18, 0xd7c08a).setDepth(8);
    this.bob = this.tweens.add({
      targets: this.crate,
      y: PACKAGE.y - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.physics.add.collider(this.player, walls);
    this.physics.add.collider(this.spotter, walls);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input is unavailable.");
    keyboard.addCapture(["W", "A", "S", "D", "UP", "DOWN", "LEFT", "RIGHT"]);
    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.arrows = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
    };

    this.offs.push(
      outrunBus.on("mission-start", () => this.beginMission()),
      outrunBus.on("mission-abort", () => this.abortMission()),
      outrunBus.on("pause", () => this.scene.pause()),
      outrunBus.on("resume", () => {
        this.scene.resume();
        this.fitCamera();
      }),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of this.offs) off();
      this.offs = [];
    });
    this.scale.on("resize", () => this.fitCamera());
    this.fitCamera();
    this.publish();
    this.game.canvas.tabIndex = 1;
    outrunBus.emit("ready");
  }

  private held(direction: "up" | "down" | "left" | "right"): boolean {
    return this.keys[direction].isDown || this.arrows[direction].isDown;
  }

  private paintTail(): void {
    for (const facing of ["s", "n", "e"] as const) {
      for (const frame of [0, 1] as const) {
        const key = `tail-${facing}-${frame}`;
        if (this.textures.exists(key)) continue;
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0x000000, 0.28);
        g.fillEllipse(24, 42, 20, 8);
        g.fillStyle(0x17191c, 1);
        g.fillRoundedRect(14, 31 + frame, 7, 8, 2);
        g.fillRoundedRect(26, 31, 7, 8, 2);
        g.fillStyle(0x2c3544, 1);
        g.fillRoundedRect(13, 18, 22, 16, 5);
        g.fillStyle(0xd7c08a, 1);
        g.fillRect(20, 22, 8, 3);
        g.fillStyle(0xe8c7a4, 1);
        g.fillCircle(facing === "e" ? 30 : 24, 15, 7);
        g.generateTexture(key, 48, 48);
        g.destroy();
      }
    }
  }

  private makeRunner(x: number, y: number, texture: string): Phaser.Physics.Arcade.Sprite {
    const sprite = this.physics.add.sprite(x, y, texture);
    sprite.setCollideWorldBounds(true);
    sprite.setScale(1.35);
    sprite.setDepth(20 + y);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(16, 12);
    body.setOffset(16, 30);
    body.setDrag(OUTRUN.playerDrag, OUTRUN.playerDrag);
    body.setMaxVelocity(OUTRUN.playerMaxSpeed, OUTRUN.playerMaxSpeed);
    return sprite;
  }

  private fitCamera(): void {
    const camera = this.cameras.main;
    const zoom = Math.min(this.scale.width / WORLD.w, this.scale.height / WORLD.h);
    camera.setZoom(Math.max(0.25, zoom));
    camera.centerOn(WORLD.w / 2, WORLD.h / 2);
    camera.setBackgroundColor("#070b10");
  }

  private beginMission(): void {
    this.mode = "mission";
    this.carrying = false;
    this.tags = 0;
    this.timeLeft = OUTRUN.missionMs;
    this.resolved = false;
    this.tagReadyAt = 0;
    this.slowUntil = 0;
    this.stunUntil = 0;
    this.waypoint = 0;
    this.place(this.player, SPAWN.x, SPAWN.y);
    this.place(this.spotter, PATROL[0].x, PATROL[0].y);
    this.crate.setPosition(PACKAGE.x, PACKAGE.y);
    this.crate.setVisible(true);
    this.bob.resume();
    this.publish(true);
  }

  private abortMission(): void {
    if (this.mode !== "mission" || this.resolved) return;
    this.mode = "roam";
    this.carrying = false;
    this.crate.setPosition(PACKAGE.x, PACKAGE.y);
    this.crate.setVisible(true);
    this.bob.resume();
    this.publish(true);
  }

  private place(sprite: Phaser.Physics.Arcade.Sprite, x: number, y: number): void {
    sprite.setPosition(x, y);
    const body = sprite.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    body.setVelocity(0, 0);
  }

  update(_time: number, delta: number): void {
    this.drivePlayer(delta);
    this.driveSpotter(delta);
    if (this.mode === "mission" && !this.resolved) this.tickMission(delta);
    if (this.carrying) this.crate.setPosition(this.player.x, this.player.y - 30);
    this.player.setDepth(20 + this.player.y);
    this.spotter.setDepth(20 + this.spotter.y);
    this.publish(false);
  }

  private drivePlayer(delta: number): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let x = 0;
    let y = 0;
    if (this.held("left")) x -= 1;
    if (this.held("right")) x += 1;
    if (this.held("up")) y -= 1;
    if (this.held("down")) y += 1;
    if (x !== 0 || y !== 0) {
      const length = Math.hypot(x, y);
      x /= length;
      y /= length;
      if (Math.abs(x) > Math.abs(y)) this.facing = x > 0 ? "e" : "w";
      else this.facing = y > 0 ? "s" : "n";
      this.walkMs += delta;
      if (this.walkMs > 130) {
        this.walkMs = 0;
        this.walkFrame = this.walkFrame === 0 ? 1 : 0;
      }
    } else {
      this.walkFrame = 0;
    }
    const scale = this.time.now < this.slowUntil ? OUTRUN.taggedSpeed : 1;
    body.setMaxVelocity(OUTRUN.playerMaxSpeed * scale, OUTRUN.playerMaxSpeed * scale);
    body.setAcceleration(x * OUTRUN.playerAccel * scale, y * OUTRUN.playerAccel * scale);
    this.player.setTexture(textureKey("player", this.facing, this.walkFrame));
    this.player.setFlipX(this.facing === "w");
  }

  private driveSpotter(delta: number): void {
    const body = this.spotter.body as Phaser.Physics.Arcade.Body;
    if (this.time.now < this.stunUntil) {
      body.setVelocity(0, 0);
      return;
    }
    const chasing = this.mode === "mission" && this.carrying;
    let tx = PATROL[this.waypoint].x;
    let ty = PATROL[this.waypoint].y;
    if (!chasing && Math.hypot(this.spotter.x - tx, this.spotter.y - ty) < 12) {
      this.waypoint = (this.waypoint + 1) % PATROL.length;
      tx = PATROL[this.waypoint].x;
      ty = PATROL[this.waypoint].y;
    }
    if (chasing) {
      tx = this.player.x;
      ty = this.player.y;
    }
    const dx = tx - this.spotter.x;
    const dy = ty - this.spotter.y;
    const length = Math.hypot(dx, dy) || 1;
    body.setVelocity((dx / length) * OUTRUN.spotSpeed, (dy / length) * OUTRUN.spotSpeed);
    this.spotFacing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "e" : "w") : dy > 0 ? "s" : "n";
    const frame: 0 | 1 = Math.floor(this.time.now / 140) % 2 === 0 ? 0 : 1;
    const side = this.spotFacing === "w" ? "e" : this.spotFacing;
    this.spotter.setTexture(`tail-${side}-${frame}`);
    this.spotter.setFlipX(this.spotFacing === "w");
    void delta;
  }

  private tickMission(delta: number): void {
    this.timeLeft = Math.max(0, this.timeLeft - delta);
    if (!this.carrying && Math.hypot(this.player.x - PACKAGE.x, this.player.y - PACKAGE.y) < 36) {
      this.carrying = true;
      this.bob.pause();
      this.crate.setVisible(true);
    }
    if (this.carrying && this.time.now >= this.tagReadyAt) {
      const distance = Math.hypot(this.player.x - this.spotter.x, this.player.y - this.spotter.y);
      if (distance < OUTRUN.catchDistance) this.tag();
    }
    if (this.tags >= OUTRUN.tagLimit) {
      this.finish("cornered");
      return;
    }
    if (this.timeLeft <= 0) {
      this.finish("time");
      return;
    }
    if (this.carrying && contains(EXIT, this.player.x, this.player.y)) this.finish("clear");
  }

  private tag(): void {
    this.tags += 1;
    this.tagReadyAt = this.time.now + OUTRUN.tagCooldownMs;
    this.slowUntil = this.time.now + OUTRUN.playerSlowMs;
    this.stunUntil = this.time.now + OUTRUN.spotStunMs;
    this.publish(true);
  }

  private finish(reason: MissionResult["reason"]): void {
    if (this.resolved) return;
    this.resolved = true;
    this.mode = "roam";
    const success = reason === "clear";
    const scored = success ? missionPayout(this.timeLeft, this.tags) : { payout: 0, parts: [] };
    const result: MissionResult = {
      id: `${Date.now()}-${reason}`,
      success,
      reason,
      payout: scored.payout,
      timeLeftMs: this.timeLeft,
      tags: this.tags,
      parts: scored.parts,
    };
    this.carrying = false;
    this.crate.setPosition(PACKAGE.x, PACKAGE.y);
    this.crate.setVisible(true);
    this.bob.resume();
    outrunBus.emit("result", result);
    this.publish(true);
  }

  private objective(): string {
    if (this.mode === "roam") return "Walk the block, or start a getaway.";
    if (!this.carrying) return "Collect the package in front of the warehouse.";
    return "Reach the south exit before the tail tags you out.";
  }

  private prompt(): string | null {
    if (this.mode !== "mission") return "WASD to move";
    if (!this.carrying && Math.hypot(this.player.x - PACKAGE.x, this.player.y - PACKAGE.y) < 80) return "WALK ONTO THE PACKAGE";
    if (this.carrying && contains(EXIT, this.player.x, this.player.y, 24)) return "EXIT";
    if (this.carrying) return "PACKAGE ON YOU";
    return null;
  }

  private publish(force = false): void {
    const hud: MissionHud = {
      mode: this.mode,
      objective: this.objective(),
      prompt: this.prompt(),
      timeLeftMs: this.mode === "mission" ? this.timeLeft : 0,
      tags: this.mode === "mission" ? this.tags : 0,
      carrying: this.mode === "mission" && this.carrying,
    };
    const key = `${hud.mode}|${Math.ceil(hud.timeLeftMs / 1000)}|${hud.tags}|${hud.carrying}|${hud.objective}|${hud.prompt}`;
    if (!force && key === this.lastHud) return;
    this.lastHud = key;
    outrunBus.emit("hud", hud);
  }
}
