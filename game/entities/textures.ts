import Phaser from "phaser";

type ActorStyle = {
  key: "player" | "cop";
  jacket: number;
  accent: number;
  skin: number;
};

const SIZE = 48;

function paint(
  scene: Phaser.Scene,
  key: string,
  style: ActorStyle,
  facing: "s" | "n" | "e",
  frame: 0 | 1,
) {
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

  g.generateTexture(key, SIZE, SIZE);
  g.destroy();
}

export function createActorTextures(scene: Phaser.Scene): void {
  const styles: ActorStyle[] = [
    { key: "player", jacket: 0xe4ddd2, accent: 0xe25b2a, skin: 0xe8c7a4 },
    { key: "cop", jacket: 0x1d3e73, accent: 0xd7c08a, skin: 0xe8c7a4 },
  ];
  const faces = ["s", "n", "e"] as const;
  for (const style of styles) {
    for (const facing of faces) {
      for (const frame of [0, 1] as const) {
        paint(scene, `${style.key}-${facing}-${frame}`, style, facing, frame);
      }
    }
  }
}

export function createRideTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists("car")) return;

  const car = scene.make.graphics({ x: 0, y: 0 }, false);
  car.fillStyle(0x000000, 0.28);
  car.fillEllipse(44, 40, 64, 12);
  car.fillStyle(0xffffff, 1);
  car.fillRoundedRect(6, 8, 76, 28, 8);
  car.fillStyle(0xb7c6d4, 1);
  car.fillRoundedRect(28, 12, 26, 16, 4);
  car.fillStyle(0x1a1d22, 1);
  car.fillCircle(22, 34, 5);
  car.fillCircle(66, 34, 5);
  car.generateTexture("car", 88, 48);
  car.destroy();

  const boat = scene.make.graphics({ x: 0, y: 0 }, false);
  boat.fillStyle(0x000000, 0.25);
  boat.fillEllipse(48, 32, 70, 10);
  boat.fillStyle(0xffffff, 1);
  boat.fillTriangle(8, 18, 8, 30, 86, 24);
  boat.fillRoundedRect(18, 8, 28, 16, 4);
  boat.fillStyle(0x9bb4c6, 1);
  boat.fillRect(24, 12, 16, 8);
  boat.generateTexture("boat", 96, 40);
  boat.destroy();
}

export function textureKey(kind: "player" | "cop", facing: "n" | "s" | "e" | "w", frame: 0 | 1): string {
  const side = facing === "w" ? "e" : facing;
  return `${kind}-${side}-${frame}`;
}
