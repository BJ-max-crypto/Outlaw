import type { HeistPhase } from "@/game/state/HeistState";

export function interactionPrompt(input: {
  inRobberyZone: boolean;
  nearGetaway: boolean;
  robbed: boolean;
  phase: HeistPhase;
}): string | null {
  if (input.phase === "complete" || input.phase === "busted" || input.phase === "idle") {
    return null;
  }
  if (!input.robbed && input.inRobberyZone) return "HOLD E TO ROB";
  if (input.robbed && input.nearGetaway && input.phase === "escaping") return "GET IN THE VAN";
  return null;
}
