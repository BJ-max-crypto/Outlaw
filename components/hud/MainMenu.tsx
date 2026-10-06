type MainMenuProps = {
  ready: boolean;
  onPlay: () => void;
};

export default function MainMenu({ ready, onPlay }: MainMenuProps) {
  return (
    <div className="absolute inset-0 z-20 flex">
      <div className="flex w-full flex-col justify-between bg-[#0e0f12]/92 p-8 sm:w-[34rem] sm:border-r sm:border-white/10 sm:p-12">
        <div className="rise">
          <p className="text-[11px] font-semibold tracking-[0.42em] text-[#e25b2a]">LOCAL CREW</p>
          <h1 className="font-display mt-3 text-8xl leading-[0.82] text-[#f4f1ea] sm:text-9xl">OUTLAW</h1>
          <p className="mt-6 max-w-sm text-lg leading-snug text-[#d9d3c7]">
            Rob Quick Stop. Leave before the sirens get comfortable.
          </p>
          <button
            type="button"
            onClick={onPlay}
            disabled={!ready}
            className="mt-8 rounded-full bg-[#e25b2a] px-8 py-3 text-sm font-semibold tracking-[0.18em] text-[#1a0d08] transition hover:bg-[#ef6d3a] active:translate-y-px disabled:cursor-wait disabled:opacity-60"
          >
            {ready ? "START HEIST" : "LOADING"}
          </button>
        </div>
        <dl className="grid grid-cols-[5.5rem_1fr] gap-y-2 text-sm text-[#cfc8bb]">
          <dt className="font-medium text-[#f4f1ea]">WASD</dt>
          <dd>Move</dd>
          <dt className="font-medium text-[#f4f1ea]">Hold E</dt>
          <dd>Rob the register</dd>
          <dt className="font-medium text-[#f4f1ea]">Van</dt>
          <dd>Getaway in the south lot</dd>
        </dl>
      </div>
    </div>
  );
}
