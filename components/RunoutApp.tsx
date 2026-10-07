"use client";

import { useEffect, useRef, useState } from "react";
import GameCanvas from "@/components/game/GameCanvas";
import Dashboard from "@/components/hud/Dashboard";
import GroceryCounter from "@/components/hud/GroceryCounter";
import Hud from "@/components/hud/Hud";
import IslandActions from "@/components/hud/IslandActions";
import IslandOffer from "@/components/hud/IslandOffer";
import ShopButton from "@/components/hud/ShopButton";
import StockDesk from "@/components/hud/StockDesk";
import { currentGame } from "@/game/createGame";
import { getMatch, orderIslands, setMatch, setPendingProfile, type IslandCard } from "@/game/mode/match";
import { primeAudio } from "@/game/audio/siren";
import { TUNING } from "@/game/tuning";
import { gameBus } from "@/lib/game/bus";
import type { CityProfile, GroceryShelf, HudSnapshot, MapSnapshot, SessionView, StockBook, WorldPos } from "@/lib/game/types";
import { localPlayerId, localUsername, playerHeaders, readSave, rememberUsername, writeSave } from "@/lib/online/player";

type Screen = "dashboard" | "play";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const initialHud: HudSnapshot = {
  cash: TUNING.startingCash,
  health: TUNING.playerHealth,
  maxHealth: TUNING.playerHealth,
  energy: TUNING.maxEnergy,
  maxEnergy: TUNING.maxEnergy,
  wanted: 0,
  maxWanted: TUNING.maxWanted,
  objective: "Drive or steal a ride, clock in at the port, or invest on the stock floor.",
  food: 0,
  employed: false,
  onShift: false,
  driving: false,
  gas: 0,
  maxGas: 100,
  businesses: [],
  vehicles: [],
};

function boot(mode: "single" | "multi", session: SessionView | null, username: string): void {
  const id = localPlayerId();
  const members = session?.members ?? [];
  const islands: IslandCard[] = orderIslands(
    members.map((member) => ({ ...member })),
    id,
  );
  setMatch({
    mode,
    autostart: true,
    playerId: id,
    username,
    code: session?.code ?? "",
    islands: mode === "multi" ? islands : [],
  });
  currentGame()?.scene.getScene("city")?.scene.restart();
}

