import Phaser from "phaser";
import { perimeter, type Rect } from "./geometry";

export type CityMap = {
  world: { width: number; height: number };
  walls: Rect[];
  robberyZone: Rect;
  getawayZone: Rect;
  playerSpawn: { x: number; y: number };
  policeSpawns: { x: number; y: number }[];
  register: { x: number; y: number };
};

const WORLD = { width: 2048, height: 1536 };

const apartments: Rect = { x: 64, y: 48, w: 560, h: 360 };
const office: Rect = { x: 1400, y: 48, w: 584, h: 360 };
const warehouse: Rect = { x: 64, y: 748, w: 470, h: 560 };
const diner: Rect = { x: 720, y: 836, w: 270, h: 380 };
const store: Rect = { x: 736, y: 48, w: 512, h: 416 };
const doorSize = 112;
const doorX = store.x + store.w / 2 - doorSize / 2;
const counter: Rect = { x: 868, y: 146, w: 248, h: 42 };
const dumpster: Rect = { x: 560, y: 1040, w: 48, h: 36 };
const cars: Rect[] = [
  { x: 390, y: 548, w: 92, h: 40 },
  { x: 1168, y: 600, w: 40, h: 92 },
  { x: 1488, y: 900, w: 86, h: 40 },
  { x: 1728, y: 1020, w: 86, h: 40 },
  { x: 1288, y: 1148, w: 40, h: 92 },
];

const borders: Rect[] = [
  { x: 0, y: 0, w: WORLD.width, h: 32 },
  { x: 0, y: WORLD.height - 32, w: WORLD.width, h: 32 },
  { x: 0, y: 0, w: 32, h: WORLD.height },
  { x: WORLD.width - 32, y: 0, w: 32, h: WORLD.height },
];

export function buildCityMap(): CityMap {
  const storeWalls = perimeter(store, { side: "south", x: doorX, size: doorSize });
  return {
    world: WORLD,
    walls: [
      ...borders,
      apartments,
      office,
      warehouse,
      diner,
      dumpster,
      ...cars,
      counter,
      ...storeWalls,
    ],
    robberyZone: { x: 784, y: 206, w: 420, h: 200 },
    getawayZone: { x: 1568, y: 1188, w: 300, h: 196 },
    playerSpawn: { x: store.x + store.w / 2, y: 548 },
    policeSpawns: [
      { x: 168, y: 590 },
      { x: 1888, y: 590 },
      { x: 610, y: 1416 },
    ],
    register: { x: 992, y: 168 },
  };
}

