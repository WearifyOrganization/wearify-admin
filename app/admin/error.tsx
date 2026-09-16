"use client";

import RouteAuthError from "@/components/RouteAuthError";

// Admin-segment error boundary. Catches render throws from any /admin/* page —
// notably Convex useQuery UNAUTHORIZED throws when the admin session isn't yet
// attached / has expired — and routes them to the admin login instead of a
// generic crash.
export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteAuthError {...props} loginPath="/admin/login" segment="admin" />;
}
