type BreakStatus = "viewed" | "dismissed" | "notReady" | "timeout" | "invalid" | "error" | "noAdPreloaded" | "frequencyCapped" | "ignored" | "other";

type AdBreakOptions = {
  type: "reward";
  name: string;
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

const AD_WAIT_MS = 45_000;

/** Plays `count` rewarded ads in a row. The reward is only earned when every ad is viewed. */
export function watchAds(
  count: number,
  hooks?: { onStart?: () => void; onEnd?: () => void; onProgress?: (index: number, total: number) => void },
): Promise<AdResult> {
  const total = Math.max(1, Math.floor(count));
  return new Promise((resolve) => {
    let settledAll = false;
    let started = false;
    const finish = (result: AdResult) => {
      if (settledAll) return;
      settledAll = true;
      if (started) hooks?.onEnd?.();
      resolve(result);
    };
    const play = (index: number) => {
      if (index > total) {
        finish("viewed");
        return;
      }
      const adBreak = window.adBreak;
      if (!adBreak) {
        finish("unavailable");
        return;
      }
      if (!started) {
        started = true;
        hooks?.onStart?.();
      }
      hooks?.onProgress?.(index, total);
      let settled = false;
      const settle = (result: AdResult) => {
        if (settled || settledAll) return;
        settled = true;
        window.clearTimeout(timer);
        if (result === "viewed" && index < total) {
          play(index + 1);
          return;
        }
        finish(result);
      };
      const timer = window.setTimeout(() => settle("unavailable"), AD_WAIT_MS);
      try {
        adBreak({
          type: "reward",
          name: `runout-${index}`,
          beforeReward: (showAdFn) => showAdFn(),
          adViewed: () => settle("viewed"),
          adDismissed: () => settle("skipped"),
          adBreakDone: (info) => {
            if (info.breakStatus === "viewed") settle("viewed");
            else if (info.breakStatus === "dismissed") settle("skipped");
            else settle("unavailable");
          },
        });
      } catch {
        settle("unavailable");
      }
    };
    play(1);
  });
}
