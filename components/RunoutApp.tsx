"use client";

import { useEffect, useRef, useState } from "react";
import GameCanvas from "@/components/game/GameCanvas";
import Dashboard from "@/components/hud/Dashboard";
import DepthLayer, { type BoardName, type DepthPanel } from "@/components/hud/DepthLayer";
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
import type { EconomyView } from "@/lib/economy/model";
import type { CityProfile, GroceryShelf, HudSnapshot, MapSnapshot, SessionView, StockBook, StockOrder, WorldPos } from "@/lib/game/types";
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
  netWorth: TUNING.startingCash,
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
  const [view, setView] = useState<EconomyView | null>(null);
  const [subject, setSubject] = useState<EconomyView | null>(null);
  const [panel, setPanel] = useState<DepthPanel>(null);
  const [spot, setSpot] = useState<{ id: string; name: string } | null>(null);
  const [board, setBoard] = useState<BoardName>("netWorth");
  const [rows, setRows] = useState<{ id: string; username: string; value: number }[]>([]);
  const [selfRank, setSelfRank] = useState<number | null>(null);
  const hudRef = useRef(hud);
  hudRef.current = hud;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const viewRef = useRef<EconomyView | null>(null);
  const usernameRef = useRef(username);
  usernameRef.current = username;
  const tail = useRef(Promise.resolve());
  const hudAt = useRef(0);
  const playAt = useRef(0);
  const postRef = useRef<(extra: Record<string, unknown>, quiet: boolean) => Promise<void>>(async () => undefined);
  const playMultiRef = useRef<(next: SessionView) => void>(() => undefined);
  const liveBoot = useRef("");

  useEffect(() => {
    setUsername(localUsername());
    const unsub = [
      gameBus.on("hud", (next) => {
        hudAt.current = Date.now();
        setHud(next);
      }),
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
      gameBus.on("owned-spot", setSpot),
      gameBus.on("business-buy", (id) => {
        void postRef.current({ action: "buy-business", businessId: id }, false);
      }),
      gameBus.on("stock-order", (order: StockOrder) => {
        void postRef.current({ action: "trade", stockId: order.id, quantity: order.quantity, side: order.side }, false);
      }),
      gameBus.on("visit-port", () => {
        void postRef.current({ action: "visit" }, true);
      }),
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
    let stopped = false;
    const tick = () => {
      void fetch(`/api/session?code=${code}`, { headers: playerHeaders() })
        .then((response) => response.json())
        .then((data: { session?: SessionView }) => {
          if (stopped || !data.session) return;
          if (data.session.status === "live") {
            stopped = true;
            playMultiRef.current(data.session);
            return;
          }
          setSession(data.session);
        })
        .catch(() => undefined);
    };
    tick();
    const timer = window.setInterval(tick, 600);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [screen, session?.code, session?.status]);

  useEffect(() => {
    if (screen !== "play") return;
    const timer = window.setInterval(() => {
      void postRef.current({ action: "sync" }, true);
      const snap = hudRef.current;
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
    const kick = window.setTimeout(() => {
      void postRef.current({ action: "sync" }, true);
    }, 700);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(kick);
    };
  }, [screen]);

  useEffect(() => {
    if (panel !== "ranks") return;
    void fetch(`/api/leaderboard?board=${board}`, { headers: playerHeaders() })
      .then((response) => response.json())
      .then((data: { rows?: { id: string; username: string; value: number }[]; rank?: number | null }) => {
        setRows(data.rows ?? []);
        setSelfRank(data.rank ?? null);
      })
      .catch(() => undefined);
  }, [panel, board, view?.netWorth, view?.cash]);

  const wallet = (): HudSnapshot => {
    const snap = hudRef.current;
    const saved = readBlob();
    const live = playAt.current > 0 && hudAt.current >= playAt.current;
    if (!live && saved) {
      return {
        ...snap,
        cash: saved.cash,
        energy: saved.energy,
        employed: saved.employed,
        businesses: saved.businesses ?? [],
        vehicles: saved.vehicles ?? [],
      };
    }
    return snap;
  };

  const openPlayer = async (id: string) => {
    if (id === localPlayerId()) {
      setSubject(null);
      setPanel("profile");
      return;
    }
    const response = await fetch(`/api/leaderboard?player=${encodeURIComponent(id)}`);
    const data = (await response.json()) as { profile?: EconomyView | null };
    if (!data.profile) return;
    setSubject(data.profile);
    setPanel("profile");
  };

  const postEconomy = (extra: Record<string, unknown>, quiet: boolean): Promise<void> => {
    const run = tail.current.then(async () => {
      try {
      const snap = wallet();
      const saved = readBlob();
      const economy = viewRef.current;
      const response = await fetch("/api/economy", {
        method: "POST",
        headers: playerHeaders(),
        body: JSON.stringify({
          username: usernameRef.current,
          cash: snap.cash,
          energy: snap.energy,
          employed: snap.employed,
          onShift: snap.onShift,
          businesses: snap.businesses,
          vehicles: snap.vehicles,
          levels: economy?.levels ?? saved?.levels,
          shares: economy?.shares ?? saved?.shares,
          basis: economy?.basis ?? saved?.basis,
          items: economy ? economy.items.map((item) => item.id) : saved?.items,
          stockProfit: economy?.realized ?? saved?.stockProfit,
          objectivesDone: economy?.objectivesDone ?? saved?.objectivesDone,
          ...extra,
        }),
      });
      const data = (await response.json()) as { view?: EconomyView; reason?: string };
      if (data.view) {
        viewRef.current = data.view;
        setView(data.view);
        if (subject && subject.username === data.view.username) setSubject(data.view);
        gameBus.emit("ledger", data.view);
        writeSave(
          JSON.stringify({
            cash: data.view.cash,
            energy: snap.energy,
            employed: snap.employed,
            businesses: data.view.businesses.map((business) => business.id),
            vehicles: snap.vehicles,
            levels: data.view.levels,
            shares: data.view.shares,
            basis: data.view.basis,
            items: data.view.items.map((item) => item.id),
            stockProfit: data.view.realized,
            objectivesDone: data.view.objectivesDone,
          }),
        );
      }
      if (!response.ok && !quiet) gameBus.emit("ledger-deny", data.reason ?? "NOT YET");
      } catch {
        if (!quiet) gameBus.emit("ledger-deny", "NOT YET");
      }
    });
    tail.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
  postRef.current = postEconomy;

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
    playAt.current = Date.now();
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
    if (liveBoot.current === next.code) return;
    liveBoot.current = next.code;
    primeAudio();
    playAt.current = Date.now();
    setMode("multi");
    setSession(next);
    boot("multi", next, usernameRef.current || username);
    setPaused(false);
    setCanReturn(false);
    setScreen("play");
  };
  playMultiRef.current = playMulti;

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
    if (!session || session.hostId !== localPlayerId()) return;
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
          selfId={localPlayerId()}
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
          onPanel={(next) => {
            setSubject(null);
            setPanel(next);
          }}
        />
      )}
      {screen === "play" && (
        <DepthLayer
          view={panel === "profile" && subject ? subject : view}
          panel={panel}
          spot={spot}
          board={board}
          rows={rows}
          selfRank={selfRank}
          onPanel={(next) => {
            setSubject(null);
            setPanel(next);
          }}
          onBoard={setBoard}
          onUpgrade={(id) => void postEconomy({ action: "upgrade", businessId: id }, false)}
          onClaimGoal={(id) => void postEconomy({ action: "claim-objective", businessId: id }, false)}
          onClaimEvent={(id) => void postEconomy({ action: "claim-event", eventId: id }, false)}
          onOpenPlayer={(id) => void openPlayer(id)}
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

function readBlob(): CityProfile | null {
  const raw = readSave();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CityProfile;
    if (!Number.isFinite(parsed.cash)) return null;
    return parsed;
  } catch {
    return null;
  }
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
