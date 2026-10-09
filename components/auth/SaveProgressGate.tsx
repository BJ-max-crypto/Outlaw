"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";

type SaveProgressGateProps = {
  onGuest: () => void;
};

/** Shown before the dashboard. An account is optional. */
export default function SaveProgressGate({ onGuest }: SaveProgressGateProps) {
  return (
    <div className="absolute inset-0 z-40 flex bg-[#0e0f12]/94">
      <div className="flex w-full flex-col justify-between overflow-y-auto p-8 sm:w-[36rem] sm:border-r sm:border-white/10 sm:p-12">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.42em] text-[#e25b2a]">RUNOUT</p>
          <h1 className="font-display mt-3 text-7xl leading-[0.82] text-[#f4f1ea] sm:text-8xl">Before you play</h1>
          <p className="mt-6 max-w-sm text-lg leading-snug text-[#d9d3c7]">If you want to save your progress, sign up or log in.</p>
          <div className="mt-8 flex flex-col items-start gap-3">
            <SignUpButton mode="modal">
              <button type="button" className="rounded-full bg-[#e25b2a] px-8 py-3 text-sm font-semibold tracking-[0.18em] text-[#1a0d08]">
                SIGN UP
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button type="button" className="rounded-full border border-[#d7c08a] px-8 py-3 text-sm font-semibold tracking-[0.18em] text-[#d7c08a]">
                LOG IN
              </button>
            </SignInButton>
            <button
              type="button"
              onClick={onGuest}
              className="mt-2 text-sm font-medium tracking-[0.12em] text-[#a39e94]"
            >
              PLAY WITHOUT AN ACCOUNT
            </button>
          </div>
        </div>
        <p className="mt-10 max-w-sm text-sm text-[#a39e94]">An account keeps your island when you come back. Without one, this visit stays on this browser.</p>
      </div>
    </div>
  );
}
