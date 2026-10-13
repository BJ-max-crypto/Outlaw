import Phaser from "phaser";
import { BUILDINGS, CARS, EXIT, PACKAGE, PLANTERS, ROADS, WORLD, type Rect } from "./city";


const GROUND = 0x10161f;
const ROAD = 0x242c3a;
const WALK = 0x3a4456;
const MARK = 0xd7c08a;

function fill(g: Phaser.GameObjects.Graphics, color: number, rect: Rect, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillRect(rect.x, rect.y, rect.w, rect.h);
}

function windows(g: Phaser.GameObjects.Graphics, rect: Rect, columns: number, rows: number): void {
  const gapX = rect.w / (columns + 1);
  const gapY = 28;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const x = rect.x + gapX * (col + 0.55);
      const y = rect.y + 36 + row * gapY;
      g.fillStyle(0x8ec6de, 0.85);
      g.fillRoundedRect(x, y, 16, 10, 2);
    }
  }
}

function car(g: Phaser.GameObjects.Graphics, rect: Rect, color: number): void {
  g.fillStyle(0x000000, 0.28);
  g.fillRoundedRect(rect.x + 4, rect.y + 6, rect.w, rect.h, 8);
  g.fillStyle(color, 1);
  g.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 8);
  g.fillStyle(0x151b24, 0.9);
  const wide = rect.w > rect.h;
  if (wide) g.fillRoundedRect(rect.x + 16, rect.y + 8, rect.w - 36, rect.h - 16, 4);
  else g.fillRoundedRect(rect.x + 8, rect.y + 18, rect.w - 16, rect.h - 40, 4);
}

export function paintCity(scene: Phaser.Scene): void {
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(GROUND, 1);
  g.fillRect(0, 0, WORLD.w, WORLD.h);

  g.fillStyle(WALK, 1);
  g.fillRect(0, 300, WORLD.w, 150);
  g.fillRect(510, 0, 200, WORLD.h);

  fill(g, ROAD, ROADS.horizontal);
  fill(g, ROAD, ROADS.vertical);

  g.fillStyle(MARK, 0.85);
  for (let x = 24; x < WORLD.w; x += 46) {
    g.fillRect(x, 386, 22, 4);
  }
  for (let y = 16; y < WORLD.h; y += 46) {
    if (y > 330 && y < 450) continue;
    g.fillRect(606, y, 4, 22);
  }

  g.lineStyle(2, 0xf4f1ea, 0.35);
  const cross = [
    [548, 338],
    [672, 338],
    [548, 442],
    [672, 442],
  ] as const;
  for (const [x, y] of cross) {
    for (let i = 0; i < 5; i += 1) g.strokeRect(x + i * 8, y, 4, 18);
  }

  g.fillStyle(0x1a2420, 1);
  g.fillRect(36, 486, 470, 278);
  g.fillStyle(0xd7c08a, 0.16);
  for (let x = 70; x < 470; x += 54) g.fillRect(x, 560, 28, 3);
  for (let y = 530; y < 740; y += 54) g.fillRect(250, y, 3, 28);

  for (const building of BUILDINGS) {
    const rect = building.rect;
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(rect.x + 8, rect.y + 10, rect.w, rect.h, 8);
    const wall = building.kind === "warehouse" ? 0x1a222c : building.kind === "store" ? 0x1c2633 : 0x171e2a;
    g.fillStyle(wall, 1);
    g.fillRoundedRect(rect.x, rect.y, rect.w, rect.h, 8);
    g.fillStyle(0x121820, 1);
    g.fillRect(rect.x + 10, rect.y + 8, rect.w - 20, 14);
    if (building.kind === "office") windows(g, rect, 7, 6);
    if (building.kind === "block") windows(g, rect, 4, 3);
    if (building.kind === "warehouse") {
      g.fillStyle(0x2a241c, 1);
      g.fillRoundedRect(rect.x + 36, rect.y + rect.h - 78, 120, 62, 4);
      g.fillRoundedRect(rect.x + 180, rect.y + rect.h - 78, 120, 62, 4);
      g.fillStyle(0xc4a15a, 1);
      g.fillRect(rect.x + 48, rect.y + rect.h - 64, 28, 22);
      g.fillRect(rect.x + 84, rect.y + rect.h - 70, 28, 28);
      g.fillRect(rect.x + 196, rect.y + rect.h - 60, 36, 20);
    }
    if (building.kind === "store") {
      g.fillStyle(MARK, 1);
      g.fillRoundedRect(rect.x + 18, rect.y - 8, rect.w - 36, 28, 4);
      g.fillStyle(0x9fd0e8, 0.9);
      g.fillRoundedRect(rect.x + 28, rect.y + 40, rect.w - 56, 70, 4);
      g.fillStyle(0x10161f, 1);
      g.fillRoundedRect(rect.x + rect.w / 2 - 22, rect.y + rect.h - 78, 44, 70, 4);
    }
  }

  for (const spot of CARS) car(g, spot.rect, spot.color);
  for (const planter of PLANTERS) {
    g.fillStyle(0x243028, 1);
    g.fillRoundedRect(planter.x, planter.y, planter.w, planter.h, 4);
    g.fillStyle(0x3f6b52, 1);
    g.fillCircle(planter.x + planter.w / 2, planter.y + 8, 10);
  }

  g.fillStyle(MARK, 0.22);
  g.fillRoundedRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h, 8);
  g.lineStyle(3, MARK, 0.95);
  g.strokeRoundedRect(EXIT.x, EXIT.y, EXIT.w, EXIT.h, 8);

  const label = (text: string, x: number, y: number, size: number, color = "#d7c08a") => {
    scene.add
      .text(x, y, text, {
        fontFamily: "Outfit, Arial, sans-serif",
        fontSize: `${size}px`,
        color,
        fontStyle: "700",
      })
      .setOrigin(0.5)
      .setDepth(4);
  };

  label("OFFICES", 271, 248, 20, "#c5d0de");
  label("WAREHOUSE", 980, 150, 26, "#d7c08a");
  label("CONVENIENCE", 841, 492, 13, "#1a1408");
  label("PARKING", 230, 600, 18, "#8ea0b8");
  label("EXIT", EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2, 18, "#1a1408");
  label("PACKAGE", PACKAGE.x, PACKAGE.y - 28, 11, "#f4f1ea");
}

