import OnlinePanel from "@/components/auth/OnlinePanel";

type MainMenuProps = {
  ready: boolean;
  clerkEnabled: boolean;
  onPlay: () => void;
  onPlayOnline: () => void;
};

export default function MainMenu({ ready, clerkEnabled, onPlay, onPlayOnline }: MainMenuProps) {
  return (
    <div className="absolute inset-0 z-20 flex">
      <div className="flex w-full flex-col justify-between overflow-y-auto bg-[#0e0f12]/92 p-8 sm:w-[34rem] sm:border-r sm:border-white/10 sm:p-12">
        <div className="rise">
          <p className="text-[11px] font-semibold tracking-[0.42em] text-[#e25b2a]">OPEN CITY</p>
          <h1 className="font-display mt-3 text-8xl leading-[0.82] text-[#f4f1ea] sm:text-9xl">Runout</h1>
          <p className="mt-6 max-w-sm text-lg leading-snug text-[#d9d3c7]">
            Buy or steal a car and it pulls up outside, ready to drive. Gas runs down, and you pay to fill the tank.
          </p>
          <button
            type="button"
            onClick={onPlay}
            disabled={!ready}
            className="mt-8 rounded-full bg-[#e25b2a] px-8 py-3 text-sm font-semibold tracking-[0.18em] text-[#1a0d08] transition hover:bg-[#ef6d3a] active:translate-y-px disabled:cursor-wait disabled:opacity-60"
          >
            {ready ? "ENTER CITY" : "LOADING"}
          </button>
          {clerkEnabled ? (
            <OnlinePanel ready={ready} onPlay={onPlayOnline} />
          ) : (
            <p className="mt-4 max-w-sm text-sm leading-snug text-[#a39e94]">
              Local play works now. Online play needs your Clerk and Supabase keys in the environment.
            </p>
          )}
        </div>
        <dl className="mt-10 grid grid-cols-[5.5rem_1fr] gap-y-2 text-sm text-[#cfc8bb]">
          <dt className="font-medium text-[#f4f1ea]">WASD</dt>
          <dd>Move, or steer while driving</dd>
          <dt className="font-medium text-[#f4f1ea]">Shift</dt>
          <dd>Sprint. It burns energy</dd>
          <dt className="font-medium text-[#f4f1ea]">E</dt>
          <dd>Drive, clock in, buy, or invest</dd>
          <dt className="font-medium text-[#f4f1ea]">F</dt>
          <dd>Steal a vehicle, or get out</dd>
          <dt className="font-medium text-[#f4f1ea]">Hold R</dt>
          <dd>Rob a business you do not own</dd>
          <dt className="font-medium text-[#f4f1ea]">Grocery</dt>
          <dd>Walk in and buy food from the counter</dd>
          <dt className="font-medium text-[#f4f1ea]">G</dt>
          <dd>Eat. Food restores energy</dd>
          <dt className="font-medium text-[#f4f1ea]">Pinch</dt>
          <dd>Two fingers zoom the island. You stay centered</dd>
          <dt className="font-medium text-[#f4f1ea]">Map</dt>
          <dd>Click the corner map to expand it</dd>
        </dl>
      </div>
    </div>
  );
}
