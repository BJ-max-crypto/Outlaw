import { playerId } from "@/lib/server/identity";
import { boardRank, leaderboard, publicCard, type BoardId } from "@/lib/server/ledger";

const BOARDS: BoardId[] = ["netWorth", "cash", "businesses", "stocks", "achievements"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = url.searchParams.get("board") ?? "netWorth";
  const board = BOARDS.includes(requested as BoardId) ? (requested as BoardId) : "netWorth";
  const player = url.searchParams.get("player");
  if (player) {
    const card = await publicCard(player);
    if (!card) return Response.json({ profile: null }, { status: 404 });
    return Response.json({ profile: card });
  }
  const id = await playerId(request);
  const rows = leaderboard(board);
  return Response.json({
    board,
    rows,
    rank: id ? boardRank(board, id) : null,
  });
}
