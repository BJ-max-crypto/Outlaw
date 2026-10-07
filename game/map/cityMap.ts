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
  claimZone: Rect;
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

function shell(x: number, y: number, w: number, h: number, door = 96, side: "south" | "east" = "south"): Rect[] {
  const rect = zone(x, y, w, h);
  const size = door * MAP_SCALE;
  if (side === "east") return perimeter(rect, { side: "east", x: rect.y + (rect.h - size) / 2, size });
  return perimeter(rect, { side: "south", x: rect.x + (rect.w - size) / 2, size });
}

const zones = {
  grocery: zone(286, 214, 150, 130),
  quickstop: zone(268, 868, 150, 120),
  club: zone(540, 590, 120, 130),
  diner: zone(560, 880, 160, 120),
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
      ...shell(268, 198, 182, 168, 72),
      ...shell(250, 528, 180, 252, 80),
      ...shell(255, 848, 175, 164, 64, "east"),
      ...shell(522, 568, 152, 188, 68),
      ...shell(548, 858, 190, 164, 70),
      ...shell(802, 658, 156, 186, 64),
    ],
    water: { x: 0, y: 0, w: 0, h: 0 },
    businesses,
    groceryZone: zones.grocery,
    jobZone: zone(750, 300, 190, 170),
    stockZone: zone(824, 690, 100, 130),
    pierZone: zone(1000, 424, 170, 40),
    dockZones: [zone(900, 300, 150, 160), zone(1000, 424, 170, 40)],
    claimZone: zone(400, 340, 200, 150),
    rides: [
      { id: "white", kind: "car", texture: "car-white", ...at(460, 580), heading: Math.PI / 2, name: "SEDAN", speed: 430, price: 160 },
      { id: "red", kind: "car", texture: "car-red", ...at(460, 640), heading: Math.PI / 2, name: "STRIPE", speed: 470, price: 220 },
      { id: "blue", kind: "car", texture: "car-blue", ...at(460, 700), heading: Math.PI / 2, name: "COUPE", speed: 500, price: 280 },
      { id: "olive", kind: "car", texture: "car-olive", ...at(460, 760), heading: Math.PI / 2, name: "SUV", speed: 400, price: 190 },
      { id: "yellow", kind: "car", texture: "car-yellow", ...at(460, 820), heading: Math.PI / 2, name: "RACER", speed: 540, price: 340 },
      { id: "skiff", kind: "boat", texture: "boat-white", ...at(1080, 390), heading: 0, name: "SKIFF", speed: 280, price: 0 },
      { id: "launch", kind: "boat", texture: "boat-wood", ...at(1160, 370), heading: 0.4, name: "LAUNCH", speed: 300, price: 0 },
      { id: "rib", kind: "boat", texture: "boat-black", ...at(1120, 340), heading: -0.2, name: "RIB", speed: 320, price: 0 },
    ],
    playerSpawn: at(500, 400),
    carCurb: at(480, 680),
    bustSpawn: at(490, 450),
    policeSpawns: [at(500, 400), at(460, 660), at(480, 820), at(760, 360), at(620, 800), at(400, 800)],
    markers: [
      { id: "grocery", label: "Grocery", x: at(360, 280).x, y: at(360, 280).y, color: "#7dcea0" },
      { id: "motors", label: "Dealership", x: at(340, 660).x, y: at(340, 660).y, color: "#d7c08a" },
      { id: "quickstop", label: "Quick Stop", x: at(340, 930).x, y: at(340, 930).y, color: "#e25b2a" },
      { id: "club", label: "Club", x: at(600, 660).x, y: at(600, 660).y, color: "#c47ca5" },
      { id: "diner", label: "Diner", x: at(640, 940).x, y: at(640, 940).y, color: "#e7b8a4" },
      { id: "stock", label: "Stocks", x: at(880, 750).x, y: at(880, 750).y, color: "#8eb4ff" },
      { id: "port", label: "Port", x: at(860, 380).x, y: at(860, 380).y, color: "#9fd0e4" },
      { id: "pier", label: "Pier", x: at(1100, 444).x, y: at(1100, 444).y, color: "#6aa8c8" },
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
