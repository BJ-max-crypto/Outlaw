import type { MissionHud, MissionResult } from "./types";

export type OutrunEventMap = {
  ready: undefined;
  hud: MissionHud;
  "mission-start": undefined;
  "mission-abort": undefined;
  pause: undefined;
  resume: undefined;
  result: MissionResult;
};

type Handler<T> = (payload: T) => void;

class OutrunBus {
  private listeners = new Map<string, Set<Handler<unknown>>>();

  on<K extends keyof OutrunEventMap>(type: K, handler: Handler<OutrunEventMap[K]>): () => void {
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

  emit<K extends keyof OutrunEventMap>(
    type: K,
    ...args: OutrunEventMap[K] extends undefined ? [] : [OutrunEventMap[K]]
  ): void {
    const bucket = this.listeners.get(type);
    if (!bucket) return;
    const payload = args[0] as OutrunEventMap[K];
    for (const handler of bucket) (handler as Handler<OutrunEventMap[K]>)(payload);
  }
}

export const outrunBus = new OutrunBus();
