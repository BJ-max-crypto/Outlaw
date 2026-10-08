const ID_KEY = "runout-player";
const NAME_KEY = "runout-username";
const SAVE_KEY = "runout-save";
const SESSION_KEY = "runout-session";

export function localPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function localUsername(playerId = ""): string {
  if (typeof window === "undefined") return "";
  if (playerId) {
    const scoped = window.localStorage.getItem(`${NAME_KEY}:${playerId}`);
    if (scoped) return scoped;
    if (playerId.startsWith("user_")) return "";
  }
  return window.localStorage.getItem(NAME_KEY) ?? "";
}

export function rememberUsername(username: string, playerId = ""): void {
  if (playerId) window.localStorage.setItem(`${NAME_KEY}:${playerId}`, username);
  if (!playerId.startsWith("user_")) window.localStorage.setItem(NAME_KEY, username);
}

export function rememberSession(code: string): void {
  if (typeof window === "undefined") return;
  const next = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(next)) return;
  window.localStorage.setItem(SESSION_KEY, next);
}

export function readSessionCode(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SESSION_KEY) ?? "";
}

export function forgetSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function playerHeaders(playerId = ""): HeadersInit {
  const id = playerId || localPlayerId();
  return { "content-type": "application/json", "x-runout-player": id };
}

function saveKey(playerId: string): string {
  return playerId.startsWith("user_") ? `${SAVE_KEY}:${playerId}` : SAVE_KEY;
}

export function readSave(playerId = ""): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(saveKey(playerId));
}

export function writeSave(payload: string, playerId = ""): void {
  window.localStorage.setItem(saveKey(playerId), payload);
}
