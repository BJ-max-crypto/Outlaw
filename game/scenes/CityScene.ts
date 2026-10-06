import Phaser from "phaser";
import { gameBus } from "@/lib/game/bus";
import type { CityProfile, Peer } from "@/lib/game/types";
import { Siren } from "@/game/audio/siren";
import { Player, type MoveInput } from "@/game/entities/Player";
import { createActorTextures, createRideTextures } from "@/game/entities/textures";
import { Vehicle } from "@/game/entities/Vehicle";
import { buildCityMap, closestSpawns, createWallBodies, paintCity, type PlacedBusiness } from "@/game/map/cityMap";
import { rectContains } from "@/game/map/geometry";
import { CityState } from "@/game/state/CityState";
import { PoliceDirector } from "@/game/systems/PoliceDirector";
import { RobberySystem } from "@/game/systems/RobberySystem";
import { WantedSystem } from "@/game/systems/WantedSystem";
import { TUNING } from "@/game/tuning";
import { FOODS, type FoodItem } from "@/game/world/catalog";

export class CityScene extends Phaser.Scene {
  private state!: CityState;
  private player!: Player;
  private map = buildCityMap();
  private rides: Vehicle[] = [];
  private riding: Vehicle | null = null;
  private rideLock = 0;
  private robbery!: RobberySystem;
  private wanted!: WantedSystem;
  private police!: PoliceDirector;
  private siren = new Siren();
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private blockers: Phaser.Geom.Rectangle[] = [];
  private footWalls!: Phaser.Physics.Arcade.Collider;
  private playerRides!: Phaser.Physics.Arcade.Collider;
  private live = false;
  private recoverUntil = 0;
  private decayMs = 0;
  private posMs = 0;
  private lastHudKey = "";
  private lastProgress = -1;
  private lastPrompt: string | null = null;
  private bannerToken = 0;
  private robReadyAt = new Map<string, number>();
  private peers = new Map<string, { sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text }>();
  private offStart: (() => void) | null = null;
  private offProfile: (() => void) | null = null;
  private offPeers: (() => void) | null = null;
  private keys!: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    arrowUp: Phaser.Input.Keyboard.Key;
    arrowDown: Phaser.Input.Keyboard.Key;
    arrowLeft: Phaser.Input.Keyboard.Key;
    arrowRight: Phaser.Input.Keyboard.Key;
    e: Phaser.Input.Keyboard.Key;
    f: Phaser.Input.Keyboard.Key;
    r: Phaser.Input.Keyboard.Key;
    g: Phaser.Input.Keyboard.Key;
    shift: Phaser.Input.Keyboard.Key;
    m: Phaser.Input.Keyboard.Key;
    food: Phaser.Input.Keyboard.Key[];
  };

  constructor() {
    super("city");
  }

  create(): void {
    this.state = new CityState();
    this.map = buildCityMap();
    this.rides = [];
    this.riding = null;
    this.rideLock = 0;
    this.live = false;
    this.recoverUntil = 0;
    this.decayMs = 0;
    this.posMs = 0;
    this.lastHudKey = "";
    this.lastProgress = -1;
    this.lastPrompt = null;
    this.bannerToken = 0;
    this.robReadyAt.clear();
    this.peers.clear();
    this.siren = new Siren();

    paintCity(this, this.map);
    createActorTextures(this);
    createRideTextures(this);
    this.walls = createWallBodies(this, this.map.walls);
    this.blockers = this.map.walls.map((wall) => new Phaser.Geom.Rectangle(wall.x, wall.y, wall.w, wall.h));
    this.physics.world.setBounds(0, 0, this.map.world.width, this.map.world.height);

    this.player = new Player(this, this.map.playerSpawn.x, this.map.playerSpawn.y);
    this.footWalls = this.physics.add.collider(this.player, this.walls);
    this.robbery = new RobberySystem();
    this.wanted = new WantedSystem(this.state);
    this.police = new PoliceDirector(this);

    const rideGroup = this.physics.add.group();
    for (const spec of this.map.rides) {
      const ride = new Vehicle(this, spec);
      rideGroup.add(ride);
      this.rides.push(ride);
    }
    this.physics.add.collider(rideGroup, this.walls);
    this.physics.add.collider(rideGroup, rideGroup);
    this.playerRides = this.physics.add.collider(this.player, rideGroup);
    this.physics.add.overlap(this.police.group, rideGroup, (_cop, ride) => {
      if ((ride as Vehicle).occupied) this.onCopHit();
    });

    this.bindKeys();
    this.cameras.main.setBounds(0, 0, this.map.world.width, this.map.world.height);
    this.cameras.main.startFollow(this.player, true, 0.16, 0.16);
    this.cameras.main.setZoom(1.12);
    this.game.canvas.tabIndex = 1;

    this.offStart = gameBus.on("start", () => {
      if (this.live) return;
      this.live = true;
      this.focusGame();
      this.pushHud();
    });
    this.offProfile = gameBus.on("profile", (profile) => this.applyProfile(profile));
    this.offPeers = gameBus.on("peers", (list) => this.syncPeers(list));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offStart?.();
      this.offProfile?.();
      this.offPeers?.();
      this.siren.stop();
      for (const peer of this.peers.values()) {
        peer.sprite.destroy();
        peer.label.destroy();
      }
    });

    gameBus.emit("map", {
      width: this.map.world.width,
      height: this.map.world.height,
      water: this.map.water,
      markers: this.map.markers,
    });
    gameBus.emit("robbery", 0);
    gameBus.emit("prompt", null);
    gameBus.emit("banner", null);
    this.pushHud();
  }

  update(_time: number, delta: number): void {
    if (!this.live) return;
    if (this.rideLock > 0) this.rideLock -= delta;

    const input = this.readInput();
    if (this.riding) {
      this.riding.drive(input, delta);
      this.player.setPosition(this.riding.x, this.riding.y);
      this.footWalls.active = false;
      this.playerRides.active = false;
    } else {
      this.footWalls.active = true;
      this.playerRides.active = true;
      const sprint = this.keys.shift.isDown && this.state.energy > 12;
      const scale = this.state.energy < 12 ? 0.6 : sprint ? 1.3 : 1;
      this.player.update(input, delta, scale);
    }

    this.drainEnergy(delta, input);
    const pay = this.state.tickIncome(delta);
    if (pay > 0) this.popup(this.player.x, this.player.y - 36, `+$${pay}`, "#d7c08a");

    this.decayWanted(delta);
    this.handleActions();
    this.runRobbery(delta);

    for (const ride of this.rides) ride.syncLabel();
    const chasing = this.wanted.active;
    this.police.update(delta, this.player, chasing, this.blockers);
    if (chasing) this.siren.update(delta);
    else if (this.siren.running) this.siren.stop();

    if (this.player.health <= 0 && this.time.now >= this.recoverUntil) this.bust();

    this.publishPrompt();
    this.pushHud();
    this.posMs += delta;
    if (this.posMs >= 80) {
      this.posMs = 0;
      const target = this.riding ?? this.player;
      gameBus.emit("pos", { x: target.x, y: target.y });
    }
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input is unavailable.");
    keyboard.addCapture([
      "W", "A", "S", "D", "E", "F", "R", "G", "M",
      "UP", "DOWN", "LEFT", "RIGHT", "SHIFT", "ONE", "TWO", "THREE",
    ]);
    const code = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      up: keyboard.addKey(code.W),
      down: keyboard.addKey(code.S),
      left: keyboard.addKey(code.A),
      right: keyboard.addKey(code.D),
      arrowUp: keyboard.addKey(code.UP),
      arrowDown: keyboard.addKey(code.DOWN),
      arrowLeft: keyboard.addKey(code.LEFT),
      arrowRight: keyboard.addKey(code.RIGHT),
      e: keyboard.addKey(code.E),
      f: keyboard.addKey(code.F),
      r: keyboard.addKey(code.R),
      g: keyboard.addKey(code.G),
      shift: keyboard.addKey(code.SHIFT),
      m: keyboard.addKey(code.M),
      food: [keyboard.addKey(code.ONE), keyboard.addKey(code.TWO), keyboard.addKey(code.THREE)],
    };
  }

  private readInput(): MoveInput {
    return {
      up: this.keys.up.isDown || this.keys.arrowUp.isDown,
      down: this.keys.down.isDown || this.keys.arrowDown.isDown,
      left: this.keys.left.isDown || this.keys.arrowLeft.isDown,
      right: this.keys.right.isDown || this.keys.arrowRight.isDown,
    };
  }

  private drainEnergy(delta: number, input: MoveInput): void {
    const moving = input.up || input.down || input.left || input.right;
    let rate = 0;
    if (this.riding) {
      if (Math.abs(this.riding.speed) > 20) rate = TUNING.energyDrive;
    } else if (moving) {
      const sprint = this.keys.shift.isDown && this.state.energy > 12;
      rate = sprint ? TUNING.energySprint : TUNING.energyWalk;
    }
    if (rate <= 0) return;
    this.state.energy = Math.max(0, this.state.energy - rate * (delta / 1000));
  }

  private decayWanted(delta: number): void {
    if (this.state.wanted <= 0) {
      this.decayMs = 0;
      return;
    }
    const seen = this.police.officers.some((officer) => officer.seesPlayer);
    if (seen) {
      this.decayMs = 0;
      return;
    }
    this.decayMs += delta;
    if (this.decayMs < TUNING.wantedDecayMs) return;
    this.decayMs = 0;
    this.state.wanted -= 1;
    if (this.state.wanted <= 0) this.siren.stop();
  }

  private handleActions(): void {
    const just = Phaser.Input.Keyboard.JustDown;
    if (just(this.keys.m)) gameBus.emit("map-toggle");
    if (just(this.keys.g)) this.eatFood();
    if (this.riding) {
      if (just(this.keys.f) && this.rideLock <= 0) this.dismount();
      return;
    }
    this.keys.food.forEach((key, index) => {
      if (just(key)) this.buyFood(index);
    });
    if (just(this.keys.e)) this.confirm();
    if (just(this.keys.f) && this.rideLock <= 0) this.useRide();
  }

  private confirm(): void {
    const ride = this.focusRide();
    if (ride?.forSale && !ride.owned) {
      this.buyRide(ride);
      return;
    }
    if (this.inJob() && !this.state.employed) {
      this.state.employed = true;
      this.popup(this.player.x, this.player.y - 28, "HIRED", "#d7c08a");
      this.flash("SHIFT STARTED");
      return;
    }
    const spot = this.businessAt();
    if (!spot || this.state.owns(spot.id)) return;
    if (!this.state.spend(spot.price)) {
      this.popup(this.player.x, this.player.y - 28, "NEED CASH", "#f4f1ea");
      return;
    }
    this.state.ownedBusinesses.add(spot.id);
    this.popup(this.player.x, this.player.y - 28, spot.name, "#d7c08a");
  }

  private useRide(): void {
    const ride = this.focusRide();
    if (!ride) return;
    if (!ride.owned) {
      if (ride.kind === "boat") return;
      ride.owned = true;
      ride.stolen = true;
      this.state.ownedVehicles.add(ride.id);
      ride.refreshLabel();
      this.onCrime(ride.forSale ? 2 : 1, "STOLEN");
    }
    this.mount(ride);
  }

  private buyRide(ride: Vehicle): void {
    if (!this.state.spend(ride.price)) {
      this.popup(ride.x, ride.y - 40, "NEED CASH", "#f4f1ea");
      return;
    }
    ride.owned = true;
    ride.stolen = false;
    this.state.ownedVehicles.add(ride.id);
    ride.refreshLabel();
    this.popup(ride.x, ride.y - 40, ride.name, "#d7c08a");
    this.mount(ride);
  }

  private mount(ride: Vehicle): void {
    this.riding = ride;
    ride.occupied = true;
    const body = ride.body as Phaser.Physics.Arcade.Body;
    body.setImmovable(false);
    this.player.setRiding(true);
    this.footWalls.active = false;
    this.playerRides.active = false;
    this.rideLock = 320;
    this.follow(ride);
    ride.refreshLabel();
  }

  private dismount(): void {
    const ride = this.riding;
    if (!ride) return;
    ride.park();
    if (ride.kind === "boat") {
      const dock = this.map.dockZone;
      this.player.setPosition(dock.x + dock.w / 2, dock.y + dock.h / 2);
    } else {
      const side = ride.heading + Math.PI / 2;
      this.player.setPosition(ride.x + Math.cos(side) * 52, ride.y + Math.sin(side) * 52);
    }
    this.player.setRiding(false);
    this.riding = null;
    this.footWalls.active = true;
    this.playerRides.active = true;
    this.rideLock = 320;
    this.follow(this.player);
  }

  private buyFood(index: number): void {
    const food = FOODS[index];
    if (!food || this.riding) return;
    if (!rectContains(this.map.groceryZone, this.player.x, this.player.y)) return;
    if (this.state.food.length >= TUNING.packSize) {
      this.popup(this.player.x, this.player.y - 28, "PACK FULL", "#f4f1ea");
      return;
    }
    const price = this.foodPrice(food);
    if (!this.state.spend(price)) {
      this.popup(this.player.x, this.player.y - 28, "NEED CASH", "#f4f1ea");
      return;
    }
    this.state.food.push(food);
    this.popup(this.player.x, this.player.y - 28, food.name, "#7dcea0");
  }

  private eatFood(): void {
    const food = this.state.eat();
    if (!food) {
      this.popup(this.player.x, this.player.y - 28, "NO FOOD", "#f4f1ea");
      return;
    }
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + food.energy);
    this.player.heal(food.health);
    this.popup(this.player.x, this.player.y - 28, `+${food.energy} ENERGY`, "#7dcea0");
  }

  private runRobbery(delta: number): void {
    const spot = this.businessAt();
    const allowed = !!spot && !this.riding && !this.state.owns(spot.id) && this.canRob(spot.id);
    const finished = this.robbery.update(delta, this.keys.r.isDown && allowed, allowed);
    const progress = finished ? 0 : this.robbery.progress;
    if (progress !== this.lastProgress) {
      this.lastProgress = progress;
      gameBus.emit("robbery", progress);
    }
    if (!finished || !spot) return;
    const span = spot.robMax - spot.robMin;
    const take = spot.robMin + Math.floor(Math.random() * (span + 1));
    this.state.cash += take;
    this.robReadyAt.set(spot.id, this.time.now + 45000);
    this.robbery.reset();
    this.lastProgress = 0;
    gameBus.emit("robbery", 0);
    this.popup(this.player.x, this.player.y - 36, `+$${take}`, "#d7c08a");
    this.onCrime(spot.wanted, "ALARM — UNITS MOVING");
  }

  private onCrime(wanted: number, banner: string): void {
    this.wanted.raiseTo(wanted);
    const here = { x: this.player.x, y: this.player.y };
    const spots = closestSpawns(this.map.policeSpawns, here.x, here.y, 3);
    this.police.alert(spots, this.walls, this.player, here, () => this.onCopHit());
    this.siren.start();
    this.decayMs = 0;
    this.cameras.main.shake(180, 0.004);
    this.flash(banner);
  }

  private onCopHit(): void {
    if (this.time.now < this.recoverUntil) return;
    if (!this.player.hurt(TUNING.copDamage)) return;
    this.cameras.main.shake(80, 0.003);
  }

  private bust(): void {
    const lost = this.state.cutInHalf();
    const ride = this.riding;
    if (ride) {
      const stolen = ride.stolen;
      this.dismount();
      if (stolen) {
        this.state.ownedVehicles.delete(ride.id);
        ride.impound();
      }
    }
    this.player.setPosition(this.map.bustSpawn.x, this.map.bustSpawn.y);
    this.player.health = TUNING.playerHealth;
    this.player.grantSafety(TUNING.bustSafetyMs);
    this.state.energy = 50;
    this.wanted.clear();
    this.siren.stop();
    this.recoverUntil = this.time.now + TUNING.bustSafetyMs;
    this.cameras.main.flash(200, 160, 36, 36);
    this.flash(`BUSTED — LOST $${lost}`);
    this.pushHud();
  }

  private applyProfile(profile: CityProfile): void {
    this.state.cash = profile.cash;
    this.state.energy = profile.energy;
    this.state.employed = profile.employed;
    this.state.ownedBusinesses.clear();
    for (const id of profile.businesses) this.state.ownedBusinesses.add(id);
    this.state.ownedVehicles.clear();
    for (const ride of this.rides) {
      ride.owned = profile.vehicles.includes(ride.id);
      ride.stolen = false;
      ride.refreshLabel();
      if (ride.owned) this.state.ownedVehicles.add(ride.id);
    }
    this.pushHud();
  }

  private syncPeers(list: Peer[]): void {
    const seen = new Set<string>();
    for (const peer of list) {
      seen.add(peer.id);
      let row = this.peers.get(peer.id);
      if (!row) {
        const sprite = this.add.sprite(peer.x, peer.y, "player-s-0").setScale(1.45).setTint(0x8eb4ff).setDepth(150);
        const label = this.add
          .text(peer.x, peer.y - 36, peer.name, { fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#d5e4ff" })
          .setOrigin(0.5)
          .setDepth(151);
        row = { sprite, label };
        this.peers.set(peer.id, row);
      }
      row.sprite.setPosition(peer.x, peer.y).setDepth(150 + peer.y);
      row.label.setPosition(peer.x, peer.y - 36).setText(peer.name);
    }
    for (const [id, row] of this.peers) {
      if (seen.has(id)) continue;
      row.sprite.destroy();
      row.label.destroy();
      this.peers.delete(id);
    }
  }

  private focusRide(): Vehicle | null {
    let best: Vehicle | null = null;
    let bestD = 78;
    for (const ride of this.rides) {
      if (ride.occupied) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, ride.x, ride.y);
      if (distance < bestD) {
        best = ride;
        bestD = distance;
      }
    }
    if (best) return best;
    if (rectContains(this.map.dockZone, this.player.x, this.player.y)) {
      return this.rides.find((ride) => ride.kind === "boat") ?? null;
    }
    return null;
  }

  private businessAt(): PlacedBusiness | null {
    return this.map.businesses.find((business) => rectContains(business.zone, this.player.x, this.player.y)) ?? null;
  }

  private inJob(): boolean {
    return rectContains(this.map.jobZone, this.player.x, this.player.y);
  }

  private canRob(id: string): boolean {
    return (this.robReadyAt.get(id) ?? 0) <= this.time.now;
  }

  private foodPrice(food: FoodItem): number {
    if (!this.state.owns("mart")) return food.price;
    return Math.max(1, Math.ceil(food.price * 0.8));
  }

  private publishPrompt(): void {
    const prompt = this.promptText();
    if (prompt === this.lastPrompt) return;
    this.lastPrompt = prompt;
    gameBus.emit("prompt", prompt);
  }

  private promptText(): string | null {
    if (this.riding) return "F EXIT";
    const ride = this.focusRide();
    if (ride) {
      if (ride.owned) return ride.kind === "boat" ? "F BOARD" : "F ENTER";
      if (ride.forSale) return `E BUY ${ride.name} $${ride.price}${ride.kind === "car" ? " · F STEAL" : ""}`;
      return "F STEAL";
    }
    const lines: string[] = [];
    if (this.inJob()) lines.push(this.state.employed ? "ON THE CLOCK" : "E CLOCK IN");
    const spot = this.businessAt();
    if (spot && !this.state.owns(spot.id)) {
      lines.push(this.canRob(spot.id) ? `E BUY $${spot.price} · HOLD R TO ROB` : "COME BACK LATER");
    } else if (spot) {
      lines.push("YOU OWN THIS");
    }
    if (rectContains(this.map.groceryZone, this.player.x, this.player.y)) {
      const menu = FOODS.map((food, index) => `${index + 1} ${food.name} $${this.foodPrice(food)}`).join(" · ");
      lines.push(menu);
    }
    if (this.state.food.length > 0) lines.push("G EAT");
    return lines.length > 0 ? lines.join(" · ") : null;
  }

  private hint(): string {
    if (this.state.wanted > 0) return "Lose the cops. Getting busted cuts your cash in half.";
    if (this.state.employed) return "Shift pay is on. Buy food when your energy drops.";
    return "Work a shift, rob a spot, or take a car. The city does not end.";
  }

  private follow(target: Phaser.GameObjects.Components.Transform): void {
    this.cameras.main.startFollow(target, true, 0.16, 0.16);
  }

  private pushHud(): void {
    this.state.health = this.player.health;
    const snapshot = this.state.snapshot(this.hint());
    const hudKey = [
      snapshot.cash,
      snapshot.health,
      snapshot.energy,
      snapshot.wanted,
      snapshot.food,
      snapshot.employed,
      snapshot.objective,
      snapshot.businesses.join(","),
      snapshot.vehicles.join(","),
    ].join("|");
    if (hudKey === this.lastHudKey) return;
    this.lastHudKey = hudKey;
    gameBus.emit("hud", snapshot);
  }

  private flash(message: string): void {
    this.bannerToken += 1;
    const token = this.bannerToken;
    gameBus.emit("banner", message);
    this.time.delayedCall(2600, () => {
      if (this.bannerToken === token) gameBus.emit("banner", null);
    });
  }

  private focusGame(): void {
    this.game.canvas.focus();
  }

  private popup(x: number, y: number, message: string, color: string): void {
    const text = this.add
      .text(x, y, message, {
        fontFamily: "Arial Black, Arial, sans-serif",
        fontSize: "20px",
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
