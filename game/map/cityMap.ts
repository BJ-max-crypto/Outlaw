import Phaser from "phaser";
import type { MapMarker } from "@/lib/game/types";
import { BUSINESSES, type BusinessDef } from "@/game/world/catalog";
import { MAP_SCALE, SOURCE_SIZE } from "./waterMask";
import { perimeter, type Rect } from "./geometry";

export type PlacedRide = {
  id: string;
  kind: "car" | "boat";
  texture: string;
  x: number;
  y: number;
  heading: number;
  name: string;
  speed: number;
  price: number;
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
  dockZones: Rect[];
  rides: PlacedRide[];
  playerSpawn: { x: number; y: number };
  bustSpawn: { x: number; y: number };
  carCurb: { x: number; y: number };
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

function shell(x: number, y: number, w: number, h: number, door = 96): Rect[] {
  const rect = zone(x, y, w, h);
  const size = door * MAP_SCALE;
  return perimeter(rect, { side: "south", x: rect.x + (rect.w - size) / 2, size });
}

const zones = {
  grocery: zone(294, 224, 156, 104),
  quickstop: zone(274, 866, 80, 100),
  club: zone(544, 586, 112, 152),
  diner: zone(572, 878, 108, 106),
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
    walls: [
      ...shell(274, 202, 196, 148, 80),
      ...shell(257, 542, 157, 224, 72),
      ...shell(254, 844, 118, 142, 56),
      ...shell(522, 564, 152, 196, 70),
      ...shell(550, 856, 148, 150, 68),
      ...shell(807, 650, 140, 188, 64),
    ],
    water: { x: 0, y: 0, w: 0, h: 0 },
    businesses,
    groceryZone: zones.grocery,
    jobZone: zone(860, 300, 150, 110),
    stockZone: zone(828, 672, 100, 144),
    pierZone: zone(1024, 432, 100, 28),
    dockZones: [zone(880, 270, 160, 190), zone(980, 418, 170, 52)],
    rides: [
      { id: "white", kind: "car", texture: "car-white", ...at(310, 610), heading: 0, name: "SEDAN", speed: 430, price: 160 },
      { id: "red", kind: "car", texture: "car-red", ...at(360, 610), heading: 0, name: "STRIPE", speed: 470, price: 220 },
      { id: "blue", kind: "car", texture: "car-blue", ...at(380, 700), heading: 0, name: "COUPE", speed: 500, price: 280 },
      { id: "olive", kind: "car", texture: "car-olive", ...at(295, 700), heading: 0, name: "SUV", speed: 400, price: 190 },
      { id: "yellow", kind: "car", texture: "car-yellow", ...at(345, 700), heading: 0, name: "RACER", speed: 540, price: 340 },
      { id: "skiff", kind: "boat", texture: "boat-white", ...at(1024, 392), heading: 0, name: "SKIFF", speed: 280, price: 0 },
      { id: "launch", kind: "boat", texture: "boat-wood", ...at(1184, 448), heading: 0.4, name: "LAUNCH", speed: 300, price: 0 },
      { id: "rib", kind: "boat", texture: "boat-black", ...at(1076, 304), heading: -0.2, name: "RIB", speed: 320, price: 0 },
      { id: "yacht", kind: "boat", texture: "boat-deck", ...at(1032, 352), heading: 0.15, name: "YACHT", speed: 290, price: 0 },
    ],
    playerSpawn: at(500, 440),
    carCurb: at(336, 805),
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

export function createWallBodies(scene: Phaser.Scene, walls: Rect[]): Phaser.Physics.Arcade.StaticGroup {
  const group = scene.physics.add.staticGroup();
  for (const wall of walls) {
    const body = scene.add.rectangle(wall.x + wall.w / 2, wall.y + wall.h / 2, wall.w, wall.h, 0x000000, 0);
    group.add(body);
  }
  return group;
}
