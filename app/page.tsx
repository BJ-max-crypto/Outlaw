"use client";

import dynamic from "next/dynamic";

const RunoutApp = dynamic(() => import("@/components/RunoutApp"), {
  ssr: false,
  loading: () => (
    <div className="flex h-dvh items-center justify-center bg-[#0e0f12] text-sm tracking-[0.28em] text-[#a39e94]">
      LOADING RUNOUT
    </div>
  ),
});

export default function HomePage() {
  return <RunoutApp />;
}
