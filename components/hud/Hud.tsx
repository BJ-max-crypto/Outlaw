import { formatCash } from "@/lib/game/format";
import type { HudSnapshot, MapSnapshot, WorldPos } from "@/lib/game/types";
import MiniMap from "./MiniMap";

type HudProps = {
  hud: HudSnapshot;
  prompt: string | null;
  robbery: number;
  banner: string | null;
  escapeMs: number | null;
  map: MapSnapshot | null;
  pos: WorldPos | null;
  mapOpen: boolean;
  onToggleMap: () => void;
};

export default function Hud({ hud, prompt, robbery, banner, escapeMs, map, pos, mapOpen, onToggleMap }: HudProps) {
  const healthPct = Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100));
  const energyPct = Math.max(0, Math.min(100, (hud.energy / hud.maxEnergy) * 100));

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {hud.wanted > 0 && <div className="heat-vignette absolute inset-0" />}

      {escapeMs !== null && escapeMs > 0 && (
        <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 text-center">
          <p className="text-[12px] font-semibold tracking-[0.42em] text-[#ffb4a8]">GET AWAY</p>
          <p className="font-display text-8xl leading-none text-white drop-shadow-[0_2px_0_#7f1d1d]">{formatEscape(escapeMs)}</p>
        </div>
      )}

      {banner && (
        <div className={`rise absolute left-1/2 z-20 -translate-x-1/2 ${escapeMs ? "top-28" : "top-5"}`}>
          <div className="rounded-full bg-[#b42318] px-4 py-2 text-[11px] font-semibold tracking-[0.22em] text-white">
            {banner}
          </div>
        </div>
      )}

      <section className="absolute left-4 top-4 w-56 rounded-2xl border border-white/10 bg-[#17191e]/92 p-4 shadow-xl">
        <p className="text-[10px] font-medium tracking-[0.28em] text-[#a39e94]">CASH</p>
        <p key={hud.cash} className="pop font-display mt-1 text-5xl leading-none text-[#d7c08a]">
          {formatCash(hud.cash)}
        </p>
        <Meter label="HEALTH" value={healthPct} color="#e25b2a" />
        <Meter label="ENERGY" value={energyPct} color="#7dcea0" />
        <p className="mt-4 text-[10px] font-medium tracking-[0.28em] text-[#a39e94]">WANTED</p>
        <div className="mt-1 flex gap-1" aria-label={`Wanted level ${hud.wanted} of ${hud.maxWanted}`}>
          {Array.from({ length: hud.maxWanted }, (_, index) => (
            <Star key={index} filled={index < hud.wanted} fresh={index === hud.wanted - 1 && hud.wanted > 0} />
          ))}
        </div>
        <p className="mt-4 text-[11px] font-medium tracking-[0.14em] text-[#d9d3c7]">
          {hud.employed ? "ON SHIFT" : "NO JOB"} · FOOD {hud.food}
        </p>
      </section>

      <MiniMap map={map} pos={pos} open={mapOpen} onToggle={onToggleMap} />

      {robbery > 0 && (
        <div className="absolute left-1/2 top-[42%] w-72 -translate-x-1/2">
          <div className="mb-2 flex items-center justify-between text-[10px] tracking-[0.22em] text-[#f4f1ea]">
            <span>ROBBERY</span>
            <span>{Math.round(robbery * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/50">
            <div className="h-full bg-[#e25b2a]" style={{ width: `${robbery * 100}%` }} />
          </div>
        </div>
      )}

      {prompt && (
        <div className="rise absolute bottom-28 left-1/2 w-[min(44rem,calc(100%-2rem))] -translate-x-1/2">
          <div className="rounded-2xl border border-white/10 bg-[#17191e] px-4 py-2 text-center shadow-xl">
            <span className="text-xs font-semibold tracking-[0.12em] text-[#f4f1ea]">{prompt}</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-5 left-1/2 w-[min(34rem,calc(100%-2rem))] -translate-x-1/2">
        <div className="rounded-2xl border border-white/10 bg-[#17191e]/92 px-5 py-3 text-center shadow-xl">
          <p className="text-[10px] font-medium tracking-[0.28em] text-[#a39e94]">NOW</p>
          <p className="mt-1 text-sm font-medium text-[#f4f1ea]">{hud.objective}</p>
        </div>
      </div>
    </div>
  );
}

function formatEscape(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-[10px] tracking-[0.22em] text-[#a39e94]">
        <span>{label}</span>
        <span>{Math.ceil(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  );
}

function Star({ filled, fresh }: { filled: boolean; fresh: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-5 w-5 ${filled ? "text-[#e25b2a]" : "text-white/15"} ${fresh ? "pop" : ""}`}
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M10 1.6 12.4 7l5.8.5-4.4 3.7 1.4 5.6L10 13.8 4.8 16.8l1.4-5.6L1.8 7.5 7.6 7 10 1.6Z"
      />
    </svg>
  );
}
