import { formatCash } from "@/lib/game/format";
import { TUNING } from "@/game/tuning";
import type { SessionView } from "@/lib/game/types";

type IslandActionsProps = {
  session: SessionView;
  playerId: string;
  onBoat: () => void;
  onReinforce: () => void;
};

export default function IslandActions({ session, playerId, onBoat, onReinforce }: IslandActionsProps) {
  const mine = session.members.find((member) => member.id === playerId);
  if (!mine) return null;
  return (
    <div className="pointer-events-auto absolute bottom-36 right-4 z-20 w-56 rounded-2xl border border-white/10 bg-[#17191e]/92 p-3">
      <p className="text-[10px] font-semibold tracking-[0.28em] text-[#a39e94]">SESSION {session.code}</p>
      <ul className="mt-2 space-y-1 text-[11px] text-[#d9d3c7]">
        {session.members.map((member) => (
          <li key={member.id}>
            {member.username} · {formatCash(member.cash)}
            {member.heldBy !== member.id ? " · SOLD" : ""}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-col gap-2">
        {!mine.boat && (
          <button type="button" onClick={onBoat} className="rounded-full bg-[#d7c08a] px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-[#1a1408]">
            BOAT {formatCash(TUNING.crossingBoatCost)}
          </button>
        )}
        <button type="button" onClick={onReinforce} className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-[#f4f1ea]">
          REINFORCE {formatCash(TUNING.reinforcementCost)}
        </button>
      </div>
    </div>
  );
}
