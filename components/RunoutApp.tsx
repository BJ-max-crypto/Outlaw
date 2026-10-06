"use client";

import { useEffect, useState } from "react";
import CityLink from "@/components/auth/CityLink";
import GameCanvas from "@/components/game/GameCanvas";
import Hud from "@/components/hud/Hud";
import MainMenu from "@/components/hud/MainMenu";
import StockDesk from "@/components/hud/StockDesk";
import { primeAudio } from "@/game/audio/siren";
import { TUNING } from "@/game/tuning";
import { gameBus } from "@/lib/game/bus";
import type { CityProfile, HudSnapshot, MapSnapshot, StockBook, WorldPos } from "@/lib/game/types";

type Screen = "menu" | "play";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const initialHud: HudSnapshot = {
  cash: TUNING.startingCash,
  health: TUNING.playerHealth,
  maxHealth: TUNING.playerHealth,
  energy: TUNING.maxEnergy,
  maxEnergy: TUNING.maxEnergy,
  wanted: 0,
  maxWanted: TUNING.maxWanted,
  objective: "Drive or steal a ride, work the port, or invest on the stock floor.",
  food: 0,
  employed: false,
  businesses: [],
  vehicles: [],
};

async function loadProfile(): Promise<CityProfile | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch("/api/profile", { signal: controller.signal });
    if (!response.ok) return null;
    const data = (await response.json()) as { profile?: CityProfile | null };
    return data.profile ?? null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export default function RunoutApp() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("menu");
  const [online, setOnline] = useState(false);
  const [hud, setHud] = useState<HudSnapshot>(initialHud);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [robbery, setRobbery] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [map, setMap] = useState<MapSnapshot | null>(null);
  const [pos, setPos] = useState<WorldPos | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [stocks, setStocks] = useState<StockBook | null>(null);

  useEffect(() => {
    const unsub = [
      gameBus.on("hud", setHud),
      gameBus.on("prompt", setPrompt),
      gameBus.on("robbery", setRobbery),
      gameBus.on("banner", setBanner),
      gameBus.on("map", setMap),
      gameBus.on("pos", setPos),
      gameBus.on("map-toggle", () => setMapOpen((open) => !open)),
      gameBus.on("stocks", setStocks),
    ];
    return () => {
      for (const off of unsub) off();
    };
  }, []);

  const enter = () => {
    primeAudio();
    setScreen("play");
    gameBus.emit("start");
  };

  const enterOnline = async () => {
    const profile = await loadProfile();
    if (profile) gameBus.emit("profile", profile);
    setOnline(true);
    enter();
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0e0f12]">
      <GameCanvas onReady={setReady} />
      {screen === "menu" && (
        <MainMenu ready={ready} clerkEnabled={clerkEnabled} onPlay={enter} onPlayOnline={() => void enterOnline()} />
      )}
      {screen === "play" && (
        <Hud
          hud={hud}
          prompt={prompt}
          robbery={robbery}
          banner={banner}
          map={map}
          pos={pos}
          mapOpen={mapOpen}
          onToggleMap={() => setMapOpen((open) => !open)}
        />
      )}
      {screen === "play" && stocks && (
        <StockDesk
          book={stocks}
          onOrder={(order) => gameBus.emit("stock-order", order)}
          onClose={() => gameBus.emit("stocks-close")}
        />
      )}
      {screen === "play" && online && clerkEnabled && <CityLink hud={hud} />}
    </main>
  );
}
