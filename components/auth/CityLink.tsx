"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import type { HudSnapshot } from "@/lib/game/types";
import { useCityLink } from "@/lib/online/useCityLink";

export default function CityLink({ hud }: { hud: HudSnapshot }) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const name = user?.fullName || user?.username || "Runner";
  useCityLink(true, user?.id ?? null, name, hud, () => getToken());
  return null;
}
