import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { GeistPixelSquare } from "geist/font/pixel";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font";
import "./globals.css";

const APP_NAME = "Neraca";
const APP_DESCRIPTION = "A simple, privacy-focused, offline-first spending tracker";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_NAME,
    template: "%s - Neraca",
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    shortcut: "/icons/icon.svg",
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${GeistPixelSquare.variable} ${GeistMono.variable} ${GeistSans.variable}`}
    >
      <head />
      <body>{children}</body>
    </html>
  );
}
