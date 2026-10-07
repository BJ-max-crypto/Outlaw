type BreakStatus =
  | "viewed"
  | "dismissed"
  | "notReady"
  | "timeout"
  | "invalid"
  | "error"
  | "noAdPreloaded"
  | "frequencyCapped"
  | "ignored"
  | "other"
  | "";

type AdBreakOptions = {
  type: "reward";
  name: string;
  beforeAd?: () => void;
  beforeReward?: (showAdFn: () => void) => void;
  adViewed?: () => void;
  adDismissed?: () => void;
  adBreakDone?: (info: { breakStatus: BreakStatus }) => void;
};

type AdBreak = (options: AdBreakOptions) => void;

declare global {
  interface Window {
    adBreak?: AdBreak;
    adConfig?: (options: Record<string, unknown>) => void;
    adsbygoogle?: unknown[];
  }
}

export type AdResult = "viewed" | "skipped" | "unavailable";

const AD_WAIT_MS = 120_000;
const RETRYABLE = new Set(["noAdPreloaded", "notReady", "timeout", "other"]);

function revealGame(): void {
  document.documentElement.classList.remove("ad-showing");
}

function coverForAd(): void {
  document.documentElement.classList.add("ad-showing");
}

/** Plays `count` AdSense rewarded placements. A video counts only after it is viewed. */
export function watchAds(
  count: number,
  hooks?: { onStart?: () => void; onEnd?: () => void; onProgress?: (index: number, total: number) => void },
): Promise<AdResult> {
  const total = Math.max(1, Math.floor(count));
  return new Promise((resolve) => {
    let settledAll = false;
    let paused = false;
    const finish = (result: AdResult) => {
      if (settledAll) return;
      settledAll = true;
      revealGame();
      if (paused) hooks?.onEnd?.();
      resolve(result);
    };
    const play = (index: number, attempt: number) => {
      if (settledAll) return;
      if (index > total) {
        finish("viewed");
        return;
      }
      const adBreak = window.adBreak;
      if (!adBreak) {
        finish("unavailable");
        return;
      }
      hooks?.onProgress?.(index, total);
      let viewed = false;
      let dismissed = false;
      let closed = false;
      const timer = window.setTimeout(() => {
        if (!closed) finish("unavailable");
      }, AD_WAIT_MS);
      const settleBreak = (status: BreakStatus) => {
        if (closed || settledAll) return;
        if (viewed || status === "viewed") {
          closed = true;
          window.clearTimeout(timer);
          if (index < total) play(index + 1, 0);
          else finish("viewed");
          return;
        }
        if (dismissed || status === "dismissed") {
          closed = true;
          window.clearTimeout(timer);
          finish("skipped");
          return;
        }
        if (attempt < 2 && RETRYABLE.has(status)) {
          closed = true;
          window.clearTimeout(timer);
          window.setTimeout(() => play(index, attempt + 1), 1500);
          return;
        }
        closed = true;
        window.clearTimeout(timer);
        finish("unavailable");
      };
      try {
        adBreak({
          type: "reward",
          name: `runout-${index}`,
          beforeReward: (showAdFn) => {
            coverForAd();
            showAdFn();
          },
          beforeAd: () => {
            coverForAd();
            if (!paused) {
              paused = true;
              hooks?.onStart?.();
            }
          },
          adViewed: () => {
            viewed = true;
          },
          adDismissed: () => {
            dismissed = true;
          },
          adBreakDone: (info) => settleBreak(info?.breakStatus ?? ""),
        });
      } catch {
        window.clearTimeout(timer);
        finish("unavailable");
      }
    };
    play(1, 0);
  });
}
