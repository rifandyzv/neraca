import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Change this attribute's name to your `injectionPoint`.
    // `injectionPoint` is an InjectManifest option.
    // See https://serwist.pages.dev/docs/build/configuring
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Cache fonts
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 31536000, // 1 year
        },
      },
    },
    // Cache Lucide icons
    {
      urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/lucide-static@.*\.css$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "lucide-icons",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 31536000, // 1 year
        },
      },
    },
    // Cache ApexCharts
    {
      urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/apexcharts.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "apexcharts",
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 31536000, // 1 year
        },
      },
    },
    // Default cache for other assets
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
