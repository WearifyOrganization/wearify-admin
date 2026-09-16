"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// App-wide error boundary (P2-4). A render crash anywhere under app/ that isn't
// caught by a more specific boundary lands here instead of a blank screen.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { surface: "app" } });
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#faf7f4",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#2A2522", margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: "#6B5E5A", marginTop: 8, lineHeight: 1.5 }}>
          An unexpected error occurred. You can try again — if it keeps happening,
          please refresh the page.
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
          Try again
        </button>
      </div>
    </div>
  );
}
