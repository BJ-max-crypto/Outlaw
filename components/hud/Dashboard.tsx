"use client";

import { useState } from "react";
import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";
import type { SessionView } from "@/lib/game/types";

type DashboardProps = {
  ready: boolean;
  clerkEnabled: boolean;
  /** Continued from the entry screen without an account. */
  guestPlay: boolean;
  username: string;
  canContinue: boolean;
  session: SessionView | null;
  selfId: string;
  notice: string;
  onUsername: (username: string) => void;
  onSingle: () => void;
  onContinue: () => void;
  onCreate: () => void;
  onJoin: (code: string) => void;
  onStart: () => void;
};

export default function Dashboard(props: DashboardProps) {
  if (props.clerkEnabled) return <ClerkDashboard {...props} />;
  return <DashboardBody {...props} loaded signedIn account={false} />;
}

function ClerkDashboard(props: DashboardProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const account = Boolean(isLoaded && isSignedIn);
  return <DashboardBody {...props} loaded={isLoaded} signedIn={isLoaded && (account || props.guestPlay)} account={account} />;
}

function DashboardBody({
  ready,
  clerkEnabled,
  username,
  canContinue,
  session,
  selfId,
  notice,
  onUsername,
  onSingle,
  onContinue,
  onCreate,
  onJoin,
  onStart,
  loaded,
  signedIn,
  account,
}: DashboardProps & { loaded: boolean; signedIn: boolean; account: boolean }) {
  const [draft, setDraft] = useState(username);
  const [code, setCode] = useState("");
  const named = username.trim().length >= 2;

  return (
    <div className="absolute inset-0 z-30 flex bg-[#0e0f12]/94">
      <div className="flex w-full flex-col justify-between overflow-y-auto p-8 sm:w-[36rem] sm:border-r sm:border-white/10 sm:p-12">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.42em] text-[#e25b2a]">RUNOUT</p>
          <h1 className="font-display mt-3 text-7xl leading-[0.82] text-[#f4f1ea] sm:text-8xl">Dashboard</h1>
          <p className="mt-6 max-w-sm text-lg leading-snug text-[#d9d3c7]">
            Play your island alone, or open a session and try to buy the others out.
          </p>

          {clerkEnabled && !loaded && <p className="mt-8 text-sm tracking-[0.16em] text-[#a39e94]">CHECKING ACCOUNT</p>}

          {signedIn && !named && (
            <form
              className="mt-8 flex flex-col items-start gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                onUsername(draft);
              }}
            >
              <label className="text-[11px] font-semibold tracking-[0.28em] text-[#a39e94]" htmlFor="username">
                USERNAME
              </label>
              <input
                id="username"
                value={draft}
                maxLength={16}
                onChange={(event) => setDraft(event.target.value)}
                className="w-full rounded-2xl border border-white/15 bg-black/30 px-4 py-3 text-[#f4f1ea] outline-none"
                placeholder="Your name on the island"
              />
              <button type="submit" className="rounded-full bg-[#e25b2a] px-8 py-3 text-sm font-semibold tracking-[0.18em] text-[#1a0d08]">
                SAVE NAME
              </button>
            </form>
          )}

          {signedIn && named && (
            <div className="mt-8 flex flex-col items-start gap-3">
              <p className="text-sm tracking-[0.16em] text-[#d7c08a]">{username}</p>
              {canContinue && (
                <button type="button" onClick={onContinue} className="rounded-full border border-white/15 px-8 py-3 text-sm font-semibold tracking-[0.18em] text-[#f4f1ea]">
                  CONTINUE
                </button>
              )}
              <button
                type="button"
                onClick={onSingle}
                disabled={!ready}
                className="rounded-full bg-[#e25b2a] px-8 py-3 text-sm font-semibold tracking-[0.18em] text-[#1a0d08] disabled:opacity-60"
              >
                SINGLEPLAYER
              </button>
              <button
                type="button"
                onClick={onCreate}
                disabled={!ready}
                className="rounded-full border border-[#d7c08a] px-8 py-3 text-sm font-semibold tracking-[0.18em] text-[#d7c08a] disabled:opacity-60"
              >
                MULTIPLAYER
              </button>
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  onJoin(code);
                }}
              >
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  maxLength={4}
                  aria-label="Invite code"
                  placeholder="CODE"
                  className="w-28 rounded-full border border-white/15 bg-black/30 px-4 py-3 text-center tracking-[0.2em] text-[#f4f1ea] outline-none"
                />
                <button type="submit" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold tracking-[0.16em] text-[#f4f1ea]">
                  JOIN
                </button>
              </form>
              {account && (
                <div className="pt-2">
                  <UserButton />
                </div>
              )}
              {clerkEnabled && !account && (
                <div className="mt-2 flex flex-col items-start gap-2">
                  <p className="max-w-sm text-sm text-[#a39e94]">If you want to save your progress, sign up or log in.</p>
                  <div className="flex gap-4">
                    <SignUpButton mode="modal">
                      <button type="button" className="text-sm font-medium tracking-[0.12em] text-[#d7c08a]">
                        SIGN UP
                      </button>
                    </SignUpButton>
                    <SignInButton mode="modal">
                      <button type="button" className="text-sm font-medium tracking-[0.12em] text-[#d7c08a]">
                        LOG IN
                      </button>
                    </SignInButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {session && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-black/30 p-4">
              <p className="text-[11px] font-semibold tracking-[0.28em] text-[#a39e94]">INVITE CODE</p>
              <p className="font-display mt-1 text-5xl text-[#f4f1ea]">{session.code}</p>
              <ul className="mt-3 space-y-1 text-sm text-[#d9d3c7]">
                {session.members.map((member) => (
                  <li key={member.id}>
                    {member.username}
                    {member.id === session.hostId ? " · HOST" : ""}
                  </li>
                ))}
              </ul>
              {session.status === "lobby" && session.hostId === selfId && (
                <button type="button" onClick={onStart} className="mt-4 rounded-full bg-[#f4f1ea] px-6 py-2 text-sm font-semibold tracking-[0.16em] text-[#17191e]">
                  START GAME
                </button>
              )}
              {session.status === "lobby" && session.hostId !== selfId && (
                <p className="mt-4 text-sm text-[#a39e94]">Waiting for the host to start.</p>
              )}
            </div>
          )}

          {notice && <p className="mt-4 text-sm text-[#e7b8a4]">{notice}</p>}
        </div>
        <p className="mt-10 max-w-sm text-sm text-[#a39e94]">Singleplayer: buy islands across the ocean and collect their pay. Multiplayer is a private server. Get past each friend's reinforcements and buy every island to win.</p>
      </div>
    </div>
  );
}
