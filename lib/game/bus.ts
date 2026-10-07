import type { GameEventMap } from "./types";

type Handler<T> = (payload: T) => void;

class GameBus {
  private listeners = new Map<string, Set<Handler<unknown>>>();

  on<K extends keyof GameEventMap>(
    type: K,
    handler: Handler<GameEventMap[K]>,
  ): () => void {
    let bucket = this.listeners.get(type);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(type, bucket);
    }
    bucket.add(handler as Handler<unknown>);
    return () => {
      bucket.delete(handler as Handler<unknown>);
    };
  }

  emit<K extends keyof GameEventMap>(
    type: K,
    ...args: GameEventMap[K] extends undefined ? [] : [GameEventMap[K]]
  ): void {
    const bucket = this.listeners.get(type);
    if (!bucket) return;
    const payload = args[0] as GameEventMap[K];
    for (const handler of bucket) {
      (handler as Handler<GameEventMap[K]>)(payload);
    }
  }
}

export const gameBus = new GameBus();
