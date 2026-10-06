import { formatCash } from "@/lib/game/format";
import type { StockBook, StockOrder, StockQuote } from "@/lib/game/types";

type StockDeskProps = {
  book: StockBook;
  onOrder: (order: StockOrder) => void;
  onClose: () => void;
};

export default function StockDesk({ book, onOrder, onClose }: StockDeskProps) {
  return (
    <div className="pointer-events-auto absolute left-1/2 top-1/2 z-40 max-h-[86dvh] w-[min(36rem,calc(100%-1.5rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-[#e25b2a]/40 bg-[#14161b] p-5 shadow-2xl">
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
      <ul className="mt-4 space-y-3">
        {book.quotes.map((quote) => (
          <li key={quote.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-[0.14em] text-[#f4f1ea]">{quote.name}</p>
                <p className="text-xs text-[#a39e94]">
                  {formatCash(quote.price)} · {quote.shares} SHARES
                </p>
              </div>
              <p className={`text-xs font-semibold tracking-[0.08em] ${changeOf(quote) >= 0 ? "text-[#7dcea0]" : "text-[#e25b2a]"}`}>
                {formatChange(quote)}
              </p>
            </div>
            <StockChart history={quote.history} />
            <div className="mt-2 flex justify-end gap-2">
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
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function changeOf(quote: StockQuote): number {
  const first = quote.history[0] ?? quote.price;
  return quote.price - first;
}

function formatChange(quote: StockQuote): string {
  const delta = Math.round(changeOf(quote));
  const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
  return `${sign}$${Math.abs(delta).toLocaleString("en-US")}`;
}

function StockChart({ history }: { history: number[] }) {
  const width = 320;
  const height = 72;
  const series = history.length > 0 ? history : [0];
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = Math.max(1, max - min);
  const point = (price: number, index: number) => {
    const x = series.length === 1 ? width / 2 : (index / (series.length - 1)) * (width - 4) + 2;
    const y = height - 6 - ((price - min) / span) * (height - 16);
    return { x, y };
  };
  const dots = series.map(point);
  const line = dots.map((dot) => `${dot.x},${dot.y}`).join(" ");
  const fill = `0,${height} ${line} ${width},${height}`;
  const up = series[series.length - 1] >= series[0];
  const stroke = up ? "#7dcea0" : "#e25b2a";
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 h-16 w-full" role="img" aria-label="Price chart">
      <polygon points={fill} fill={stroke} opacity="0.16" />
      <polyline fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" points={line} />
    </svg>
  );
}
