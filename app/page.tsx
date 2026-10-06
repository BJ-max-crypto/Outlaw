"use client";

import dynamic from "next/dynamic";

const OutlawApp = dynamic(() => import("@/components/OutlawApp"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-[#0e0f12] text-sm tracking-[0.28em] text-[#a39e94]">
      LOADING HEIST
    </div>
  ),
});

export default function HomePage() {
  return <OutlawApp />;
}
