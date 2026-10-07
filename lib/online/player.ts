const ID_KEY = "runout-player";
const NAME_KEY = "runout-username";
const SAVE_KEY = "runout-save";

export function localPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(ID_KEY, id);
  }
  return id;
}

export function localUsername(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NAME_KEY) ?? "";
}

export function rememberUsername(username: string): void {
  window.localStorage.setItem(NAME_KEY, username);
}

export function playerHeaders(): HeadersInit {
  return { "content-type": "application/json", "x-runout-player": localPlayerId() };
}

export function readSave(): string | null {
  return window.localStorage.getItem(SAVE_KEY);
}

export function writeSave(payload: string): void {
  window.localStorage.setItem(SAVE_KEY, payload);
}
