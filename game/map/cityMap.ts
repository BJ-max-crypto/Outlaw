import Phaser from "phaser";
import type { MapMarker } from "@/lib/game/types";
import { BUSINESSES, type BusinessDef } from "@/game/world/catalog";
import { MAP_SCALE, SOURCE_SIZE } from "./waterMask";
import type { Rect } from "./geometry";

export type PlacedRide = {
  id: string;
  kind: "car" | "boat";
  texture: string;
  x: number;
  y: number;
  heading: number;
  name: string;
  speed: number;
};

export type PlacedBusiness = BusinessDef & { zone: Rect };

export type CityMap = {
  world: { width: number; height: number };
  walls: Rect[];
  water: Rect;
  businesses: PlacedBusiness[];
  groceryZone: Rect;
  jobZone: Rect;
  stockZone: Rect;
  pierZone: Rect;
  rides: PlacedRide[];
  playerSpawn: { x: number; y: number };
  bustSpawn: { x: number; y: number };
  policeSpawns: { x: number; y: number }[];
  markers: MapMarker[];
};

const WORLD = { width: SOURCE_SIZE * MAP_SCALE, height: SOURCE_SIZE * MAP_SCALE };

function zone(x: number, y: number, w: number, h: number): Rect {
  return { x: x * MAP_SCALE, y: y * MAP_SCALE, w: w * MAP_SCALE, h: h * MAP_SCALE };
}

function at(x: number, y: number): { x: number; y: number } {
  return { x: x * MAP_SCALE, y: y * MAP_SCALE };
}

const zones = {
  grocery: zone(250, 190, 200, 130),
  quickstop: zone(250, 860, 160, 120),
  club: zone(540, 540, 160, 150),
  diner: zone(530, 860, 170, 140),
};

export function closestSpawns(
  points: { x: number; y: number }[],
  x: number,
  y: number,
  count: number,
): { x: number; y: number }[] {
  return [...points]
    .sort((a, b) => (a.x - x) ** 2 + (a.y - y) ** 2 - ((b.x - x) ** 2 + (b.y - y) ** 2))
    .slice(0, count);
}

export function buildCityMap(): CityMap {
  const businesses = BUSINESSES.map((business) => ({
    ...business,
    zone: zones[business.id as keyof typeof zones],
  }));
  return {
    world: WORLD,
    walls: [],
    water: { x: 0, y: 0, w: 0, h: 0 },
    businesses,
    groceryZone: zones.grocery,
    jobZone: zone(820, 250, 180, 120),
    stockZone: zone(840, 680, 180, 160),
    pierZone: zone(1024, 436, 100, 28),
    rides: [
      { id: "white", kind: "car", texture: "car-white", ...at(290, 660), heading: 0, name: "SEDAN", speed: 430 },
      { id: "red", kind: "car", texture: "car-red", ...at(350, 660), heading: 0, name: "STRIPE", speed: 470 },
      { id: "blue", kind: "car", texture: "car-blue", ...at(410, 660), heading: 0, name: "COUPE", speed: 500 },
      { id: "olive", kind: "car", texture: "car-olive", ...at(310, 730), heading: 0, name: "SUV", speed: 400 },
      { id: "yellow", kind: "car", texture: "car-yellow", ...at(380, 730), heading: 0, name: "RACER", speed: 540 },
      { id: "skiff", kind: "boat", texture: "boat-white", ...at(1120, 340), heading: 0, name: "SKIFF", speed: 280 },
      { id: "launch", kind: "boat", texture: "boat-wood", ...at(1180, 400), heading: 0.4, name: "LAUNCH", speed: 300 },
      { id: "rib", kind: "boat", texture: "boat-black", ...at(1140, 260), heading: -0.3, name: "RIB", speed: 320 },
      { id: "yacht", kind: "boat", texture: "boat-deck", ...at(1210, 360), heading: 0.2, name: "YACHT", speed: 290 },
    ],
    playerSpawn: at(470, 430),
    bustSpawn: at(500, 480),
    policeSpawns: [at(470, 400), at(470, 520), at(700, 480), at(500, 780), at(780, 500), at(750, 360)],
    markers: [
      { id: "grocery", label: "Grocery", x: at(360, 250).x, y: at(360, 250).y, color: "#7dcea0" },
      { id: "motors", label: "Dealership", x: at(330, 650).x, y: at(330, 650).y, color: "#d7c08a" },
      { id: "quickstop", label: "Quick Stop", x: at(330, 910).x, y: at(330, 910).y, color: "#e25b2a" },
      { id: "club", label: "Club", x: at(620, 610).x, y: at(620, 610).y, color: "#c47ca5" },
      { id: "diner", label: "Diner", x: at(610, 930).x, y: at(610, 930).y, color: "#e7b8a4" },
      { id: "stock", label: "Stocks", x: at(920, 760).x, y: at(920, 760).y, color: "#8eb4ff" },
      { id: "port", label: "Port", x: at(900, 280).x, y: at(900, 280).y, color: "#9fd0e4" },
      { id: "pier", label: "Pier", x: at(1080, 450).x, y: at(1080, 450).y, color: "#6aa8c8" },
    ],
  };
}

export function paintCity(scene: Phaser.Scene): void {
  scene.add.image(0, 0, "island").setOrigin(0, 0).setScale(MAP_SCALE).setDepth(0);
}

export function createWallBodies(scene: Phaser.Scene): Phaser.Physics.Arcade.StaticGroup {
  return scene.physics.add.staticGroup();
}
