let shared: AudioContext | null = null;

/** A short coin blip. Bigger paydays climb a few notes. */
export function coinChime(rich = false): void {
  const ctx = shared;
  if (!ctx) return;
  void ctx.resume();
  const now = ctx.currentTime;
  const notes = rich ? [523, 659, 784, 1046] : [740, 988];
  for (let index = 0; index < notes.length; index += 1) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + index * (rich ? 0.045 : 0.03);
    osc.type = "sine";
    osc.frequency.value = notes[index];
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(rich ? 0.05 : 0.028, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + (rich ? 0.16 : 0.09));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  }
}

export function primeAudio(): void {
  const Context = window.AudioContext;
  if (!shared) shared = new Context();
  void shared.resume();
}

/**
 * Short two-tone siren. Quiet on purpose so the chase stays readable.
 */
export class Siren {
  private oscA: OscillatorNode | null = null;
  private oscB: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private elapsed = 0;
  running = false;

  start(): void {
    if (this.running) return;
    const ctx = shared ?? new AudioContext();
    shared = ctx;
    void ctx.resume();

    this.gain = ctx.createGain();
    this.gain.gain.value = 0.018;
    this.gain.connect(ctx.destination);

    this.oscA = ctx.createOscillator();
    this.oscB = ctx.createOscillator();
    this.oscA.type = "sine";
    this.oscB.type = "triangle";
    this.oscA.frequency.value = 620;
    this.oscB.frequency.value = 780;
    this.oscA.connect(this.gain);
    this.oscB.connect(this.gain);
    this.oscA.start();
    this.oscB.start();
    this.running = true;
    this.elapsed = 0;
  }

  update(delta: number): void {
    if (!this.running || !this.oscA || !this.oscB) return;
    this.elapsed += delta;
    const high = Math.floor(this.elapsed / 380) % 2 === 0;
    this.oscA.frequency.value = high ? 640 : 480;
    this.oscB.frequency.value = high ? 810 : 620;
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    try {
      this.oscA?.stop();
      this.oscB?.stop();
    } catch {
      // Oscillators can already be stopped during scene teardown.
    }
    this.oscA?.disconnect();
    this.oscB?.disconnect();
    this.gain?.disconnect();
    this.oscA = null;
    this.oscB = null;
    this.gain = null;
  }
}
