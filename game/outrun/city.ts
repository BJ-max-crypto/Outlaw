export type Rect = { x: number; y: number; w: number; h: number };

export const WORLD = { w: 1280, h: 800 };

export const ROADS = {
  horizontal: { x: 0, y: 330, w: 1280, h: 120 },
  vertical: { x: 540, y: 0, w: 140, h: 800 },
};

export const BUILDINGS: { id: string; label: string; kind: "office" | "warehouse" | "store" | "block"; rect: Rect }[] = [
  { id: "office", label: "OFFICES", kind: "office", rect: { x: 36, y: 36, w: 470, h: 260 } },
  { id: "warehouse", label: "WAREHOUSE", kind: "warehouse", rect: { x: 716, y: 36, w: 528, h: 260 } },
  { id: "store", label: "CONVENIENCE", kind: "store", rect: { x: 716, y: 486, w: 250, h: 250 } },
  { id: "annex", label: "LOCKERS", kind: "block", rect: { x: 990, y: 486, w: 250, h: 150 } },
];

export const CARS: { rect: Rect; color: number }[] = [
  { rect: { x: 58, y: 512, w: 108, h: 46 }, color: 0xc4553a },
  { rect: { x: 58, y: 700, w: 108, h: 46 }, color: 0xd7c08a },
  { rect: { x: 360, y: 530, w: 48, h: 112 }, color: 0x3d6f8f },
  { rect: { x: 392, y: 690, w: 112, h: 48 }, color: 0x2f3d34 },
];

export const PLANTERS: Rect[] = [
  { x: 496, y: 500, w: 28, h: 28 },
  { x: 496, y: 708, w: 28, h: 28 },
];

export const PACKAGE = { x: 980, y: 312 };
export const EXIT: Rect = { x: 558, y: 692, w: 104, h: 84 };
export const SPAWN = { x: 210, y: 620 };

/** Road centers only, so the patrol never cuts through a building. */
export const PATROL: { x: number; y: number }[] = [
  { x: 120, y: 390 },
  { x: 1160, y: 390 },
  { x: 610, y: 390 },
  { x: 610, y: 730 },
  { x: 610, y: 390 },
  { x: 120, y: 390 },
];

export function obstacles(): Rect[] {
  return [...BUILDINGS.map((building) => building.rect), ...CARS.map((car) => car.rect), ...PLANTERS];
}

export function contains(rect: Rect, x: number, y: number, pad = 0): boolean {
  return x >= rect.x - pad && y >= rect.y - pad && x <= rect.x + rect.w + pad && y <= rect.y + rect.h + pad;
}
