import Phaser from "phaser";
import type { MapMarker } from "@/lib/game/types";
import { BUSINESSES, type BusinessDef } from "@/game/world/catalog";
import { perimeter, type Rect } from "./geometry";

export type PlacedRide = {
  id: string;
  kind: "car" | "boat";
  x: number;
  y: number;
  heading: number;
  price: number;
  forSale: boolean;
  color: number;
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
  dockZone: Rect;
  rides: PlacedRide[];
  playerSpawn: { x: number; y: number };
  bustSpawn: { x: number; y: number };
  policeSpawns: { x: number; y: number }[];
  markers: MapMarker[];
};

const WORLD = { width: 3840, height: 2688 };

const apartments: Rect = { x: 48, y: 48, w: 620, h: 580 };
const store: Rect = { x: 760, y: 48, w: 520, h: 600 };
const pawn: Rect = { x: 1400, y: 80, w: 420, h: 480 };
const dealer: Rect = { x: 2100, y: 48, w: 900, h: 520 };
const warehouse: Rect = { x: 48, y: 1100, w: 560, h: 700 };
const diner: Rect = { x: 760, y: 1120, w: 420, h: 380 };
const station: Rect = { x: 760, y: 1680, w: 340, h: 260 };
const mart: Rect = { x: 2380, y: 1100, w: 500, h: 500 };
const club: Rect = { x: 2380, y: 1780, w: 460, h: 360 };
const water: Rect = { x: 3040, y: 1040, w: 760, h: 1560 };

const doorSize = 120;
const storeDoorX = store.x + store.w / 2 - doorSize / 2;
const martDoorX = mart.x + mart.w / 2 - doorSize / 2;

const storeCounter: Rect = { x: 880, y: 150, w: 280, h: 36 };
const martCounter: Rect = { x: 2500, y: 1188, w: 260, h: 36 };

const zones = {
  quickstop: { x: 800, y: 220, w: 440, h: 320 },
  pawn: { x: 1480, y: 575, w: 260, h: 110 },
  diner: { x: 820, y: 1520, w: 280, h: 100 },
  club: { x: 2460, y: 2160, w: 300, h: 90 },
  mart: { x: 2420, y: 1260, w: 420, h: 250 },
};

const borders: Rect[] = [
  { x: 0, y: 0, w: WORLD.width, h: 32 },
  { x: 0, y: WORLD.height - 32, w: WORLD.width, h: 32 },
  { x: 0, y: 0, w: 32, h: WORLD.height },
  { x: WORLD.width - 32, y: 0, w: 32, h: WORLD.height },
];

const shore: Rect[] = [
  { x: water.x, y: water.y, w: 28, h: water.h },
  { x: water.x, y: water.y, w: water.w, h: 28 },
];

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
      ...borders,
      ...shore,
      apartments,
      pawn,
      dealer,
      warehouse,
      diner,
      station,
      club,
      storeCounter,
      martCounter,
      ...perimeter(store, { side: "south", x: storeDoorX, size: doorSize }),
      ...perimeter(mart, { side: "south", x: martDoorX, size: doorSize }),
    ],
    water,
    businesses,
    groceryZone: zones.mart,
    jobZone: { x: 90, y: 1860, w: 260, h: 130 },
    dockZone: { x: 2896, y: 1160, w: 130, h: 160 },
    rides: [
      { id: "coupe", kind: "car", x: 2300, y: 610, heading: 0, price: 750, forSale: true, color: 0xc4552a, name: "COUPE", speed: 440 },
      { id: "van", kind: "car", x: 2580, y: 610, heading: 0, price: 1100, forSale: true, color: 0xd7c08a, name: "VAN", speed: 380 },
      { id: "sport", kind: "car", x: 2840, y: 610, heading: 0, price: 2400, forSale: true, color: 0xe8eef4, name: "SPORT", speed: 540 },
      { id: "lot-a", kind: "car", x: 1460, y: 1320, heading: Math.PI / 2, price: 0, forSale: false, color: 0x8ea4b8, name: "SEDAN", speed: 400 },
      { id: "lot-b", kind: "car", x: 1720, y: 1320, heading: Math.PI / 2, price: 0, forSale: false, color: 0x6d241c, name: "SEDAN", speed: 400 },
      { id: "lot-c", kind: "car", x: 1540, y: 1600, heading: 0, price: 0, forSale: false, color: 0x3d4a3a, name: "HATCH", speed: 400 },
      { id: "lot-d", kind: "car", x: 1880, y: 1760, heading: 0, price: 0, forSale: false, color: 0x243246, name: "HATCH", speed: 400 },
      { id: "skiff", kind: "boat", x: 3280, y: 1400, heading: 0, price: 1800, forSale: true, color: 0xd5e4ee, name: "SKIFF", speed: 280 },
    ],
    playerSpawn: { x: 1020, y: 830 },
    bustSpawn: { x: 930, y: 2020 },
    policeSpawns: [
      { x: 220, y: 830 },
      { x: 1800, y: 830 },
      { x: 2700, y: 830 },
      { x: 1680, y: 1500 },
      { x: 420, y: 2140 },
      { x: 2600, y: 2040 },
    ],
    markers: [
      { id: "quickstop", label: "Quick Stop", x: 1020, y: 280, color: "#e25b2a" },
      { id: "motors", label: "Motors", x: 2550, y: 280, color: "#d7c08a" },
      { id: "pawn", label: "Pawn", x: 1610, y: 300, color: "#cfc8bb" },
      { id: "diner", label: "Diner", x: 970, y: 1280, color: "#c4552a" },
      { id: "mart", label: "Mart", x: 2630, y: 1320, color: "#7dcea0" },
      { id: "club", label: "Club", x: 2610, y: 1940, color: "#c47ca5" },
      { id: "shift", label: "Shift", x: 220, y: 1920, color: "#8ea4b8" },
      { id: "marina", label: "Marina", x: 3280, y: 1400, color: "#6aa8c8" },
      { id: "station", label: "Station", x: 930, y: 1800, color: "#d64545" },
    ],
  };
}

