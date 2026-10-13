"use client";

import dynamic from "next/dynamic";

const OutrunApp = dynamic(() => import("@/components/outrun/OutrunApp"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-[#070b10] text-sm tracking-[0.28em] text-[#a39e94]">
      LOADING OUTRUN
    </div>
  ),
});

export default function HomePage() {
  return <OutrunApp />;
}
