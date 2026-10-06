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
  description: "Runout is an open city. Work, rob, drive, and eat. A bust takes half your cash.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <AuthRoot>{children}</AuthRoot>
      </body>
    </html>
  );
}
