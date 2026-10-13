import { incomePerMinute, netWorth } from "./economy";
import type { RankRow, SaveData } from "./types";

/**
 * Sample rivals for the prototype board.
 * They are not online players. A later account API can replace this list
 * with `origin: "account"` rows and keep the same fields.
 */
export const DEMO_RIVALS: readonly RankRow[] = [
  { id: "demo-vale", name: "Vale Ortega", netWorth: 8_400, incomePerMinute: 140, bestScore: 920, origin: "demo" },
  { id: "demo-jun", name: "Jun Park", netWorth: 4_100, incomePerMinute: 90, bestScore: 640, origin: "demo" },
  { id: "demo-rio", name: "Rio Sant", netWorth: 2_200, incomePerMinute: 55, bestScore: 480, origin: "demo" },
  { id: "demo-ash", name: "Ash Quinn", netWorth: 1_500, incomePerMinute: 30, bestScore: 210, origin: "demo" },
  { id: "demo-mina", name: "Mina Cole", netWorth: 960, incomePerMinute: 0, bestScore: 310, origin: "demo" },
];

export function buildBoard(save: SaveData): RankRow[] {
  const you: RankRow = {
    id: "local-player",
    name: save.name || "Runner",
    netWorth: netWorth(save),
    incomePerMinute: incomePerMinute(save),
    bestScore: save.bestScore,
    origin: "local",
  };
  return [...DEMO_RIVALS, you].sort((a, b) => b.netWorth - a.netWorth || b.bestScore - a.bestScore);
}