const INK = {
  asphalt: 0x2c3038,
  sidewalk: 0x454b57,
  road: 0x32363f,
  parking: 0x343943,
  line: 0xd5d0c6,
  apt: 0x2b2f38,
  office: 0x243246,
  warehouse: 0x3a3833,
  diner: 0x3d342f,
  storeWall: 0x4a342c,
  storeFloor: 0x2a2422,
  martWall: 0x24362c,
  martFloor: 0x1e2822,
  club: 0x342838,
  station: 0x2a3140,
  dealer: 0x3a342c,
  pawn: 0x3a342e,
  water: 0x173646,
  waterDeep: 0x102838,
  sand: 0x6a5e4a,
  dock: 0x6d5338,
  awning: 0xc4552a,
  awningAlt: 0xf3efe6,
  window: 0x8ea4b8,
  windowLit: 0xe6d3a4,
  windowDark: 0x1b2128,
  gold: 0xd7c08a,
};

function fill(g: Phaser.GameObjects.Graphics, rect: Rect, color: number, alpha = 1) {
  g.fillStyle(color, alpha);
  g.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function windows(g: Phaser.GameObjects.Graphics, building: Rect, seed: number) {
  const ww = 16;
  const wh = 22;
  for (let y = building.y + 28, row = 0; y < building.y + building.h - 24; y += wh + 14, row += 1) {
    for (let x = building.x + 18, col = 0; x < building.x + building.w - 22; x += ww + 14, col += 1) {
      const n = hash(seed + row * 17 + col * 3);
      const color = n > 0.82 ? INK.windowLit : n > 0.2 ? INK.window : INK.windowDark;
      g.fillStyle(color, 0.9);
      g.fillRect(x, y, ww, wh);
    }
  }
}

function shell(g: Phaser.GameObjects.Graphics, rect: Rect, wall: number, floor: number) {
  fill(g, rect, wall);
  fill(g, { x: rect.x + 28, y: rect.y + 28, w: rect.w - 56, h: rect.h - 56 }, floor);
}

function sign(scene: Phaser.Scene, x: number, y: number, text: string, color = "#f4f1ea") {
  scene.add
    .text(x, y, text, {
      fontFamily: "Arial, sans-serif",
      fontSize: "18px",
      color,
      fontStyle: "bold",
    })
    .setOrigin(0.5)
    .setDepth(8);
}

export function paintCity(scene: Phaser.Scene, map: CityMap): void {
  const g = scene.add.graphics();
  g.setDepth(0);
  fill(g, { x: 0, y: 0, w: WORLD.width, h: WORLD.height }, INK.asphalt);

  fill(g, { x: 32, y: 640, w: 3000, h: 60 }, INK.sidewalk);
  fill(g, { x: 32, y: 700, w: 2980, h: 260 }, INK.road);
  fill(g, { x: 32, y: 960, w: 3000, h: 70 }, INK.sidewalk);
  fill(g, { x: 1280, y: 1120, w: 980, h: 900 }, INK.parking);
  fill(g, { x: 2100, y: 560, w: 900, h: 140 }, 0x3a3428);

  fill(g, water, INK.waterDeep);
  fill(g, { x: water.x + 40, y: water.y + 40, w: water.w - 80, h: water.h - 80 }, INK.water);
  fill(g, { x: water.x - 36, y: water.y, w: 36, h: water.h }, INK.sand);
  fill(g, { x: 3048, y: 1288, w: 220, h: 28 }, INK.dock);
  fill(g, { x: 3120, y: 1240, w: 28, h: 120 }, INK.dock);

  g.lineStyle(3, INK.line, 0.28);
  for (let x = 80; x < 2960; x += 64) g.lineBetween(x, 830, x + 28, 830);

  g.lineStyle(2, INK.line, 0.2);
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 3; row += 1) {
      g.strokeRect(1360 + col * 210, 1200 + row * 240, 160, 180);
    }
  }

  fill(g, apartments, INK.apt);
  windows(g, apartments, 2);
  fill(g, pawn, INK.pawn);
  windows(g, pawn, 9);
  fill(g, dealer, INK.dealer);
  windows(g, dealer, 4);
  fill(g, warehouse, INK.warehouse);
  windows(g, warehouse, 6);
  fill(g, diner, INK.diner);
  windows(g, diner, 8);
  fill(g, station, INK.station);
  windows(g, station, 11);
  fill(g, club, INK.club);
  windows(g, club, 13);

  shell(g, store, INK.storeWall, INK.storeFloor);
  shell(g, mart, INK.martWall, INK.martFloor);
  fill(g, { x: storeDoorX, y: store.y + store.h - 28, w: doorSize, h: 28 }, INK.sidewalk);
  fill(g, { x: martDoorX, y: mart.y + mart.h - 28, w: doorSize, h: 28 }, INK.sidewalk);

  for (let i = 0; i < 8; i += 1) {
    g.fillStyle(i % 2 === 0 ? INK.awning : INK.awningAlt, 1);
    g.fillRect(store.x + 70 + i * 46, store.y + store.h - 18, 46, 16);
    g.fillRect(mart.x + 80 + i * 42, mart.y + mart.h - 18, 42, 14);
  }

  fill(g, storeCounter, 0x1a1614);
  fill(g, martCounter, 0x1a2420);
  fill(g, map.jobZone, 0x2a3140);
  g.lineStyle(2, INK.gold, 0.7);
  g.strokeRect(map.jobZone.x, map.jobZone.y, map.jobZone.w, map.jobZone.h);
  g.strokeRect(map.dockZone.x, map.dockZone.y, map.dockZone.w, map.dockZone.h);

  sign(scene, store.x + store.w / 2, store.y + store.h + 36, "QUICK STOP", "#e25b2a");
  sign(scene, dealer.x + dealer.w / 2, 590, "FRANK'S MOTORS", "#d7c08a");
  sign(scene, pawn.x + pawn.w / 2, pawn.y + pawn.h + 28, "PAWN");
  sign(scene, diner.x + diner.w / 2, diner.y + 36, "DINER", "#e7b8a4");
  sign(scene, mart.x + mart.w / 2, mart.y + 70, "MART", "#7dcea0");
  sign(scene, club.x + club.w / 2, club.y + 40, "CLUB", "#e7b8d0");
  sign(scene, station.x + station.w / 2, station.y + 40, "STATION", "#d7c08a");
  sign(scene, map.jobZone.x + map.jobZone.w / 2, map.jobZone.y + 48, "NIGHT SHIFT", "#d7c08a");
  sign(scene, map.dockZone.x + map.dockZone.w / 2, map.dockZone.y + 36, "MARINA", "#9fd0e4");
  sign(scene, 1680, 1280, "LOT C", "#a39e94");
}

export function createWallBodies(scene: Phaser.Scene, walls: Rect[]): Phaser.Physics.Arcade.StaticGroup {
  const group = scene.physics.add.staticGroup();
  for (const wall of walls) {
    const body = scene.add.rectangle(wall.x + wall.w / 2, wall.y + wall.h / 2, wall.w, wall.h, 0x000000, 0);
    group.add(body);
  }
  return group;
}
