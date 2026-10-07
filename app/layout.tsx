import type { Metadata } from "next";
import { Bebas_Neue, Outfit } from "next/font/google";
import AuthRoot from "@/components/auth/AuthRoot";
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
  description: "Runout is an open city. Work, rob, drive, and eat. A bust takes half your cash, or a quarter after an ad.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.adsbygoogle=window.adsbygoogle||[];var adBreak=window.adBreak=window.adConfig=function(o){window.adsbygoogle.push(o)};adConfig({preloadAdBreaks:"on",sound:"off"});`,
          }}
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8078670301082619"
          crossOrigin="anonymous"
          {...(process.env.NODE_ENV === "production" ? {} : { "data-adbreak-test": "on" })}
        />
      </head>
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <AuthRoot>{children}</AuthRoot>
      </body>
    </html>
  );
}
