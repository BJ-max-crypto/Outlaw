import Phaser from "phaser";
import { gameBus } from "@/lib/game/bus";
import { Siren } from "@/game/audio/siren";
import { Player } from "@/game/entities/Player";
import { createActorTextures } from "@/game/entities/textures";
import { buildCityMap, createWallBodies, paintCity } from "@/game/map/cityMap";
import { rectContains } from "@/game/map/geometry";
import { HeistState, seizeTake } from "@/game/state/HeistState";
import { interactionPrompt } from "@/game/systems/InteractionSystem";
import { PoliceDirector } from "@/game/systems/PoliceDirector";
import { RobberySystem } from "@/game/systems/RobberySystem";
import { WantedSystem } from "@/game/systems/WantedSystem";
import { TUNING } from "@/game/tuning";

export class HeistScene extends Phaser.Scene {
  private state!: HeistState;
  private player!: Player;
  private robKey!: Phaser.Input.Keyboard.Key;
  private upKey!: Phaser.Input.Keyboard.Key;
  private downKey!: Phaser.Input.Keyboard.Key;
  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;
  private arrowUp!: Phaser.Input.Keyboard.Key;
  private arrowDown!: Phaser.Input.Keyboard.Key;
  private arrowLeft!: Phaser.Input.Keyboard.Key;
  private arrowRight!: Phaser.Input.Keyboard.Key;
  private lastHudKey = "";
  private robbery!: RobberySystem;
  private wanted!: WantedSystem;
  private police!: PoliceDirector;
  private siren = new Siren();
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private blockers: Phaser.Geom.Rectangle[] = [];
  private map = buildCityMap();
  private live = false;
  private over = false;
  private lastProgress = 0;
  private lastPrompt: string | null = null;
  private offStart: (() => void) | null = null;
  private offRestart: (() => void) | null = null;

  constructor() {
    super("heist");
  }

  create(): void {
    const savedCash = this.registry.get("wallet");
    const cash = typeof savedCash === "number" ? savedCash : 0;
    this.state = new HeistState(cash);
    this.map = buildCityMap();
    this.live = this.registry.get("resume") === true;
    this.over = false;
    this.lastProgress = 0;
    this.lastPrompt = null;
    this.lastHudKey = "";
    this.siren = new Siren();

    paintCity(this, this.map);
    createActorTextures(this);
    this.walls = createWallBodies(this, this.map.walls);
    this.blockers = this.map.walls.map(
      (wall) => new Phaser.Geom.Rectangle(wall.x, wall.y, wall.w, wall.h),
    );

    this.physics.world.setBounds(0, 0, this.map.world.width, this.map.world.height);
    this.player = new Player(this, this.map.playerSpawn.x, this.map.playerSpawn.y);
    this.physics.add.collider(this.player, this.walls);

    this.robbery = new RobberySystem(this.state);
    this.wanted = new WantedSystem(this.state);
    this.police = new PoliceDirector(this);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input is unavailable.");
    keyboard.addCapture(["W", "A", "S", "D", "E", "UP", "DOWN", "LEFT", "RIGHT", "SPACE"]);
    this.upKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.downKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.leftKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.rightKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.robKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.arrowUp = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.arrowDown = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.arrowLeft = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.arrowRight = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);

    this.cameras.main.setBounds(0, 0, this.map.world.width, this.map.world.height);
    this.cameras.main.startFollow(this.player, true, 0.16, 0.16);
    this.cameras.main.setZoom(1.32);
    this.game.canvas.tabIndex = 1;

    if (this.live) {
      this.state.phase = "infiltrating";
      this.focusGame();
    }

    this.offStart = gameBus.on("start", () => {
      if (this.live) return;
      this.live = true;
      this.state.phase = "infiltrating";
      this.focusGame();
      this.pushHud();
    });
    this.offRestart = gameBus.on("restart", () => {
      this.registry.set("wallet", this.state.cash);
      this.registry.set("resume", true);
      this.siren.stop();
      this.scene.restart();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offStart?.();
      this.offRestart?.();
      this.siren.stop();
    });

