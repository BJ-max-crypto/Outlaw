"use client";

import { useEffect, useState } from "react";
import GameCanvas from "@/components/game/GameCanvas";
import Hud from "@/components/hud/Hud";
import MainMenu from "@/components/hud/MainMenu";
import ResultOverlay from "@/components/hud/ResultOverlay";
import { primeAudio } from "@/game/audio/siren";
import { gameBus } from "@/lib/game/bus";
import type { HeistResult, HudSnapshot } from "@/lib/game/types";
import { TUNING } from "@/game/tuning";

type Screen = "menu" | "play" | "complete" | "busted";

const initialHud: HudSnapshot = {
  cash: 0,
  health: TUNING.playerHealth,
  maxHealth: TUNING.playerHealth,
  wanted: 0,
  maxWanted: TUNING.maxWanted,
  objective: "Get into Quick Stop and hold E at the register.",
};

export default function RunoutApp() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const [hud, setHud] = useState<HudSnapshot>(initialHud);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [robbery, setRobbery] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [result, setResult] = useState<HeistResult | null>(null);

  useEffect(() => {
    const unsub = [
      gameBus.on("hud", setHud),
      gameBus.on("prompt", setPrompt),
      gameBus.on("robbery", setRobbery),
      gameBus.on("banner", setBanner),
      gameBus.on("complete", (next) => {
        setResult(next);
        setScreen("complete");
      }),
      gameBus.on("busted", (next) => {
        setResult(next);
        setScreen("busted");
      }),
    ];
    return () => {
      for (const off of unsub) off();
    };
  }, []);

  const playAgain = () => {
    setResult(null);
    setPrompt(null);
    setRobbery(0);
    setBanner(null);
    setScreen("play");
    gameBus.emit("restart");
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0e0f12]">
      <GameCanvas onReady={setReady} />
      {screen === "menu" && (
        <MainMenu
          ready={ready}
          onPlay={() => {
            primeAudio();
            setScreen("play");
            gameBus.emit("start");
          }}
        />
      )}
      {screen === "play" && <Hud hud={hud} prompt={prompt} robbery={robbery} banner={banner} />}
      {screen !== "menu" && screen !== "play" && result && (
        <ResultOverlay kind={screen} result={result} onAgain={playAgain} />
      )}
    </main>
  );
}
