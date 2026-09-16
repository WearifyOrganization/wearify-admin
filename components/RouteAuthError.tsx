"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { cleanError } from "@/components/ui/toast";

// Shared route error boundary for the admin + store segments. A Convex useQuery
// that throws surfaces at React render time — try/catch can't catch subscription
// errors, only a boundary like this can. Auth failures (the server throwing
// "UNAUTHORIZED: ..." on session expiry or the token-attach race) redirect to
// the segment's login, matching the layouts' own redirect-on-unauthenticated
// behavior; any other render error shows a retry card (mirrors app/error.tsx).
export default function RouteAuthError({
  error,
  reset,
  loginPath,
  segment,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  loginPath: string;
  segment: string;
}) {
  const router = useRouter();
  // Server auth failures are thrown as ConvexError({ code: "UNAUTHORIZED" }) —
  // read the structured data (survives prod redaction, see convex/errors.ts),
  // falling back to the message for plain dev-mode errors.
  const isAuthError =
    (error as { data?: { code?: string } })?.data?.code === "UNAUTHORIZED" ||
    error.message.includes("UNAUTHORIZED");

  useEffect(() => {
    // An expired session is routine, not a defect — reporting every redirect
    // would bury the real crashes under login churn.
    if (!isAuthError) Sentry.captureException(error, { tags: { surface: segment } });
    console.error(`[${segment} error boundary]`, error);
    if (isAuthError) router.replace(loginPath);
  }, [error, isAuthError, loginPath, router, segment]);

  if (isAuthError) {
    return (
      <div style={WRAP}>
        <p style={{ fontSize: 14, color: "#6B5E5A" }}>Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div style={WRAP}>
      <div style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#2A2522", margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, color: "#6B5E5A", marginTop: 8, lineHeight: 1.5 }}>
          {cleanError(error, "An unexpected error occurred. Try again — if it keeps happening, refresh the page.")}
        </p>
        <button onClick={reset} style={BTN}>
          Try again
        </button>
      </div>
    </div>
  );
}

const WRAP: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "#faf7f4",
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const BTN: React.CSSProperties = {
  marginTop: 18,
  padding: "10px 22px",
  borderRadius: 10,
  border: "none",
  background: "#6E262B",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};