    this.pushHud();
    gameBus.emit("robbery", 0);
    gameBus.emit("prompt", null);
    gameBus.emit("banner", null);
  }

  update(_time: number, delta: number): void {
    if (!this.live || this.over) return;

    this.player.update(
      {
        up: this.upKey.isDown || this.arrowUp.isDown,
        down: this.downKey.isDown || this.arrowDown.isDown,
        left: this.leftKey.isDown || this.arrowLeft.isDown,
        right: this.rightKey.isDown || this.arrowRight.isDown,
      },
      delta,
    );
    const inStore = rectContains(this.map.robberyZone, this.player.x, this.player.y);
    const finished = this.robbery.update(delta, this.robKey.isDown, inStore);
    this.publishRobbery();

    if (finished) this.onRobbed();

    const chasing = this.wanted.active && !this.over;
    this.police.update(delta, this.player, chasing, this.blockers);
    this.siren.update(delta);

    if (this.tryEscape()) return;
    if (this.player.health <= 0) {
      this.bust();
      return;
    }

    this.state.health = this.player.health;
    const nearVan =
      this.state.phase === "escaping" &&
      rectContains(this.map.getawayZone, this.player.x, this.player.y, 36) &&
      !rectContains(this.map.getawayZone, this.player.x, this.player.y);
    const prompt = interactionPrompt({
      inRobberyZone: inStore,
      nearGetaway: nearVan,
      robbed: this.state.robbed,
      phase: this.state.phase,
    });
    if (prompt !== this.lastPrompt) {
      this.lastPrompt = prompt;
      gameBus.emit("prompt", prompt);
    }
    this.pushHud();
  }

  private onRobbed(): void {
    this.wanted.raiseTo(TUNING.wantedOnRob);
    this.police.spawn(
      this.map.policeSpawns,
      this.walls,
      this.player,
      { x: this.map.playerSpawn.x, y: this.map.playerSpawn.y - 40 },
      () => this.onCopHit(),
    );
    this.siren.start();
    this.cameras.main.shake(220, 0.005);
    this.popup(this.player.x, this.player.y - 36, `+$${this.state.heistTake}`, "#d7c08a");
    gameBus.emit("banner", "ALARM — UNITS MOVING");
    this.time.delayedCall(2400, () => {
      if (!this.over) gameBus.emit("banner", null);
    });
    this.pushHud();
  }

  private onCopHit(): void {
    const hit = this.player.hurt(TUNING.copDamage);
    if (!hit) return;
    this.state.health = this.player.health;
    this.cameras.main.shake(90, 0.003);
    this.pushHud();
  }

  private tryEscape(): boolean {
    if (this.state.phase !== "escaping") return false;
    if (!rectContains(this.map.getawayZone, this.player.x, this.player.y)) return false;
    this.finish(true);
    return true;
  }

  private bust(): void {
    const seized = this.state.heistTake;
    this.state.cash = seizeTake(this.state.cash, seized);
    this.state.heistTake = 0;
    this.finish(false, seized);
  }

  private finish(escaped: boolean, seized = 0): void {
    this.over = true;
    this.state.phase = escaped ? "complete" : "busted";
    this.wanted.clear();
    this.police.stop();
    this.siren.stop();
    this.player.setAcceleration(0, 0);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    gameBus.emit("prompt", null);
    gameBus.emit("banner", null);
    gameBus.emit("robbery", 0);
    this.pushHud();
    const result = { earned: escaped ? this.state.heistTake : 0, total: this.state.cash, seized };
    gameBus.emit(escaped ? "complete" : "busted", result);
  }

  private publishRobbery(): void {
    const progress = this.state.robbed ? 1 : this.robbery.progress;
    if (Math.abs(progress - this.lastProgress) < 0.004 && progress !== 0 && progress !== 1) return;
    if (progress === this.lastProgress) return;
    this.lastProgress = progress;
    gameBus.emit("robbery", progress >= 1 ? 0 : progress);
  }

  private pushHud(): void {
    this.state.health = this.player.health;
    const snapshot = this.state.snapshot();
    const hudKey = `${snapshot.cash}|${snapshot.health}|${snapshot.wanted}|${snapshot.objective}`;
    if (hudKey === this.lastHudKey) return;
    this.lastHudKey = hudKey;
    gameBus.emit("hud", snapshot);
  }

  private focusGame(): void {
    this.game.canvas.focus();
  }

  private popup(x: number, y: number, message: string, color: string): void {
    const text = this.add
      .text(x, y, message, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "22px",
        color,
      })
      .setOrigin(0.5)
      .setDepth(4000);
    this.tweens.add({
      targets: text,
      y: y - 42,
      alpha: 0,
      duration: 880,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });
  }
}
