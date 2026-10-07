import Phaser from "phaser";
import { gameBus } from "@/lib/game/bus";
import type { CityProfile, Peer, SessionView } from "@/lib/game/types";
import { Siren } from "@/game/audio/siren";
import { Player, type MoveInput } from "@/game/entities/Player";
import { createActorTextures } from "@/game/entities/textures";
import { Vehicle } from "@/game/entities/Vehicle";
import { buildCityMap, closestSpawns, createWallBodies, paintCity, type PlacedBusiness } from "@/game/map/cityMap";
import { rectContains } from "@/game/map/geometry";
import { MAP_SCALE, isWaterWorld, landIslandIndex, setIslandOrigins } from "@/game/map/waterMask";
import { getMatch, heldIncome, islandIncome, islandOrigin, ISLAND_SPAN, orderIslands, setMatch, takePendingProfile } from "@/game/mode/match";
import type { EconomyView } from "@/lib/economy/model";
import { businessPerMinute, marketQuotes } from "@/lib/economy/model";
import { formatCash } from "@/lib/game/format";
import { CityState } from "@/game/state/CityState";
import { PoliceDirector } from "@/game/systems/PoliceDirector";
import { RobberySystem } from "@/game/systems/RobberySystem";
import { WantedSystem } from "@/game/systems/WantedSystem";
import { TUNING } from "@/game/tuning";
import { businessById, FOODS, type FoodItem, type MarketQuote } from "@/game/world/catalog";

