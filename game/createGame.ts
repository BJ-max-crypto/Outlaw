import Phaser from "phaser";
import { CityScene } from "./scenes/CityScene";

export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: "#0e0f12",
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
    scene: [CityScene],
    input: { keyboard: true },
  });

  if (process.env.NODE_ENV !== "production") {
    (window as Window & { __RUNOUT__?: Phaser.Game }).__RUNOUT__ = game;
  }

  return game;
}
