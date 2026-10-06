export type HudSnapshot = {
  cash: number;
  health: number;
  maxHealth: number;
  wanted: number;
  maxWanted: number;
  objective: string;
};

export type HeistResult = {
  earned: number;
  total: number;
  seized: number;
};

export type GameEventMap = {
  start: undefined;
  restart: undefined;
  hud: HudSnapshot;
  prompt: string | null;
  robbery: number;
  banner: string | null;
  complete: HeistResult;
  busted: HeistResult;
};