export default function RunoutApp() {
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [username, setUsername] = useState("");
  const [hud, setHud] = useState<HudSnapshot>(initialHud);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [robbery, setRobbery] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [map, setMap] = useState<MapSnapshot | null>(null);
  const [pos, setPos] = useState<WorldPos | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [stocks, setStocks] = useState<StockBook | null>(null);
  const [grocery, setGrocery] = useState<GroceryShelf | null>(null);
  const [escapeMs, setEscapeMs] = useState<number | null>(null);
  const [session, setSession] = useState<SessionView | null>(null);
  const [offer, setOffer] = useState<{ id: string; username: string; worth: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [paused, setPaused] = useState(false);
  const [canReturn, setCanReturn] = useState(false);
  const [mode, setMode] = useState<"single" | "multi">("single");
  const hudRef = useRef(hud);
  hudRef.current = hud;
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    setUsername(localUsername());
    const unsub = [
      gameBus.on("hud", setHud),
      gameBus.on("prompt", setPrompt),
      gameBus.on("robbery", setRobbery),
      gameBus.on("banner", setBanner),
      gameBus.on("map", setMap),
      gameBus.on("pos", setPos),
      gameBus.on("map-toggle", () => setMapOpen((open) => !open)),
      gameBus.on("stocks", setStocks),
      gameBus.on("grocery", setGrocery),
      gameBus.on("escape", setEscapeMs),
      gameBus.on("island-offer", setOffer),
      gameBus.on("menu", () => {
        const single = modeRef.current === "single";
        if (single) currentGame()?.scene.pause("city");
        setPaused(single);
        setCanReturn(true);
        setScreen("dashboard");
      }),
    ];
    return () => {
      for (const off of unsub) off();
    };
  }, []);

  useEffect(() => {
    if (screen === "play" || !session || session.status !== "lobby") return;
    const code = session.code;
    const timer = window.setInterval(() => {
      void fetch(`/api/session?code=${code}`, { headers: playerHeaders() })
        .then((response) => response.json())
        .then((data: { session?: SessionView }) => {
          if (data.session?.status === "lobby") setSession(data.session);
        })
        .catch(() => undefined);
    }, 1200);
    return () => window.clearInterval(timer);
  }, [screen, session]);

  useEffect(() => {
    if (screen !== "play") return;
    const timer = window.setInterval(() => {
      const snap = hudRef.current;
      const body = JSON.stringify({
        cash: snap.cash,
        energy: snap.energy,
        employed: snap.employed,
        businesses: snap.businesses,
        vehicles: snap.vehicles,
      });
      writeSave(body);
      void fetch("/api/profile", { method: "POST", headers: playerHeaders(), body });
      const match = getMatch();
      if (match.mode === "multi" && match.code) {
        void fetch("/api/session", {
          method: "POST",
          headers: playerHeaders(),
          body: JSON.stringify({
            action: "sync",
            code: match.code,
            username: match.username,
            cash: snap.cash,
            businesses: snap.businesses,
            employed: snap.employed,
          }),
        })
          .then((response) => response.json())
          .then((data: { session?: SessionView; leading?: boolean }) => {
            if (!data.session) return;
            setSession(data.session);
            gameBus.emit("session", data.session);
            if (data.leading) gameBus.emit("banner", "FIRST");
          })
          .catch(() => undefined);
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [screen]);

  const saveName = async (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setNotice("Use at least 2 characters.");
      return;
    }
    const response = await fetch("/api/account", {
      method: "POST",
      headers: playerHeaders(),
      body: JSON.stringify({ username: trimmed }),
    });
    if (!response.ok) {
      setNotice("That username was not saved.");
      return;
    }
    rememberUsername(trimmed);
    setUsername(trimmed);
    setNotice("");
  };

  const resume = () => {
    primeAudio();
    if (paused) currentGame()?.scene.resume("city");
    setPaused(false);
    setCanReturn(false);
    setScreen("play");
  };

  const playSingle = async () => {
    primeAudio();
    setMode("single");
    setSession(null);
    setOffer(null);
    const saved = readSave();
    let profile: CityProfile | null = null;
    if (saved) {
      try {
        profile = JSON.parse(saved) as CityProfile;
      } catch {
        profile = null;
      }
    }
    setPendingProfile(profile);
    boot("single", null, username);
    setPaused(false);
    setCanReturn(false);
    setScreen("play");
  };

  const playMulti = (next: SessionView) => {
    setPendingProfile(null);
    if (next.status !== "live") {
      setSession(next);
      return;
    }
    primeAudio();
    setMode("multi");
    setSession(next);
    boot("multi", next, username);
    setPaused(false);
    setCanReturn(false);
    setScreen("play");
  };

  const createLobby = async () => {
    setNotice("");
    const response = await fetch("/api/session", {
      method: "POST",
      headers: playerHeaders(),
      body: JSON.stringify({ action: "create", username }),
    });
    const data = (await response.json()) as { session?: SessionView };
    if (!data.session) {
      setNotice("Could not open a session.");
      return;
    }
    setSession(data.session);
  };

  const joinLobby = async (code: string) => {
    setNotice("");
    const response = await fetch("/api/session", {
      method: "POST",
      headers: playerHeaders(),
      body: JSON.stringify({ action: "join", code, username }),
    });
    const data = (await response.json()) as { session?: SessionView };
    if (!data.session) {
      setNotice("That invite code is not open.");
      return;
    }
    setSession(data.session);
  };

  const startLobby = async () => {
    if (!session) return;
    const response = await fetch("/api/session", {
      method: "POST",
      headers: playerHeaders(),
      body: JSON.stringify({ action: "start", code: session.code, username }),
    });
    const data = (await response.json()) as { session?: SessionView };
    if (!data.session) {
      setNotice("Only the host can start.");
      return;
    }
    playMulti(data.session);
  };

  const sessionAction = async (action: "boat" | "reinforcement" | "island", targetId?: string) => {
    const match = getMatch();
    const response = await fetch("/api/session", {
      method: "POST",
      headers: playerHeaders(),
      body: JSON.stringify({
        action,
        code: match.code,
        username,
        cash: hudRef.current.cash,
        businesses: hudRef.current.businesses,
        employed: hudRef.current.employed,
        targetId,
      }),
    });
    const data = (await response.json()) as { session?: SessionView; reason?: string; leading?: boolean };
    if (!data.session) {
      gameBus.emit("banner", data.reason === "NEED CASH" ? "NEED CASH" : "NOT YET");
      return;
    }
    if (data.leading) gameBus.emit("banner", "FIRST");
    setSession(data.session);
    const mine = data.session.members.find((member) => member.id === localPlayerId());
    if (mine) {
      gameBus.emit("profile", {
        cash: mine.cash,
        energy: hudRef.current.energy,
        employed: hudRef.current.employed,
        businesses: hudRef.current.businesses,
        vehicles: hudRef.current.vehicles,
      });
    }
    gameBus.emit("session", data.session);
    if (action === "boat") gameBus.emit("spawn-boat");
    if (action === "island") setOffer(null);
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0e0f12]">
      <GameCanvas onReady={setReady} />
      {screen === "dashboard" && (
        <Dashboard
          ready={ready}
          clerkEnabled={clerkEnabled}
          username={username}
          canContinue={canReturn}
          session={session && session.status === "lobby" ? session : null}
          notice={notice}
          onUsername={(value) => void saveName(value)}
          onSingle={() => void playSingle()}
          onContinue={resume}
          onCreate={() => void createLobby()}
          onJoin={(code) => void joinLobby(code)}
          onStart={() => void startLobby()}
        />
      )}
      {screen === "play" && (
        <Hud
          hud={hud}
          prompt={prompt}
          robbery={robbery}
          banner={banner}
          escapeMs={escapeMs}
          map={map}
          pos={pos}
          mapOpen={mapOpen}
          onToggleMap={() => setMapOpen((open) => !open)}
        />
      )}
      {screen === "play" && <ShopButton onReward={(rewardId) => void grantReward(rewardId)} />}
      {screen === "play" && mode === "multi" && session && (
        <IslandActions
          session={session}
          playerId={localPlayerId()}
          onBoat={() => void sessionAction("boat")}
          onReinforce={() => void sessionAction("reinforcement")}
        />
      )}
      {screen === "play" && offer && (
        <IslandOffer
          username={offer.username}
          worth={offer.worth}
          onBuy={() => void sessionAction("island", offer.id)}
          onClose={() => setOffer(null)}
        />
      )}
      {screen === "play" && stocks && (
        <StockDesk book={stocks} onOrder={(order) => gameBus.emit("stock-order", order)} onClose={() => gameBus.emit("stocks-close")} />
      )}
      {screen === "play" && grocery && (
        <GroceryCounter
          shelf={grocery}
          onBuy={(index) => gameBus.emit("grocery-buy", index)}
          onBuyStore={() => gameBus.emit("grocery-store")}
          onClose={() => gameBus.emit("grocery-close")}
        />
      )}
    </main>
  );
}

async function grantReward(rewardId: string): Promise<void> {
  const response = await fetch("/api/shop", {
    method: "POST",
    headers: playerHeaders(),
    body: JSON.stringify({ rewardId }),
  });
  const data = (await response.json()) as { reward?: { multiplier: number; ms: number; cash: number } };
  if (data.reward) gameBus.emit("reward", data.reward);
}
