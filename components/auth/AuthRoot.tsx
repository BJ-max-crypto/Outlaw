"use client";

import { useEffect, useState } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { PlayerIdentityProvider } from "@/lib/online/identity";
import { localPlayerId } from "@/lib/online/player";

const appearance = {
  variables: {
    colorPrimary: "#e25b2a",
    colorBackground: "#16181d",
    colorText: "#f4f1ea",
    colorInputBackground: "#0e0f12",
    colorInputText: "#f4f1ea",
  },
};

export default function AuthRoot({ children }: { children: React.ReactNode }) {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return <GuestIdentity>{children}</GuestIdentity>;
  return (
    <ClerkProvider publishableKey={key} appearance={appearance}>
      <ClerkIdentity>{children}</ClerkIdentity>
    </ClerkProvider>
  );
}

function GuestIdentity({ children }: { children: React.ReactNode }) {
  const [id, setId] = useState("");
  useEffect(() => {
    setId(localPlayerId());
  }, []);
  return (
    <PlayerIdentityProvider value={{ id, loaded: id.length > 0, signedIn: true }}>
      {children}
    </PlayerIdentityProvider>
  );
}

function ClerkIdentity({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [guestId, setGuestId] = useState("");
  useEffect(() => {
    setGuestId(localPlayerId());
  }, []);
  const accountId = isSignedIn && userId ? userId : "";
  const id = accountId || guestId;
  return (
    <PlayerIdentityProvider value={{ id, loaded: Boolean(isLoaded) && id.length > 0, signedIn: Boolean(accountId) }}>
      {children}
    </PlayerIdentityProvider>
  );
}
