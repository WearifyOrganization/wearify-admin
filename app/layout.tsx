import type { Metadata, Viewport } from "next";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { getToken } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Wearify — Mission Control",
  description: "AI-powered virtual try-on platform for Indian saree retailers",
  applicationName: "Wearify",
  robots: { index: false, follow: false },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#6E262B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Admin authenticates with Better Auth, which runs inside Convex; the
// /api/auth route in this app is the same-origin façade that makes the
// cookie session work, and proxy.ts guards /admin at the edge.
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The server-side token mint fetches the Convex site URL. A transient timeout
  // there must not 500 the entire app on every route — fall back to an
  // unauthenticated initial token and let the client re-establish auth over the
  // websocket.
  let token: string | null = null;
  try {
    token = (await getToken()) ?? null;
  } catch {
    // ponytail: swallow transient SSR token-fetch failures (ETIMEDOUT etc.);
    // client-side auth still runs. Surfaced as unauthenticated hydration, not a 500.
    token = null;
  }

  return (
    <html lang="en">
      <body className="antialiased">
        <ConvexClientProvider initialToken={token}>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
