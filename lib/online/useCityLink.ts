"use client";

import { useEffect, useRef } from "react";
import { gameBus } from "@/lib/game/bus";
import type { HudSnapshot, Peer } from "@/lib/game/types";
import { getSupabase } from "@/lib/supabase/client";

export function useCityLink(
  active: boolean,
  userId: string | null,
  name: string,
  hud: HudSnapshot,
  accessToken?: () => Promise<string | null>,
): void {
  const hudRef = useRef(hud);
  hudRef.current = hud;
  const pos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    return gameBus.on("pos", (next) => {
      pos.current = next;
    });
  }, []);

  useEffect(() => {
    if (!active || !userId) return;
    const supabase = getSupabase(accessToken);
    if (!supabase) return;

    const channel = supabase.channel("runout-city");
    const peers = new Map<string, Peer>();
    channel.on("broadcast", { event: "move" }, ({ payload }) => {
      const peer = payload as Peer;
      if (!peer?.id || peer.id === userId) return;
      peers.set(peer.id, peer);
      const now = Date.now();
      for (const [id, row] of peers) {
        if (now - row.at > 4000) peers.delete(id);
      }
      gameBus.emit("peers", [...peers.values()]);
    });
    void channel.subscribe();

    const send = window.setInterval(() => {
      void channel.send({
        type: "broadcast",
        event: "move",
        payload: { id: userId, name, x: pos.current.x, y: pos.current.y, at: Date.now() },
      });
    }, 200);

    const save = window.setInterval(() => {
      const snap = hudRef.current;
      void fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cash: snap.cash,
          energy: snap.energy,
          employed: snap.employed,
          businesses: snap.businesses,
          vehicles: snap.vehicles,
        }),
      });
    }, 8000);

    return () => {
      window.clearInterval(send);
      window.clearInterval(save);
      gameBus.emit("peers", []);
      void supabase.removeChannel(channel);
    };
  }, [active, userId, name, accessToken]);
}