const ZOOM_MIN = 0.55;
const ZOOM_MAX = 2.5;
const CAR_REACH = 110;
const BOAT_REACH = 220;
const DOCK_REACH = 560;

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
  private rideGroup!: Phaser.Physics.Arcade.Group;
  private blockers: Phaser.Geom.Rectangle[] = [];
  private footWalls!: Phaser.Physics.Arcade.Collider;
  private playerRides!: Phaser.Physics.Arcade.Collider;
  private live = false;
  private recoverUntil = 0;
  private decayMs = 0;
  private posMs = 0;
  private marketMs = 0;
  private escapeMs = 0;
  private lastEscapeSec = 0;
  private lastHudKey = "";
  private lastProgress = -1;
  private lastPrompt: string | null = null;
  private gasEmpty = false;
  private wasOnShift = false;
  private buyLock = false;
  private serverMarket = false;
  private wasInPort = false;
  private lastSpot: string | null = null;
  private bannerToken = 0;
  private robReadyAt = new Map<string, number>();
  private peers = new Map<string, { sprite: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text }>();
  private feet = new WeakMap<object, { x: number; y: number }>();
  private quotes: MarketQuote[] = marketQuotes();
  private stockOpen = false;
  private groceryOpen = false;
  private groceryDismissed = false;
  private viewZoom = 1.52;
  private lastPinch = 0;
  private offStart: (() => void) | null = null;
  private offProfile: (() => void) | null = null;
  private offPeers: (() => void) | null = null;
  private offOrder: (() => void) | null = null;
  private offLedgerDeny: (() => void) | null = null;
  private offStocksClose: (() => void) | null = null;
  private offGroceryBuy: (() => void) | null = null;
  private offGroceryStore: (() => void) | null = null;
  private offGroceryClose: (() => void) | null = null;
  private offSession: (() => void) | null = null;
  private offReward: (() => void) | null = null;
  private offHold: (() => void) | null = null;
  private offBust: (() => void) | null = null;
  private offBoat: (() => void) | null = null;
  private hasBoat = false;
  private rewardUntil = 0;
  private speedUntil = 0;
  private energyUntil = 0;
  private gasUntil = 0;
  private hold = 0;
  private bustPending = false;
  private offeredIsland: number | null = null;
  private homeSpot = { x: 0, y: 0 };
  private onWheel?: (event: WheelEvent) => void;
  private onKeyDown?: (event: KeyboardEvent) => void;
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
    esc: Phaser.Input.Keyboard.Key;
    food: Phaser.Input.Keyboard.Key[];
  };

  constructor() {
    super("city");
  }

  preload(): void {
    this.load.image("island", "/map/island.png");
    const files = [
      "car-white",
      "car-red",
      "car-blue",
      "car-olive",
      "car-yellow",
      "boat-white",
      "boat-wood",
      "boat-black",
      "boat-deck",
    ];
    for (const file of files) this.load.image(file, `/vehicles/${file}.png`);
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
    this.marketMs = 0;
    this.escapeMs = 0;
    this.lastEscapeSec = 0;
    this.lastHudKey = "";
    this.lastProgress = -1;
    this.lastPrompt = null;
    this.bannerToken = 0;
    this.robReadyAt.clear();
    this.peers.clear();
    this.feet = new WeakMap();
    this.quotes = marketQuotes();
    this.stockOpen = false;
    this.groceryOpen = false;
    this.groceryDismissed = false;
    this.gasEmpty = false;
    this.wasOnShift = false;
    this.buyLock = false;
    this.serverMarket = false;
    this.wasInPort = false;
    this.lastSpot = null;
    this.viewZoom = 1.52;
    this.lastPinch = 0;
    this.hasBoat = false;
    this.rewardUntil = 0;
    this.speedUntil = 0;
    this.energyUntil = 0;
    this.gasUntil = 0;
    this.hold = 0;
    this.bustPending = false;
    this.offeredIsland = null;
    this.homeSpot = { x: this.map.playerSpawn.x, y: this.map.playerSpawn.y };
    this.siren = new Siren();

    paintCity(this);
    createActorTextures(this);
    this.walls = createWallBodies(this, this.map.walls);
    this.blockers = this.map.walls.map((wall) => new Phaser.Geom.Rectangle(wall.x, wall.y, wall.w, wall.h));
    this.layoutIslands();

    this.player = new Player(this, this.map.playerSpawn.x, this.map.playerSpawn.y);
    this.footWalls = this.physics.add.collider(this.player, this.walls);
    this.robbery = new RobberySystem();
    this.wanted = new WantedSystem(this.state);
    this.police = new PoliceDirector(this);

    this.rideGroup = this.physics.add.group({ immovable: true, collideWorldBounds: true });
    for (const spec of this.map.rides) {
      const ride = new Vehicle(this, spec);
      this.rideGroup.add(ride);
      ride.stayParked();
      this.rides.push(ride);
    }
    this.physics.add.collider(this.rideGroup, this.walls);
    this.physics.add.collider(this.rideGroup, this.rideGroup);
    this.playerRides = this.physics.add.collider(this.player, this.rideGroup);
    this.physics.add.overlap(this.police.group, this.rideGroup, (_cop, ride) => {
      if ((ride as Vehicle).occupied) this.onCopHit();
    });

    this.bindKeys();
    this.bindZoom();
    const camera = this.cameras.main;
    camera.stopFollow();
    camera.setBackgroundColor("#0c4c78");
    camera.setRoundPixels(false);
    camera.setZoom(this.viewZoom);
    camera.centerOn(this.player.x, this.player.y);
    this.game.canvas.tabIndex = 1;
    this.game.canvas.style.touchAction = "none";

    this.offStart = gameBus.on("start", () => {
      if (this.live) return;
      this.live = true;
      this.focusGame();
      this.pushHud();
    });
    this.offProfile = gameBus.on("profile", (profile) => this.applyProfile(profile));
    this.offPeers = gameBus.on("peers", (list) => this.syncPeers(list));
    this.offOrder = gameBus.on("ledger", (view) => this.applyLedger(view));
    this.offLedgerDeny = gameBus.on("ledger-deny", (reason) => {
      this.buyLock = false;
      this.popup(this.player.x, this.player.y - 28, reason, "#f4f1ea");
    });
    this.offStocksClose = gameBus.on("stocks-close", () => this.closeStocks());
    this.offGroceryBuy = gameBus.on("grocery-buy", (index) => this.buyFood(index));
    this.offGroceryStore = gameBus.on("grocery-store", () => this.buyStore());
    this.offGroceryClose = gameBus.on("grocery-close", () => {
      this.groceryDismissed = true;
      this.closeGrocery();
    });
    this.offSession = gameBus.on("session", (session) => this.applySession(session));
    this.offReward = gameBus.on("reward", (reward) => this.applyReward(reward));
    this.offHold = gameBus.on("ad-hold", (held) => {
      this.hold += held ? 1 : -1;
      if (this.hold < 0) this.hold = 0;
    });
    this.offBust = gameBus.on("bust-resolve", (choice) => this.resolveBust(choice));
    this.offBoat = gameBus.on("spawn-boat", () => {
      this.hasBoat = true;
      this.spawnYacht();
    });

    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.onPostUpdate, this);
      this.offStart?.();
      this.offProfile?.();
      this.offPeers?.();
      this.offOrder?.();
      this.offLedgerDeny?.();
      this.offStocksClose?.();
      this.offGroceryBuy?.();
      this.offGroceryStore?.();
      this.offGroceryClose?.();
      this.offSession?.();
      this.offReward?.();
      this.offHold?.();
      this.offBust?.();
      this.offBoat?.();
      if (this.onWheel) this.game.canvas.removeEventListener("wheel", this.onWheel);
      if (this.onKeyDown) window.removeEventListener("keydown", this.onKeyDown);
      this.siren.stop();
      this.closeStocks();
      this.closeGrocery();
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
    gameBus.emit("stocks", null);
    gameBus.emit("grocery", null);
    gameBus.emit("escape", null);
    gameBus.emit("island-offer", null);
    const pending = takePendingProfile();
    if (pending) this.applyProfile(pending);
    const match = getMatch();
    if (match.mode === "multi") {
      this.applyHeldIncome(match.islands, match.playerId);
      const mine = match.islands.find((island) => island.id === match.playerId);
      if (mine?.boat) {
        this.hasBoat = true;
        this.spawnYacht();
      }
    }
    if (match.autostart) {
      this.live = true;
      this.focusGame();
    }
    if (match.mode === "multi") {
      this.player.setPosition(this.map.playerSpawn.x, this.map.playerSpawn.y);
      const body = this.player.body as Phaser.Physics.Arcade.Body | null;
      body?.reset(this.map.playerSpawn.x, this.map.playerSpawn.y);
      this.time.delayedCall(400, () => this.flash("YOUR ISLAND"));
    }
    this.contain();
    this.pushHud();
  }

  update(_time: number, delta: number): void {
    if (!this.live || this.hold > 0) return;
    if (this.rideLock > 0) this.rideLock -= delta;

    const input = this.readInput();
    const speedBoost = this.speedUntil > this.time.now ? 2 : 1;
    const gasScale = this.gasUntil > this.time.now ? 0.5 : 1;
    if (this.riding) {
      this.riding.drive(input, delta, speedBoost, gasScale);
      if (this.riding.gas <= 0 && !this.gasEmpty) {
        this.gasEmpty = true;
        this.flash("OUT OF GAS");
      }
      if (this.riding.gas > 0) this.gasEmpty = false;
      this.player.setPosition(this.riding.x, this.riding.y);
      this.footWalls.active = false;
      this.playerRides.active = false;
    } else {
      this.footWalls.active = true;
      this.playerRides.active = true;
      const sprint = this.keys.shift.isDown && this.state.energy > 12;
      const scale = (this.state.energy < 12 ? 0.6 : sprint ? 1.3 : 1) * speedBoost;
      this.player.update(input, delta, scale);
    }

    for (const ride of this.rides) {
      if (ride !== this.riding) ride.stayParked();
    }

    if (this.rewardUntil > 0 && this.time.now >= this.rewardUntil) {
      this.rewardUntil = 0;
      this.state.earningsScale = 1;
    }
    this.drainEnergy(delta, input);
    const onShift = this.state.employed && this.inJob();
    if (this.wasOnShift && !onShift) this.popup(this.player.x, this.player.y - 28, "OFF THE CLOCK", "#f4f1ea");
    this.wasOnShift = onShift;
    const pay = this.state.tickIncome(delta, onShift);
    if (pay > 0) this.popup(this.player.x, this.player.y - 36, `+$${pay}`, "#d7c08a");
    this.tickMarket();
    if (this.stockOpen && !this.inStock()) this.closeStocks();

    if (this.escapeMs <= 0) this.decayWanted(delta);
    this.tickEscape(delta);
    this.handleActions();
    this.watchPort();
    this.watchIslands();
    this.syncGrocery();
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

  private onPostUpdate(): void {
    if (!this.player) return;
    if (this.live) this.readPinch();
    this.contain();
    const camera = this.cameras.main;
    camera.setZoom(this.viewZoom);
    const target = this.riding ?? this.player;
    camera.centerOn(target.x, target.y);
  }

  private bindZoom(): void {
    this.input.addPointer(2);
    this.onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      if (!this.live) return;
      const direction = event.deltaY > 0 ? -1 : 1;
      const magnitude = Math.min(0.22, Math.abs(event.deltaY) * 0.01);
      this.viewZoom = Phaser.Math.Clamp(this.viewZoom + direction * Math.max(0.04, magnitude), ZOOM_MIN, ZOOM_MAX);
    };
    this.game.canvas.addEventListener("wheel", this.onWheel, { passive: false });
  }

  private readPinch(): void {
    const a = this.input.pointer1;
    const b = this.input.pointer2;
    if (!a?.isDown || !b?.isDown) {
      this.lastPinch = 0;
      return;
    }
    const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
    if (this.lastPinch > 12) {
      this.viewZoom = Phaser.Math.Clamp(this.viewZoom * (dist / this.lastPinch), ZOOM_MIN, ZOOM_MAX);
    }
    this.lastPinch = dist;
  }

  /** Copies of the island sit across the ocean. Index 0 stays on the original map. */
  private layoutIslands(): void {
    const match = getMatch();
    const count = match.mode === "multi" ? Math.max(1, match.islands.length) : 1;
    const origins = Array.from({ length: count }, (_, index) => islandOrigin(index));
    setIslandOrigins(origins);
    if (match.mode === "multi" && origins.length > 0) {
      const home = match.islands[0]?.username || match.username || "ISLAND";
      this.add
        .text(ISLAND_SPAN / 2, 90, home, {
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: "42px",
          color: "#f4f1ea",
        })
        .setOrigin(0.5)
        .setDepth(6);
    }
    for (let index = 1; index < origins.length; index += 1) {
      const origin = origins[index];
      this.add.image(origin.x, origin.y, "island").setOrigin(0, 0).setScale(MAP_SCALE).setDepth(0);
      const name = match.islands[index]?.username || "ISLAND";
      this.add
        .text(origin.x + ISLAND_SPAN / 2, origin.y + 90, name, {
          fontFamily: "Arial Black, Arial, sans-serif",
          fontSize: "42px",
          color: "#f4f1ea",
        })
        .setOrigin(0.5)
        .setDepth(6);
      for (const wall of this.map.walls) {
        const shifted = { x: wall.x + origin.x, y: wall.y + origin.y, w: wall.w, h: wall.h };
        this.blockers.push(new Phaser.Geom.Rectangle(shifted.x, shifted.y, shifted.w, shifted.h));
        const body = this.add.rectangle(shifted.x + shifted.w / 2, shifted.y + shifted.h / 2, shifted.w, shifted.h, 0x000000, 0);
        this.walls.add(body);
      }
    }
    const width = origins[origins.length - 1].x + ISLAND_SPAN;
    this.physics.world.setBounds(0, 0, width, ISLAND_SPAN);
    this.walls.refresh();
  }

  /** The million-dollar yacht is the only ride that may leave home water. */
  private fenceCrossing(): void {
    if (getMatch().mode !== "multi" || this.hasBoat) return;
    const target = this.riding ?? this.player;
    const inside = target.x >= 0 && target.y >= 0 && target.x <= ISLAND_SPAN && target.y <= ISLAND_SPAN;
    if (inside) {
      this.homeSpot = { x: target.x, y: target.y };
      return;
    }
    target.setPosition(this.homeSpot.x, this.homeSpot.y);
    const body = target.body as Phaser.Physics.Arcade.Body | null;
    body?.setVelocity(0, 0);
    if (target instanceof Vehicle) target.speed = 0;
  }

  private watchIslands(): void {
    const match = getMatch();
    if (match.mode !== "multi" || this.riding) {
      this.clearIslandOffer();
      return;
    }
    const index = landIslandIndex(this.player.x, this.player.y);
    if (index === null || index === 0) {
      this.clearIslandOffer();
      return;
    }
    const card = match.islands[index];
    if (!card || card.heldBy === match.playerId) {
      this.clearIslandOffer();
      return;
    }
    if (this.offeredIsland === index) return;
    this.offeredIsland = index;
    const income = islandIncome(card);
    gameBus.emit("island-offer", {
      id: card.id,
      username: card.username,
      worth: income > 0 ? `It brings in ${formatCash(income)} each pay cycle.` : "Nothing on it is earning yet.",
    });
  }

  private clearIslandOffer(): void {
    if (this.offeredIsland === null) return;
    this.offeredIsland = null;
    gameBus.emit("island-offer", null);
  }

  private nearestLand(x: number, y: number): { x: number; y: number } | null {
    for (const radius of [56, 96, 150, 220, 320]) {
      for (let step = 0; step < 16; step += 1) {
        const angle = (Math.PI * 2 * step) / 16;
        const point = { x: x + Math.cos(angle) * radius, y: y + Math.sin(angle) * radius };
        if (!isWaterWorld(point.x, point.y) && !this.hitsWall(point.x, point.y)) return point;
      }
    }
    return null;
  }

  private applySession(session: SessionView): void {
    const match = getMatch();
    const islands = orderIslands(session.members, match.playerId);
    setMatch({ ...match, code: session.code, islands, mode: "multi" });
    this.applyHeldIncome(islands, match.playerId);
    const mine = islands.find((island) => island.id === match.playerId);
    if (mine?.boat) {
      this.hasBoat = true;
      this.spawnYacht();
    }
  }

  private applyHeldIncome(islands: SessionView["members"], playerId: string): void {
    const mine = islands.find((island) => island.id === playerId);
    this.state.incomeFrozen = Boolean(mine && mine.heldBy !== playerId);
    this.state.islandPay = heldIncome(islands, playerId);
  }

  private applyReward(reward: {
    id: string;
    name: string;
    ms: number;
    cash: number;
    earnings: number;
    speed: number;
    energy: number;
    gas: number;
  }): void {
    const now = this.time.now;
    if (reward.earnings > 1 && reward.ms > 0) {
      this.state.earningsScale = reward.earnings;
      this.rewardUntil = now + reward.ms;
    }
    if (reward.speed > 1 && reward.ms > 0) this.speedUntil = now + reward.ms;
    if (reward.energy > 0 && reward.energy < 1 && reward.ms > 0) this.energyUntil = now + reward.ms;
    if (reward.gas > 0 && reward.gas < 1 && reward.ms > 0) this.gasUntil = now + reward.ms;
    if (reward.cash > 0) {
      this.state.cash += reward.cash;
      this.popup(this.player.x, this.player.y - 36, `+$${reward.cash}`, "#d7c08a");
    }
    if (reward.ms > 0) this.flash(reward.name);
    this.pushHud();
  }

  private spawnYacht(): void {
    if (this.rides.some((ride) => ride.id === "yacht")) return;
    const spot = { x: 1032 * MAP_SCALE, y: 352 * MAP_SCALE };
    const ride = new Vehicle(this, {
      id: "yacht",
      kind: "boat",
      texture: "boat-deck",
      x: spot.x,
      y: spot.y,
      heading: 0.15,
      name: "YACHT",
      speed: 290,
      price: 0,
    });
    this.rideGroup.add(ride);
    ride.stayParked();
    ride.owned = true;
    this.rides.push(ride);
    this.feet.set(ride, { x: spot.x, y: spot.y });
    this.state.ownedVehicles.add(ride.id);
    this.pushHud();
  }

  private contain(): void {
    this.fenceCrossing();
    this.keepLand(this.player, this.map.playerSpawn);
    for (const ride of this.rides) {
      if (ride.kind === "boat") this.keepWater(ride);
      else this.keepLand(ride, { x: ride.homeX, y: ride.homeY });
    }
    for (const officer of this.police.officers) {
      this.keepLand(officer, this.map.playerSpawn);
    }
  }

  private keepLand(sprite: Phaser.Physics.Arcade.Sprite, fallback: { x: number; y: number }): void {
    const body = sprite.body as Phaser.Physics.Arcade.Body | null;
    if (sprite instanceof Vehicle && !sprite.occupied) {
      const parked = this.feet.get(sprite);
      const drifted = parked && (Math.abs(sprite.x - parked.x) > 0.4 || Math.abs(sprite.y - parked.y) > 0.4);
      if (isWaterWorld(sprite.x, sprite.y) || drifted) {
        const last = parked ?? fallback;
        sprite.setPosition(last.x, last.y);
        sprite.speed = 0;
        body?.setVelocity(0, 0);
      }
      if (!isWaterWorld(sprite.x, sprite.y)) this.feet.set(sprite, { x: sprite.x, y: sprite.y });
      return;
    }
    if (!isWaterWorld(sprite.x, sprite.y)) {
      this.feet.set(sprite, { x: sprite.x, y: sprite.y });
      return;
    }
    const last = this.feet.get(sprite) ?? fallback;
    sprite.setPosition(last.x, last.y);
    body?.setVelocity(0, 0);
    if (sprite instanceof Vehicle) sprite.speed = 0;
  }

  private keepWater(ride: Vehicle): void {
    const body = ride.body as Phaser.Physics.Arcade.Body;
    if (!ride.occupied) {
      const parked = this.feet.get(ride);
      if (parked && (Math.abs(ride.x - parked.x) > 0.4 || Math.abs(ride.y - parked.y) > 0.4)) {
        ride.setPosition(parked.x, parked.y);
        ride.speed = 0;
        body.setVelocity(0, 0);
      }
      this.feet.set(ride, { x: ride.x, y: ride.y });
      return;
    }
    if (isWaterWorld(ride.x, ride.y)) {
      this.feet.set(ride, { x: ride.x, y: ride.y });
      return;
    }
    const last = this.feet.get(ride) ?? { x: ride.homeX, y: ride.homeY };
    ride.setPosition(last.x, last.y);
    body.setVelocity(0, 0);
    ride.speed = 0;
  }

  private bindKeys(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input is unavailable.");
    this.onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
    };
    window.addEventListener("keydown", this.onKeyDown);
    const code = Phaser.Input.Keyboard.KeyCodes;
    const key = (value: number) => keyboard.addKey(value, false);
    this.keys = {
      up: key(code.W),
      down: key(code.S),
      left: key(code.A),
      right: key(code.D),
      arrowUp: key(code.UP),
      arrowDown: key(code.DOWN),
      arrowLeft: key(code.LEFT),
      arrowRight: key(code.RIGHT),
      e: key(code.E),
      f: key(code.F),
      r: key(code.R),
      g: key(code.G),
      shift: key(code.SHIFT),
      m: key(code.M),
      esc: key(code.ESC),
      food: [key(code.ONE), key(code.TWO), key(code.THREE)],
    };
    keyboard.clearCaptures();
  }

  private typing(): boolean {
    const target = document.activeElement;
    if (!(target instanceof HTMLElement)) return false;
    return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
  }

  private readInput(): MoveInput {
    if (this.typing()) return { up: false, down: false, left: false, right: false };
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
    const ease = this.energyUntil > this.time.now ? 0.5 : 1;
    this.state.energy = Math.max(0, this.state.energy - rate * ease * (delta / 1000));
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
    if (this.typing()) return;
    if (just(this.keys.esc)) {
      gameBus.emit("menu");
      return;
    }
    if (just(this.keys.m)) gameBus.emit("map-toggle");
    if (just(this.keys.g)) this.eatFood();
    if (this.riding) {
      if (just(this.keys.e)) this.refill();
      if (just(this.keys.f) && this.rideLock <= 0) this.dismount();
      return;
    }
    this.keys.food.forEach((key, index) => {
      if (just(key)) this.buyFood(index);
    });
    if (just(this.keys.e)) this.confirm();
    if (just(this.keys.f) && this.rideLock <= 0) this.stealFocused();
  }

  private confirm(): void {
    const ride = this.focusRide();
    if (ride) {
      if (ride.kind === "car" && !ride.owned) this.buyCar(ride);
      else this.driveRide(ride);
      return;
    }
    if (this.inStock()) {
      if (this.stockOpen) this.closeStocks();
      else this.openStocks();
      return;
    }
    if (this.inGrocery()) {
      if (this.groceryOpen) {
        this.groceryDismissed = true;
        this.closeGrocery();
      } else {
        this.groceryDismissed = false;
        this.openGrocery();
      }
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
    this.requestBusiness(spot.id);
  }

  private requestBusiness(id: string): void {
    if (this.buyLock || this.state.owns(id)) return;
    this.buyLock = true;
    gameBus.emit("business-buy", id);
  }

  private stealFocused(): void {
    const ride = this.focusRide();
    if (!ride || ride.owned) return;
    if (ride.kind === "car") this.pullOutside(ride);
    this.markStolen(ride);
    if (ride.kind === "car") this.mount(ride);
  }

  private buyCar(ride: Vehicle): void {
    if (!this.state.spend(ride.price)) {
      this.popup(this.player.x, this.player.y - 28, "NEED CASH", "#f4f1ea");
      return;
    }
    ride.owned = true;
    ride.stolen = false;
    ride.speed = 0;
    this.state.ownedVehicles.add(ride.id);
    this.pullOutside(ride);
    this.mount(ride);
    this.popup(ride.x, ride.y - 36, ride.name, "#d7c08a");
  }

  /** Drop a car on the road just outside the dealership, facing along the street. */
  private pullOutside(ride: Vehicle): void {
    const curb = this.map.carCurb;
    const offsets = [0, 120, -120, 240, -240];
    let spot = { x: curb.x, y: curb.y };
    for (const dx of offsets) {
      const next = { x: curb.x + dx, y: curb.y };
      const blocked = this.hitsWall(next.x, next.y) || isWaterWorld(next.x, next.y);
      const crowded = this.rides.some(
        (other) => other !== ride && Phaser.Math.Distance.Between(other.x, other.y, next.x, next.y) < 100,
      );
      if (!blocked && !crowded) {
        spot = next;
        break;
      }
    }
    ride.heading = Math.PI / 2;
    ride.setRotation(Math.PI / 2);
    ride.setPosition(spot.x, spot.y);
    const body = ride.body as Phaser.Physics.Arcade.Body;
    body.reset(spot.x, spot.y);
    body.setVelocity(0, 0);
    this.feet.set(ride, { x: spot.x, y: spot.y });
  }

  private refill(): void {
    const ride = this.riding;
    if (!ride) return;
    const cost = this.fillCost(ride);
    if (cost <= 0) return;
    if (!this.state.spend(cost)) {
      this.popup(ride.x, ride.y - 36, "NEED CASH", "#f4f1ea");
      return;
    }
    ride.gas = ride.maxGas;
    this.gasEmpty = false;
    this.popup(ride.x, ride.y - 36, `FILLED $${cost}`, "#e2b34a");
  }

  private fillCost(ride: Vehicle): number {
    const missing = ride.maxGas - ride.gas;
    if (missing < 0.5) return 0;
    return Math.max(1, Math.ceil((missing / ride.maxGas) * TUNING.gasFillCost));
  }

  private driveRide(ride: Vehicle): void {
    if (!ride.owned) this.markStolen(ride);
    this.mount(ride);
  }

  private markStolen(ride: Vehicle): void {
    ride.owned = true;
    ride.stolen = true;
    ride.speed = 0;
    const body = ride.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    this.state.ownedVehicles.add(ride.id);
    ride.refreshLabel();
    this.onCrime(ride.kind === "boat" ? 2 : 1, "STOLEN");
  }

  private mount(ride: Vehicle): void {
    this.riding = ride;
    ride.wake();
    this.player.setRiding(true);
    this.player.setPosition(ride.x, ride.y);
    this.footWalls.active = false;
    this.playerRides.active = false;
    this.rideLock = 320;
    ride.refreshLabel();
  }

  private dismount(): void {
    const ride = this.riding;
    if (!ride) return;
    ride.park();
    if (ride.kind === "boat") {
      const shore = this.nearestLand(ride.x, ride.y);
      if (shore) this.player.setPosition(shore.x, shore.y);
      else {
        const pier = this.map.pierZone;
        this.player.setPosition(pier.x + pier.w / 2, pier.y + pier.h / 2);
      }
    } else {
      const side = ride.heading;
      const spots = [1, -1].map((sign) => ({
        x: ride.x + Math.cos(side) * 72 * sign,
        y: ride.y + Math.sin(side) * 72 * sign,
      }));
      const spot = spots.find((point) => !isWaterWorld(point.x, point.y) && !this.hitsWall(point.x, point.y)) ?? this.map.playerSpawn;
      this.player.setPosition(spot.x, spot.y);
    }
    this.feet.set(this.player, { x: this.player.x, y: this.player.y });
    this.player.setRiding(false);
    this.riding = null;
    this.footWalls.active = true;
    this.playerRides.active = true;
    this.rideLock = 320;
  }

  private buyFood(index: number): void {
    const food = FOODS[index];
    if (!food || this.riding || !this.inGrocery()) return;
    if (this.state.food.length >= TUNING.packSize) {
      this.popup(this.player.x, this.player.y - 28, "PACK FULL", "#f4f1ea");
      if (this.groceryOpen) this.emitGrocery();
      return;
    }
    const price = this.foodPrice(food);
    if (!this.state.spend(price)) {
      this.popup(this.player.x, this.player.y - 28, "NEED CASH", "#f4f1ea");
      if (this.groceryOpen) this.emitGrocery();
      return;
    }
    this.state.food.push(food);
    this.popup(this.player.x, this.player.y - 28, food.name, "#7dcea0");
    if (this.groceryOpen) this.emitGrocery();
  }

  private buyStore(): void {
    if (!this.inGrocery() || this.state.owns("grocery")) return;
    this.requestBusiness("grocery");
  }

  private syncGrocery(): void {
    if (this.riding || !this.inGrocery()) {
      this.groceryDismissed = false;
      if (this.groceryOpen) this.closeGrocery();
      return;
    }
    if (!this.groceryOpen && !this.groceryDismissed) this.openGrocery();
  }

  private openGrocery(): void {
    this.groceryOpen = true;
    this.emitGrocery();
  }

  private closeGrocery(): void {
    if (!this.groceryOpen) {
      gameBus.emit("grocery", null);
      return;
    }
    this.groceryOpen = false;
    gameBus.emit("grocery", null);
  }

  private emitGrocery(): void {
    const store = businessById("grocery");
    gameBus.emit("grocery", {
      cash: this.state.cash,
      food: this.state.food.length,
      packSize: TUNING.packSize,
      ownsStore: this.state.owns("grocery"),
      storePrice: store?.price ?? 0,
      items: FOODS.map((food) => ({
        id: food.id,
        name: food.name,
        price: this.foodPrice(food),
        energy: food.energy,
        health: food.health,
      })),
    });
  }

  private inGrocery(): boolean {
    return !this.riding && rectContains(this.map.groceryZone, this.player.x, this.player.y);
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

  private openStocks(): void {
    this.stockOpen = true;
    this.emitStocks();
  }

  private closeStocks(): void {
    if (!this.stockOpen) {
      gameBus.emit("stocks", null);
      return;
    }
    this.stockOpen = false;
    gameBus.emit("stocks", null);
  }

  private emitStocks(): void {
    gameBus.emit("stocks", {
      cash: this.state.cash,
      quotes: this.quotes.map((quote) => ({
        id: quote.id,
        name: quote.name,
        price: quote.price,
        shares: this.state.sharesOf(quote.id),
        history: quote.history.slice(),
      })),
      ...this.stockSummary(),
    });
  }

  private stockSummary(): { portfolio: number; invested: number; profit: number; returnPct: number } {
    const prices = Object.fromEntries(this.quotes.map((quote) => [quote.id, quote.price]));
    const portfolio = this.state.portfolio(prices);
    const invested = this.state.invested();
    const profit = portfolio - invested;
    return {
      portfolio,
      invested,
      profit,
      returnPct: invested > 0 ? Math.round((profit / invested) * 1000) / 10 : 0,
    };
  }

  private applyLedger(view: EconomyView): void {
    this.buyLock = false;
    this.state.applyHoldings({
      cash: view.cash,
      levels: view.levels,
      shares: view.shares,
      basis: view.basis,
      items: view.items,
      realized: view.realized,
      incomeScale: view.incomeScale,
    });
    if (view.quotes.length > 0) {
      this.serverMarket = true;
      for (const quote of this.quotes) {
        const next = view.quotes.find((item) => item.id === quote.id);
        if (!next) continue;
        quote.price = next.price;
        quote.history = next.history.slice();
      }
    }
    if (view.fresh.length > 0) this.flash(view.fresh.join(" · "));
    if (this.groceryOpen) this.emitGrocery();
    if (this.stockOpen) this.emitStocks();
    this.pushHud();
  }

  private watchPort(): void {
    const inside = this.inJob();
    if (inside && !this.wasInPort) gameBus.emit("visit-port");
    this.wasInPort = inside;
    const spot = this.businessAt();
    const owned = spot && this.state.owns(spot.id) ? spot.id : null;
    if (owned === this.lastSpot) return;
    this.lastSpot = owned;
    gameBus.emit("owned-spot", owned && spot ? { id: spot.id, name: spot.name } : null);
  }

  private tickMarket(): void {
    const now = Date.now();
    if (this.marketMs !== 0 && now - this.marketMs < 3000) return;
    this.marketMs = now;
    const next = marketQuotes(now);
    for (const quote of this.quotes) {
      const row = next.find((item) => item.id === quote.id);
      if (!row) continue;
      quote.price = row.price;
      quote.history = row.history.slice();
    }
    if (this.stockOpen) this.emitStocks();
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
    this.escapeMs = TUNING.escapeMs;
    this.publishEscape(true);
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
    if (this.bustPending) return;
    const ride = this.riding;
    if (ride) {
      const stolen = ride.stolen;
      this.dismount();
      if (stolen) {
        this.state.ownedVehicles.delete(ride.id);
        ride.impound();
        this.feet.set(ride, { x: ride.x, y: ride.y });
      }
    }
    this.player.setPosition(this.map.bustSpawn.x, this.map.bustSpawn.y);
    this.feet.set(this.player, { x: this.player.x, y: this.player.y });
    this.player.health = TUNING.playerHealth;
    this.player.grantSafety(TUNING.bustSafetyMs);
    this.state.energy = 50;
    this.wanted.clear();
    this.siren.stop();
    this.escapeMs = 0;
    this.publishEscape(true);
    this.recoverUntil = this.time.now + TUNING.bustSafetyMs;
    this.cameras.main.flash(200, 160, 36, 36);
    this.bustPending = true;
    this.live = false;
    const cash = this.state.cash;
    gameBus.emit("bust-offer", {
      cash,
      loseHalf: cash - Math.floor(cash * 0.5),
      loseQuarter: Math.floor(cash * 0.25),
    });
    this.flash("BUSTED");
    this.pushHud();
  }

  private resolveBust(choice: "half" | "quarter"): void {
    if (!this.bustPending) return;
    this.bustPending = false;
    const lost = choice === "quarter" ? this.state.cutQuarter() : this.state.cutInHalf();
    this.live = true;
    this.flash(choice === "quarter" ? `AD — LOST $${lost}` : `BUSTED — LOST $${lost}`);
    this.pushHud();
  }

  private applyProfile(profile: CityProfile): void {
    this.state.cash = profile.cash;
    this.state.energy = profile.energy;
    this.state.employed = profile.employed;
    this.state.ownedBusinesses.clear();
    for (const id of profile.businesses) {
      this.state.ownedBusinesses.add(id);
      if (!this.state.businessLevels.has(id)) this.state.businessLevels.set(id, 1);
    }
    for (const id of [...this.state.businessLevels.keys()]) {
      if (!this.state.ownedBusinesses.has(id)) this.state.businessLevels.delete(id);
    }
    if (profile.levels) {
      for (const [id, level] of Object.entries(profile.levels)) {
        this.state.ownedBusinesses.add(id);
        this.state.businessLevels.set(id, level);
      }
    }
    if (profile.shares && profile.basis) {
      this.state.applyHoldings({
        cash: this.state.cash,
        levels: Object.fromEntries(this.state.businessLevels),
        shares: profile.shares,
        basis: profile.basis,
        items: (profile.items ?? []).map((id) => ({ id })),
        realized: profile.stockProfit ?? this.state.stockProfit,
        incomeScale: this.state.incomeScale,
      });
    }
    this.state.ownedVehicles.clear();
    for (const ride of this.rides) {
      ride.owned = ride.id === "yacht" || profile.vehicles.includes(ride.id);
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
    let bestD = Number.POSITIVE_INFINITY;
    for (const ride of this.rides) {
      if (ride.occupied) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, ride.x, ride.y);
      const limit = ride.kind === "boat" ? BOAT_REACH : CAR_REACH;
      if (distance < limit && distance < bestD) {
        best = ride;
        bestD = distance;
      }
    }
    if (best) return best;
    const onDock = this.map.dockZones.some((dock) => rectContains(dock, this.player.x, this.player.y));
    if (!onDock) return null;
    for (const ride of this.rides) {
      if (ride.kind !== "boat" || ride.occupied) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, ride.x, ride.y);
      if (distance < DOCK_REACH && distance < bestD) {
        best = ride;
        bestD = distance;
      }
    }
    return best;
  }

  private hitsWall(x: number, y: number): boolean {
    return this.blockers.some((wall) => wall.contains(x, y));
  }

  private tickEscape(delta: number): void {
    if (this.escapeMs <= 0) return;
    this.escapeMs = Math.max(0, this.escapeMs - delta);
    if (this.escapeMs === 0) {
      this.wanted.clear();
      this.police.stop();
      this.siren.stop();
      this.decayMs = 0;
      this.flash("GOT AWAY");
      this.pushHud();
    }
    this.publishEscape();
  }

  private publishEscape(force = false): void {
    const sec = this.escapeMs > 0 ? Math.ceil(this.escapeMs / 1000) : 0;
    if (!force && sec === this.lastEscapeSec) return;
    this.lastEscapeSec = sec;
    gameBus.emit("escape", sec > 0 ? this.escapeMs : null);
  }

  private businessAt(): PlacedBusiness | null {
    return this.map.businesses.find((business) => rectContains(business.zone, this.player.x, this.player.y)) ?? null;
  }

  private inJob(): boolean {
    const target = this.riding ?? this.player;
    return rectContains(this.map.jobZone, target.x, target.y);
  }

  private inStock(): boolean {
    return !this.riding && rectContains(this.map.stockZone, this.player.x, this.player.y);
  }

  private canRob(id: string): boolean {
    return (this.robReadyAt.get(id) ?? 0) <= this.time.now;
  }

  private foodPrice(food: FoodItem): number {
    if (!this.state.owns("grocery")) return food.price;
    return Math.max(1, Math.ceil(food.price * 0.8));
  }

  private publishPrompt(): void {
    const prompt = this.promptText();
    if (prompt === this.lastPrompt) return;
    this.lastPrompt = prompt;
    gameBus.emit("prompt", prompt);
  }

  private promptText(): string | null {
    if (this.riding) {
      const cost = this.fillCost(this.riding);
      return cost > 0 ? `E FILL $${cost} · F EXIT` : "F EXIT";
    }
    const ride = this.focusRide();
    if (ride) {
      if (ride.owned) return `E DRIVE ${ride.name}`;
      if (ride.kind === "car" && ride.price > 0) return `E BUY $${ride.price} · F STEAL ${ride.name}`;
      return `E DRIVE · F STEAL ${ride.name}`;
    }
    const lines: string[] = [];
    if (this.inStock()) lines.push(this.stockOpen ? "E CLOSE" : "E INVEST");
    if (this.inJob()) lines.push(this.state.employed ? "ON THE CLOCK" : "E CLOCK IN");
    const spot = this.businessAt();
    if (this.inGrocery()) {
      lines.push(this.groceryOpen ? "E CLOSE" : "E SHOP");
      if (spot && !this.state.owns(spot.id) && this.canRob(spot.id)) lines.push("HOLD R TO ROB");
    } else if (spot && !this.state.owns(spot.id)) {
      lines.push(this.canRob(spot.id) ? `E BUY $${spot.price} · HOLD R TO ROB` : "COME BACK LATER");
    } else if (spot) {
      const level = this.state.levelOf(spot.id);
      lines.push(`LEVEL ${level} · ${formatCash(businessPerMinute(spot.id, level, this.state.incomeScale))}/MIN`);
    }
    if (this.state.food.length > 0) lines.push("G EAT");
    return lines.length > 0 ? lines.join(" · ") : null;
  }

  private hint(): string {
    if (this.state.wanted > 0) return "Last a minute and a half and the cops break off. A bust takes half your cash, or a quarter if you watch an ad.";
    if (this.inJob() && this.state.employed) return "Shift pay is on while you stay at the port.";
    if (this.state.employed) return "Walk back into the port to pick the wage up again.";
    return "Drive or steal a ride, clock in at the port, or invest on the stock floor.";
  }

  private pushHud(): void {
    this.state.health = this.player.health;
    const snapshot = this.state.snapshot(this.hint(), this.state.employed && this.inJob());
    snapshot.netWorth = this.state.worth(Object.fromEntries(this.quotes.map((quote) => [quote.id, quote.price])));
    if (this.riding) {
      snapshot.driving = true;
      snapshot.gas = this.riding.gas;
      snapshot.maxGas = this.riding.maxGas;
    }
    const hudKey = [
      snapshot.cash,
      snapshot.health,
      snapshot.energy,
      snapshot.wanted,
      snapshot.food,
      snapshot.employed,
      snapshot.onShift ? 1 : 0,
      snapshot.objective,
      snapshot.driving ? 1 : 0,
      Math.round(snapshot.gas),
      snapshot.businesses.join(","),
      snapshot.vehicles.join(","),
      Math.round(snapshot.netWorth),
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
