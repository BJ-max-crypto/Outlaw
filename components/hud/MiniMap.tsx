import type { MapSnapshot, WorldPos } from "@/lib/game/types";

type MiniMapProps = {
  map: MapSnapshot | null;
  pos: WorldPos | null;
  open: boolean;
  onToggle: () => void;
};

export default function MiniMap({ map, pos, open, onToggle }: MiniMapProps) {
  if (!map) return null;
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? "Collapse city map" : "Expand city map"}
        className="pointer-events-auto absolute right-4 top-4 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#17191e]/92 p-2 text-left shadow-xl"
      >
        <span className="mb-1 block text-[10px] font-medium tracking-[0.28em] text-[#a39e94]">MAP</span>
        <CityChart map={map} pos={pos} detailed={false} />
      </button>
      {open && (
        <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-[#0e0f12]/72 p-6">
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#17191e] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[11px] font-semibold tracking-[0.32em] text-[#a39e94]">CITY</p>
              <button
                type="button"
                onClick={onToggle}
                className="rounded-full bg-[#f4f1ea] px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-[#17191e]"
              >
                CLOSE
              </button>
            </div>
            <CityChart map={map} pos={pos} detailed />
          </div>
        </div>
      )}
    </>
  );
}

function CityChart({ map, pos, detailed }: { map: MapSnapshot; pos: WorldPos | null; detailed: boolean }) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-[#1a222b]" style={{ aspectRatio: `${map.width} / ${map.height}` }}>
      <div
        className="absolute bg-[#173646]"
        style={{
          left: `${(map.water.x / map.width) * 100}%`,
          top: `${(map.water.y / map.height) * 100}%`,
          width: `${(map.water.w / map.width) * 100}%`,
          height: `${(map.water.h / map.height) * 100}%`,
        }}
      />
      {map.markers.map((marker) => (
        <span
          key={marker.id}
          className="absolute"
          style={{
            left: `${(marker.x / map.width) * 100}%`,
            top: `${(marker.y / map.height) * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span className="block h-2 w-2 rounded-full" style={{ background: marker.color }} />
          {detailed && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium text-[#f4f1ea]">
              {marker.label}
            </span>
          )}
        </span>
      ))}
      {pos && (
        <span
          className="absolute h-3 w-3 rounded-full border-2 border-[#e25b2a] bg-[#f4f1ea]"
          style={{
            left: `${(pos.x / map.width) * 100}%`,
            top: `${(pos.y / map.height) * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
      )}
    </div>
  );
}
