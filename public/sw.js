// Enhanced service worker with offline-first strategy using Workbox

const CACHE = "guarantor-app-cache-v1"
const OFFLINE_PAGE = "/offline.html"

// Import Workbox
const workbox = self.workbox
importScripts("https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js")

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

// Install event - cache offline page
self.addEventListener("install", async (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.add(OFFLINE_PAGE).catch((err) => {
        console.log("[v0] Failed to cache offline page:", err)
      })
    }),
  )
  self.skipWaiting()
})

// Enable navigation preload
if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable()
}

workbox.routing.registerRoute(
  /\/*/,
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: CACHE,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 500,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  }),
)

self.addEventListener("fetch", (event) => {
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const preloadResp = await event.preloadResponse

          if (preloadResp) {
            return preloadResp
          }

          const networkResp = await fetch(event.request)
          return networkResp
        } catch (error) {
          console.log("[v0] Fetch failed, returning offline page:", error)
          const cache = await caches.open(CACHE)
          const cachedResp = await cache.match(OFFLINE_PAGE)
          return cachedResp || new Response("Offline - Please check your connection")
        }
      })(),
    )
  }
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE) {
            console.log("[v0] Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})
