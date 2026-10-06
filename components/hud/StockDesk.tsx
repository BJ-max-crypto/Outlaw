import { formatCash } from "@/lib/game/format";
import type { StockBook, StockOrder } from "@/lib/game/types";

type StockDeskProps = {
  book: StockBook;
  onOrder: (order: StockOrder) => void;
  onClose: () => void;
};

export default function StockDesk({ book, onOrder, onClose }: StockDeskProps) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-1/2 z-40 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-[#e25b2a]/40 bg-[#14161b] p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.32em] text-[#e25b2a]">STOCK INVESTMENT</p>
          <p className="font-display mt-1 text-4xl leading-none text-[#f4f1ea]">{formatCash(book.cash)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-[#f4f1ea] px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-[#17191e]"
        >
          CLOSE
        </button>
      </div>
      <ul className="mt-4 divide-y divide-white/10">
        {book.quotes.map((quote) => (
          <li key={quote.id} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-[0.14em] text-[#f4f1ea]">{quote.name}</p>
              <p className="text-xs text-[#a39e94]">
                {formatCash(quote.price)} · {quote.shares} SHARES
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOrder({ id: quote.id, side: "buy" })}
              className="rounded-full bg-[#e25b2a] px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-[#1a0d08]"
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => onOrder({ id: quote.id, side: "sell" })}
              disabled={quote.shares <= 0}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-[#f4f1ea] disabled:opacity-40"
            >
              SELL
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