const INK = {
  asphalt: 0x2c3038,
  sidewalk: 0x454b57,
  alley: 0x262a31,
  parking: 0x343943,
  line: 0xd5d0c6,
  apt: 0x2b2f38,
  office: 0x243246,
  warehouse: 0x3a3833,
  diner: 0x3d342f,
  storeWall: 0x4a342c,
  storeFloor: 0x2a2422,
  awning: 0xc4552a,
  awningAlt: 0xf3efe6,
  window: 0x8ea4b8,
  windowLit: 0xe6d3a4,
  windowDark: 0x1b2128,
  gold: 0xd7c08a,
  van: 0x6d241c,
  vanGlass: 0xc9d5df,
  shadow: 0x000000,
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

function roundedCar(g: Phaser.GameObjects.Graphics, car: Rect) {
  g.fillStyle(0x1a1d22, 0.35);
  g.fillRoundedRect(car.x + 4, car.y + 6, car.w, car.h, 6);
  g.fillStyle(0x22262e, 1);
  g.fillRoundedRect(car.x, car.y, car.w, car.h, 6);
  g.fillStyle(0x8ea0b0, 0.8);
  const horizontal = car.w > car.h;
  if (horizontal) g.fillRoundedRect(car.x + 14, car.y + 8, car.w - 36, car.h - 16, 3);
  else g.fillRoundedRect(car.x + 8, car.y + 16, car.w - 16, car.h - 40, 3);
}

export function paintCity(scene: Phaser.Scene, map: CityMap): void {
  const g = scene.add.graphics();
  g.setDepth(0);

  fill(g, { x: 0, y: 0, w: WORLD.width, h: WORLD.height }, INK.asphalt);

  fill(g, { x: 32, y: 430, w: WORLD.width - 64, h: 52 }, INK.sidewalk);
  fill(g, { x: 32, y: 690, w: WORLD.width - 64, h: 48 }, INK.sidewalk);
  fill(g, { x: 624, y: 48, w: 112, h: 382 }, INK.sidewalk);
  fill(g, { x: 1248, y: 48, w: 152, h: 382 }, INK.sidewalk);
  fill(g, { x: 534, y: 748, w: 186, h: 756 }, INK.alley);
  fill(g, { x: 1000, y: 748, w: 1016, h: 756 }, INK.parking);

  g.lineStyle(3, INK.line, 0.28);
  for (let x = 80; x < WORLD.width - 80; x += 56) {
    g.lineBetween(x, 586, x + 28, 586);
  }

  for (let i = 0; i < 8; i += 1) {
    g.fillStyle(INK.line, 0.55);
    g.fillRect(900 + i * 16, 458, 8, 36);
  }

  g.lineStyle(2, INK.line, 0.22);
  for (let i = 0; i < 5; i += 1) {
    g.strokeRect(1080 + i * 150, 800, 110, 150);
    g.strokeRect(1080 + i * 150, 980, 110, 150);
  }

  const blocks: Array<{ rect: Rect; color: number; seed: number }> = [
    { rect: apartments, color: INK.apt, seed: 2 },
    { rect: office, color: INK.office, seed: 9 },
    { rect: warehouse, color: INK.warehouse, seed: 4 },
    { rect: diner, color: INK.diner, seed: 6 },
  ];

  for (const block of blocks) {
    fill(g, { ...block.rect, x: block.rect.x + 8, y: block.rect.y + 10 }, INK.shadow, 0.22);
    fill(g, block.rect, block.color);
    windows(g, block.rect, block.seed);
  }

  fill(g, { x: store.x + 10, y: store.y + 12, w: store.w, h: store.h }, INK.shadow, 0.22);
  fill(g, store, INK.storeFloor);
  g.fillStyle(INK.storeWall, 1);
  for (const wall of perimeter(store, { side: "south", x: doorX, size: doorSize })) {
    g.fillRect(wall.x, wall.y, wall.w, wall.h);
  }
  g.fillStyle(0x6a5b52, 1);
  g.fillRect(doorX, store.y + store.h - 28, doorSize, 28);

  const awningY = store.y + store.h - 28 - 18;
  for (let i = 0; i < 8; i += 1) {
    g.fillStyle(i % 2 === 0 ? INK.awning : INK.awningAlt, 1);
    g.fillRect(doorX - 36 + i * 22, awningY, 22, 16);
  }

  g.fillStyle(0x1a1210, 1);
  g.fillRoundedRect(868, 118, 248, 28, 3);
  g.fillStyle(INK.gold, 1);
  g.fillRoundedRect(counter.x, counter.y, counter.w, counter.h, 4);
  g.fillStyle(0x2a211c, 1);
  g.fillRect(960, 156, 64, 18);

  g.fillStyle(0x3a332e, 1);
  g.fillRoundedRect(800, 230, 28, 70, 3);
  g.fillRoundedRect(800, 320, 28, 70, 3);

  fill(g, { x: dumpster.x + 3, y: dumpster.y + 4, w: dumpster.w, h: dumpster.h }, INK.shadow, 0.25);
  g.fillStyle(0x2f4634, 1);
  g.fillRoundedRect(dumpster.x, dumpster.y, dumpster.w, dumpster.h, 4);

  for (const car of cars) roundedCar(g, car);

  const van = map.getawayZone;
  g.fillStyle(0x14201b, 0.95);
  g.fillRoundedRect(van.x, van.y, van.w, van.h, 10);
  g.lineStyle(3, INK.gold, 0.85);
  g.strokeRoundedRect(van.x + 8, van.y + 8, van.w - 16, van.h - 16, 8);

  g.fillStyle(INK.shadow, 0.25);
  g.fillRoundedRect(van.x + 78, van.y + 78, 150, 72, 8);
  g.fillStyle(INK.van, 1);
  g.fillRoundedRect(van.x + 70, van.y + 64, 150, 70, 8);
  g.fillStyle(0x4d1a16, 1);
  g.fillRoundedRect(van.x + 168, van.y + 74, 42, 48, 6);
  g.fillStyle(INK.vanGlass, 0.9);
  g.fillRoundedRect(van.x + 176, van.y + 82, 24, 18, 3);
  g.fillStyle(0x16181c, 1);
  g.fillCircle(van.x + 96, van.y + 128, 8);
  g.fillCircle(van.x + 186, van.y + 128, 8);

  const label = (
    text: string,
    x: number,
    y: number,
    size: string,
    color: string,
    depth = 2,
  ) => {
    scene.add
      .text(x, y, text, {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: size,
        color,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(depth);
  };

  label("APARTMENTS", apartments.x + apartments.w / 2, apartments.y + 22, "14px", "#d9d3c7");
  label("OFFICES", office.x + office.w / 2, office.y + 22, "14px", "#d9d3c7");
  label("WAREHOUSE", warehouse.x + warehouse.w / 2, warehouse.y + 24, "14px", "#d9d3c7");
  label("DINER", diner.x + diner.w / 2, diner.y + 24, "14px", "#f4f1ea");
  label("QUICK STOP", store.x + store.w / 2, store.y + 78, "28px", "#f4f1ea");
  label("OPEN", store.x + store.w / 2, awningY - 16, "12px", "#e7d7a1");
  label("LOT B", 1240, 770, "13px", "#b7b2a8");
  label("GETAWAY", van.x + van.w / 2, van.y + 36, "18px", "#d7c08a", 3);
  label("ALLEY", 620, 790, "12px", "#8d918a");
}

export function createWallBodies(
  scene: Phaser.Scene,
  walls: Rect[],
): Phaser.Physics.Arcade.StaticGroup {
  const group = scene.physics.add.staticGroup();
  for (const wall of walls) {
    const rect = scene.add.rectangle(
      wall.x + wall.w / 2,
      wall.y + wall.h / 2,
      wall.w,
      wall.h,
      0x000000,
      0,
    );
    rect.setVisible(false);
    scene.physics.add.existing(rect, true);
    const body = rect.body as Phaser.Physics.Arcade.StaticBody;
    body.updateFromGameObject();
    group.add(rect);
  }
  return group;
}
