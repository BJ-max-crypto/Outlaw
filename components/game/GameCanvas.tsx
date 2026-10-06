"use client";

import { useEffect, useRef } from "react";

type GameCanvasProps = {
  onReady: (ready: boolean) => void;
};

export default function GameCanvas({ onReady }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    let destroyed = false;
    let game: { destroy: (removeCanvas: boolean) => void } | null = null;

    (async () => {
      const { createGame } = await import("@/game/createGame");
      if (destroyed || !hostRef.current) return;
      game = createGame(hostRef.current);
      onReadyRef.current(true);
    })();

    return () => {
      destroyed = true;
      onReadyRef.current(false);
      game?.destroy(true);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="absolute inset-0"
      onPointerDown={() => {
        hostRef.current?.querySelector("canvas")?.focus();
      }}
    />
  );
}
