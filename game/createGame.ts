import Phaser from "phaser";
import { OutrunScene } from "./scenes/OutrunScene";

export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#070b10",
    banner: false,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || window.innerWidth,
      height: parent.clientHeight || window.innerHeight,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [OutrunScene],
    input: { keyboard: true },
  });

  if (process.env.NODE_ENV !== "production") {
    (window as Window & { __OUTRUN__?: Phaser.Game }).__OUTRUN__ = game;
  }

  return game;
}
