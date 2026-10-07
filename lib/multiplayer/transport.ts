/**
 * Seam for a later realtime layer. The prototype does not connect to a server.
 * A transport can publish these events without the heist systems knowing the host.
 */
export type NetEvent =
  | { type: "player:move"; id: string; x: number; y: number; facing: Facing }
  | { type: "heist:alarm"; take: number }
  | { type: "heist:escape"; id: string; take: number }
  | { type: "heist:busted"; id: string };

export type Facing = "n" | "s" | "e" | "w";

export interface RealtimeTransport {
  connect(sessionId: string): Promise<void>;
  send(event: NetEvent): void;
  onEvent(handler: (event: NetEvent) => void): () => void;
}

export class LocalLoopbackTransport implements RealtimeTransport {
  async connect(): Promise<void> {}

  send(): void {}

  onEvent(): () => void {
    return () => {};
  }
}
