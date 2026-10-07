import Phaser from "phaser";

const ACTOR_SIZE = 48;

type ActorStyle = {
  key: "player" | "cop";
  jacket: number;
  accent: number;
  skin: number;
};

function paintActor(scene: Phaser.Scene, key: string, style: ActorStyle, facing: "s" | "n" | "e", frame: 0 | 1): void {
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
    if (style.key === "player") {
      g.fillStyle(style.accent, 1);
      g.fillRoundedRect(26, 14, 9, 5, 2);
    } else {
      g.fillStyle(0x14284a, 1);
      g.fillRoundedRect(24, 8, 12, 5, 2);
      g.fillStyle(frame === 0 ? 0xd64545 : 0x3a6cff, 1);
      g.fillCircle(36, 10, 2);
    }
  } else {
    g.fillRoundedRect(14, 31 + (frame === 0 ? 1 : 0), 7, 8, 2);
    g.fillRoundedRect(26, 31 + step, 7, 8, 2);
    g.fillStyle(style.jacket, 1);
    g.fillRoundedRect(13, 18, 22, 16, 5);
    g.fillStyle(style.skin, 1);
    g.fillCircle(24, 15, 8);
    if (facing === "s") {
      if (style.key === "player") {
        g.fillStyle(style.accent, 1);
        g.fillRoundedRect(16, 15, 16, 6, 2);
        g.fillStyle(0xf4f1ea, 1);
        g.fillCircle(21, 13, 1.2);
        g.fillCircle(27, 13, 1.2);
      } else {
        g.fillStyle(0x14284a, 1);
        g.fillRoundedRect(16, 8, 16, 6, 2);
        g.fillStyle(style.accent, 1);
        g.fillCircle(30, 24, 2.4);
        g.fillStyle(frame === 0 ? 0xd64545 : 0x3a6cff, 1);
        g.fillCircle(24, 8, 2);
      }
    } else if (style.key === "cop") {
      g.fillStyle(0x14284a, 1);
      g.fillRoundedRect(16, 8, 16, 6, 2);
    } else {
      g.fillStyle(0x1d2026, 1);
      g.fillCircle(24, 13, 8);
      g.fillStyle(style.accent, 1);
      g.fillRect(20, 20, 8, 3);
    }
  }

  g.generateTexture(key, ACTOR_SIZE, ACTOR_SIZE);
  g.destroy();
}

function paintSet(scene: Phaser.Scene, style: ActorStyle): void {
  const faces = ["s", "n", "e"] as const;
  for (const facing of faces) {
    for (const frame of [0, 1] as const) {
      paintActor(scene, `${style.key}-${facing}-${frame}`, style, facing, frame);
    }
  }
}

/** The original drawn player: light jacket, orange accent, facing frames. */
export function createPlayerTextures(scene: Phaser.Scene): void {
  paintSet(scene, { key: "player", jacket: 0xe4ddd2, accent: 0xe25b2a, skin: 0xe8c7a4 });
}

/** The original drawn officers: blue jacket, cap, and a light that swaps color as they walk. */
export function createCopTextures(scene: Phaser.Scene): void {
  paintSet(scene, { key: "cop", jacket: 0x1d3e73, accent: 0xd7c08a, skin: 0xe8c7a4 });
}

export function playerTexture(facing: "n" | "s" | "e" | "w", frame: 0 | 1): string {
  const side = facing === "w" ? "e" : facing;
  return `player-${side}-${frame}`;
}

export function copTexture(facing: "n" | "s" | "e" | "w", frame: 0 | 1): string {
  const side = facing === "w" ? "e" : facing;
  return `cop-${side}-${frame}`;
}
