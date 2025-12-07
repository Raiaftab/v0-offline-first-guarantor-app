import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ServiceWorkerRegister } from "@/components/service-worker-register"
import { Toaster } from "@/components/ui/toaster"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Guarantor Report Viewer",
  description: "Mobile-friendly offline-first guarantor report viewer with offline data sync",
  generator: "v0.app",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Guarantor App",
  },
  formatDetection: {
    telephone: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Guarantor App" />
        <link rel="apple-touch-icon" href="/placeholder.svg?height=180&width=180" />
        <meta name="theme-color" content="#7c3aed" />
      </head>
      <body className="font-sans">
        <Suspense fallback={null}>
          {children}
          <ServiceWorkerRegister />
          <Toaster />
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
