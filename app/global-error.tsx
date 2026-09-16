"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Root-level error boundary — catches crashes in the root layout itself, which
// app/error.tsx cannot. Must render its own <html>/<body> (it replaces the root
// layout when it fires).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { surface: "root" } });
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            background: "#faf7f4",
          }}
        >
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#2A2522", margin: 0 }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: "#6B5E5A", marginTop: 8 }}>
              The app hit an unexpected error. Please refresh.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 18,
                padding: "10px 22px",
                borderRadius: 10,
                border: "none",
                background: "#6E262B",
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
