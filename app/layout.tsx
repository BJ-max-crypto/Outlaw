import type { Metadata } from "next";
import { Bebas_Neue, Outfit } from "next/font/google";
import AuthRoot from "@/components/auth/AuthRoot";
import { ADS_ENABLED } from "@/lib/ads/enabled";
import "./globals.css";

const display = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Runout",
  description: ADS_ENABLED
    ? "Runout is an open city. Work, rob, drive, and eat. A bust takes half your cash, or a quarter after an ad."
    : "Runout is an open city. Work, rob, drive, and eat. A bust takes half your cash.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {ADS_ENABLED && (
          <>
            <script
              async
              src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8078670301082619"
              crossOrigin="anonymous"
              data-ad-client="ca-pub-8078670301082619"
              data-ad-frequency-hint="30s"
              {...(process.env.NODE_ENV === "production" ? {} : { "data-adbreak-test": "on" })}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `window.adsbygoogle=window.adsbygoogle||[];var adBreak=window.adBreak=window.adConfig=function(o){window.adsbygoogle.push(o)};adConfig({preloadAdBreaks:"on",sound:"on"});`,
              }}
            />
            <script async src="https://securepubads.g.doubleclick.net/tag/js/gpt.js" crossOrigin="anonymous" />
            <script
              dangerouslySetInnerHTML={{
                __html: `
window.googletag = window.googletag || {cmd: []};
var rewardedSlot;
function defineRewardedSlot() {
  googletag.cmd.push(function () {
    if (rewardedSlot) googletag.destroySlots([rewardedSlot]);
    rewardedSlot = googletag.defineOutOfPageSlot(
      "/22639388115/rewarded_web_example",
      googletag.enums.OutOfPageFormat.REWARDED
    );
    if (!rewardedSlot) return;
    rewardedSlot.addService(googletag.pubads());
    if (!window.__gptServices) {
      window.__gptServices = true;
      googletag.pubads().addEventListener("rewardedSlotReady", function (event) {
        window.__rewardedSlotReady = event;
        window.dispatchEvent(new Event("rewarded-slot-ready"));
      });
      googletag.pubads().addEventListener("rewardedSlotGranted", function (event) {
        var payload = event && event.payload;
        if (payload && typeof window.__onRewardedSlotGranted === "function") {
          window.__onRewardedSlotGranted(payload);
        }
      });
      googletag.pubads().addEventListener("rewardedSlotClosed", function () {
        window.__rewardedSlotReady = null;
        window.dispatchEvent(new Event("rewarded-slot-closed"));
        if (rewardedSlot) {
          googletag.destroySlots([rewardedSlot]);
          rewardedSlot = null;
        }
        defineRewardedSlot();
      });
      googletag.enableServices();
    }
    googletag.display(rewardedSlot);
  });
}
defineRewardedSlot();
`,
              }}
            />
          </>
        )}
      </head>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <AuthRoot>{children}</AuthRoot>
      </body>
    </html>
  );
}
