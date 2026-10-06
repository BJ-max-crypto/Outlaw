"use client";

import { SignInButton, SignUpButton, UserButton, useAuth } from "@clerk/nextjs";

type OnlinePanelProps = {
  ready: boolean;
  onPlay: () => void;
};

export default function OnlinePanel({ ready, onPlay }: OnlinePanelProps) {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <div className="mt-4 flex flex-col items-start gap-3">
      {!isLoaded && <p className="text-sm tracking-[0.16em] text-[#a39e94]">CHECKING ACCOUNT</p>}
      {isLoaded && !isSignedIn && (
        <>
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold tracking-[0.16em] text-[#f4f1ea]"
            >
              SIGN IN
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button type="button" className="text-sm font-medium tracking-[0.12em] text-[#d7c08a]">
              CREATE ACCOUNT
            </button>
          </SignUpButton>
          <p className="max-w-sm text-sm text-[#a39e94]">An account is required to play online.</p>
        </>
      )}
      {isLoaded && isSignedIn && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onPlay}
            disabled={!ready}
            className="rounded-full border border-[#d7c08a] px-6 py-2.5 text-sm font-semibold tracking-[0.16em] text-[#d7c08a] disabled:opacity-60"
          >
            PLAY ONLINE
          </button>
          <UserButton />
        </div>
      )}
    </div>
  );
}
