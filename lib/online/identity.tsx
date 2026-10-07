"use client";

import { createContext, useContext } from "react";

export type PlayerIdentity = {
  id: string;
  loaded: boolean;
  signedIn: boolean;
};

const PlayerIdentityContext = createContext<PlayerIdentity>({
  id: "",
  loaded: false,
  signedIn: false,
});

export function PlayerIdentityProvider({ value, children }: { value: PlayerIdentity; children: React.ReactNode }) {
  return <PlayerIdentityContext.Provider value={value}>{children}</PlayerIdentityContext.Provider>;
}

export function usePlayerIdentity(): PlayerIdentity {
  return useContext(PlayerIdentityContext);
}
