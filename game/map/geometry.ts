export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export function rectContains(rect: Rect, x: number, y: number, pad = 0): boolean {
  return (
    x >= rect.x - pad &&
    x <= rect.x + rect.w + pad &&
    y >= rect.y - pad &&
    y <= rect.y + rect.h + pad
  );
}

type DoorGap = { side: "south"; x: number; size: number };

const TH = 36;

function splitHorizontal(wall: Rect, gapX: number, gapW: number): Rect[] {
  const left = gapX - wall.x;
  const rightX = gapX + gapW;
  const right = wall.x + wall.w - rightX;
  const parts: Rect[] = [];
  if (left > 4) parts.push({ x: wall.x, y: wall.y, w: left, h: wall.h });
  if (right > 4) parts.push({ x: rightX, y: wall.y, w: right, h: wall.h });
  return parts;
}

/** Hollow perimeter so the player can walk through a door gap. */
export function perimeter(rect: Rect, gap?: DoorGap): Rect[] {
  const { x, y, w, h } = rect;
  const north = { x, y, w, h: TH };
  const south = { x, y: y + h - TH, w, h: TH };
  const west = { x, y: y + TH, w: TH, h: h - TH * 2 };
  const east = { x: x + w - TH, y: y + TH, w: TH, h: h - TH * 2 };
  if (gap?.side === "south") {
    return [north, west, east, ...splitHorizontal(south, gap.x, gap.size)];
  }
  return [north, south, west, east];
}
