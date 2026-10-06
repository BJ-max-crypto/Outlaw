import Phaser from "phaser";

export function hasLineOfSight(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  blockers: Phaser.Geom.Rectangle[],
): boolean {
  const line = new Phaser.Geom.Line(fromX, fromY, toX, toY);
  for (const block of blockers) {
    if (Phaser.Geom.Intersects.LineToRectangle(line, block)) return false;
  }
  return true;
}
