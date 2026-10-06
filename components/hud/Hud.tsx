import { formatCash } from "@/lib/game/format";
import type { HudSnapshot } from "@/lib/game/types";

type HudProps = {
  hud: HudSnapshot;
  prompt: string | null;
  robbery: number;
  banner: string | null;
};

export default function Hud({ hud, prompt, robbery, banner }: HudProps) {
  const healthPct = Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100));

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {hud.wanted > 0 && <div className="heat-vignette absolute inset-0" />}

      {banner && (
        <div className="rise absolute left-1/2 top-5 -translate-x-1/2">
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
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] tracking-[0.22em] text-[#a39e94]">
            <span>HEALTH</span>
            <span>{Math.ceil(healthPct)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#e25b2a]" style={{ width: `${healthPct}%` }} />
          </div>
        </div>
        <p className="mt-4 text-[10px] font-medium tracking-[0.28em] text-[#a39e94]">WANTED</p>
        <div className="mt-1 flex gap-1" aria-label={`Wanted level ${hud.wanted} of ${hud.maxWanted}`}>
          {Array.from({ length: hud.maxWanted }, (_, index) => (
            <Star key={index} filled={index < hud.wanted} fresh={index === hud.wanted - 1 && hud.wanted > 0} />
          ))}
        </div>
      </section>

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

      {prompt && <Prompt text={prompt} />}

      <div className="absolute bottom-5 left-1/2 w-[min(34rem,calc(100%-2rem))] -translate-x-1/2">
        <div className="rounded-2xl border border-white/10 bg-[#17191e]/92 px-5 py-3 text-center shadow-xl">
          <p className="text-[10px] font-medium tracking-[0.28em] text-[#a39e94]">OBJECTIVE</p>
          <p className="mt-1 text-sm font-medium text-[#f4f1ea]">{hud.objective}</p>
        </div>
      </div>
    </div>
  );
}

function Prompt({ text }: { text: string }) {
  const robbing = text === "HOLD E TO ROB";
  return (
    <div className="rise absolute bottom-28 left-1/2 -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-[#17191e] px-4 py-2 shadow-xl">
        {robbing ? (
          <>
            <span className="text-xs font-semibold tracking-[0.18em] text-[#f4f1ea]">HOLD</span>
            <kbd className="rounded-md bg-[#f4f1ea] px-2 py-0.5 text-sm font-semibold text-[#17191e]">E</kbd>
            <span className="text-xs font-semibold tracking-[0.18em] text-[#f4f1ea]">TO ROB</span>
          </>
        ) : (
          <span className="text-xs font-semibold tracking-[0.16em] text-[#f4f1ea]">{text}</span>
        )}
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
