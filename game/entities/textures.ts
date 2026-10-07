import Phaser from "phaser";

export const AVATAR_PLAYER = "avatar-player";
export const AVATAR_COP = "avatar-cop";

/** On-screen height for both characters. Head points up in the source art, which is north. */
const AVATAR_HEIGHT = 118;

export function faceAngle(facing: "n" | "s" | "e" | "w"): number {
  if (facing === "e") return Math.PI / 2;
  if (facing === "s") return Math.PI;
  if (facing === "w") return -Math.PI / 2;
  return 0;
}

export function placeAvatar(sprite: Phaser.GameObjects.Sprite): void {
  const scale = AVATAR_HEIGHT / sprite.frame.height;
  sprite.setOrigin(0.5, 0.5);
  sprite.setScale(scale);
}

/** A circle on the torso stays put when the art rotates. Arcade bodies do not spin with the sprite. */
export function fitCircle(sprite: Phaser.Physics.Arcade.Sprite): void {
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  const { width, height } = sprite.frame;
  const radius = Math.min(width, height) * 0.22;
  body.setCircle(radius, width / 2 - radius, height / 2 - radius);
}
