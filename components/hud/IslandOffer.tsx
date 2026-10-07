import { formatCash } from "@/lib/game/format";
import { TUNING } from "@/game/tuning";

type IslandOfferProps = {
  username: string;
  worth: string;
  onBuy: () => void;
  onClose: () => void;
};

export default function IslandOffer({ username, worth, onBuy, onClose }: IslandOfferProps) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-1/2 z-40 w-[min(28rem,calc(100%-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[#d7c08a]/40 bg-[#14161b] p-5 shadow-2xl">
      <p className="text-[11px] font-semibold tracking-[0.32em] text-[#d7c08a]">ISLAND FOR SALE</p>
      <h2 className="font-display mt-2 text-4xl text-[#f4f1ea]">{username}</h2>
      <p className="mt-3 text-sm leading-snug text-[#d9d3c7]">
        This island is worth everything on it. {worth} Buy it for {formatCash(TUNING.islandBuyCost)} and its earnings become yours.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-[#f4f1ea]">
          NOT NOW
        </button>
        <button type="button" onClick={onBuy} className="rounded-full bg-[#d7c08a] px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-[#1a1408]">
          BUY {formatCash(TUNING.islandBuyCost)}
        </button>
      </div>
    </div>
  );
}
