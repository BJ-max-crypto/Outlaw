import { formatCash } from "@/lib/game/format";
import type { GroceryShelf } from "@/lib/game/types";

type GroceryCounterProps = {
  shelf: GroceryShelf;
  onBuy: (index: number) => void;
  onBuyStore: () => void;
  onClose: () => void;
};

export default function GroceryCounter({ shelf, onBuy, onBuyStore, onClose }: GroceryCounterProps) {
  const packFull = shelf.food >= shelf.packSize;
  return (
    <div className="pointer-events-auto absolute left-1/2 top-1/2 z-40 w-[min(28rem,calc(100%-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[#7dcea0]/40 bg-[#14161b] p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.32em] text-[#7dcea0]">GROCERY</p>
          <p className="font-display mt-1 text-4xl leading-none text-[#f4f1ea]">{formatCash(shelf.cash)}</p>
          <p className="mt-2 text-xs tracking-[0.14em] text-[#a39e94]">
            PACK {shelf.food}/{shelf.packSize}
            {shelf.ownsStore ? " · YOU OWN THIS" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-[#f4f1ea] px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-[#17191e]"
        >
          CLOSE
        </button>
      </div>
      <ul className="mt-4 space-y-3">
        {shelf.items.map((item, index) => {
          const affordable = shelf.cash >= item.price;
          const restores = [`+${item.energy} ENERGY`, item.health > 0 ? `+${item.health} HEALTH` : ""].filter(Boolean).join(" · ");
          return (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-3">
              <div>
                <p className="text-sm font-semibold tracking-[0.14em] text-[#f4f1ea]">{item.name}</p>
                <p className="text-xs text-[#a39e94]">
                  {formatCash(item.price)} · {restores}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onBuy(index)}
                disabled={!affordable || packFull}
                className="rounded-full bg-[#7dcea0] px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-[#10241b] disabled:opacity-40"
              >
                BUY
              </button>
            </li>
          );
        })}
      </ul>
      {!shelf.ownsStore && (
        <button
          type="button"
          onClick={onBuyStore}
          disabled={shelf.cash < shelf.storePrice}
          className="mt-4 w-full rounded-full border border-white/15 px-3 py-2 text-[11px] font-semibold tracking-[0.14em] text-[#f4f1ea] disabled:opacity-40"
        >
          BUY THE STORE {formatCash(shelf.storePrice)}
        </button>
      )}
    </div>
  );
}
