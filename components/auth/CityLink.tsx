"use client";

import { useUser } from "@clerk/nextjs";
import type { HudSnapshot } from "@/lib/game/types";
import { useCityLink } from "@/lib/online/useCityLink";

export default function CityLink({ hud }: { hud: HudSnapshot }) {
  const { user } = useUser();
  const name = user?.fullName || user?.username || "Runner";
  useCityLink(true, user?.id ?? null, name, hud);
  return null;
}
