import Phaser from "phaser";

export const AVATAR_COP = "avatar-cop";

const PLAYER_SIZE = 48;

type PlayerStyle = {
  jacket: number;
  accent: number;
  skin: number;
};

function paintPlayer(scene: Phaser.Scene, key: string, style: PlayerStyle, facing: "s" | "n" | "e", frame: 0 | 1): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0x000000, 0.28);
  g.fillEllipse(24, 42, 20, 8);

  const step = frame === 0 ? 0 : 2;
  g.fillStyle(0x17191c, 1);

  if (facing === "e") {
    g.fillRoundedRect(16, 32 + step, 7, 8, 2);
    g.fillRoundedRect(24, 32, 7, 8, 2);
    g.fillStyle(style.jacket, 1);
    g.fillRoundedRect(14, 18, 20, 16, 5);
    g.fillStyle(style.accent, 1);
    g.fillRect(28, 21, 4, 9);
    g.fillStyle(style.skin, 1);
    g.fillCircle(30, 15, 7);
    g.fillStyle(style.accent, 1);
    g.fillRoundedRect(26, 14, 9, 5, 2);
  } else {
    g.fillRoundedRect(14, 31 + (frame === 0 ? 1 : 0), 7, 8, 2);
    g.fillRoundedRect(26, 31 + step, 7, 8, 2);
    g.fillStyle(style.jacket, 1);
    g.fillRoundedRect(13, 18, 22, 16, 5);
    g.fillStyle(style.skin, 1);
    g.fillCircle(24, 15, 8);
    if (facing === "s") {
      g.fillStyle(style.accent, 1);
      g.fillRoundedRect(16, 15, 16, 6, 2);
      g.fillStyle(0xf4f1ea, 1);
      g.fillCircle(21, 13, 1.2);
      g.fillCircle(27, 13, 1.2);
    } else {
      g.fillStyle(0x1d2026, 1);
      g.fillCircle(24, 13, 8);
      g.fillStyle(style.accent, 1);
      g.fillRect(20, 20, 8, 3);
    }
  }

  g.generateTexture(key, PLAYER_SIZE, PLAYER_SIZE);
  g.destroy();
}

/** The original drawn player: light jacket, orange accent, facing frames. */
export function createPlayerTextures(scene: Phaser.Scene): void {
  const style = { jacket: 0xe4ddd2, accent: 0xe25b2a, skin: 0xe8c7a4 };
  const faces = ["s", "n", "e"] as const;
  for (const facing of faces) {
    for (const frame of [0, 1] as const) {
      paintPlayer(scene, `player-${facing}-${frame}`, style, facing, frame);
    }
  }
}

export function playerTexture(facing: "n" | "s" | "e" | "w", frame: 0 | 1): string {
  const side = facing === "w" ? "e" : facing;
  return `player-${side}-${frame}`;
}

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
