import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Defense-in-depth route guard for the admin console (P0-4).
//
// The AUTHORITATIVE check is the Convex authz layer — every admin function calls
// requireAdmin, so data is already protected server-side. This proxy only avoids
// rendering the admin shell to an unauthenticated browser (and the
// render-then-redirect flash). It matches the Better Auth session cookie by
// suffix/prefix so it never locks out a genuinely logged-in admin even if the
// exact cookie name changes (plain vs __Secure- prefixed, chunked, etc.), then
// confirms that cookie maps to a REAL session (a name-only match is trivially
// forged) via Better Auth's get-session.
//
// Other modules (customer PWA, store, tailor, kiosk, tablet, scanner) authenticate
// with localStorage tokens that are invisible to the proxy, so they are
// intentionally NOT matched here and keep their existing client-side guards.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The login page must stay reachable or we'd redirect-loop.
  if (pathname === "/admin/login") return NextResponse.next();

  const toLogin = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  };

  // Cheap pre-filter: no session cookie at all → straight to login, no fetch.
  const hasSessionCookie = request.cookies
    .getAll()
    .some(
      (c) => c.name.includes("session_token") || c.name.startsWith("better-auth"),
    );
  if (!hasSessionCookie) return toLogin();

  // A present cookie is not proof of a session (the name check is forgeable), so
  // validate it against Better Auth. get-session lives on the app's own
  // /api/auth/[...all] route, which is outside the matcher below (no recursion).
  try {
    const res = await fetch(
      new URL("/api/auth/get-session", request.nextUrl.origin),
      {
        headers: { cookie: request.headers.get("cookie") ?? "" },
        cache: "no-store",
      },
    );
    if (res.ok) {
      const data = await res.json().catch(() => null);
      // 200 with a null/empty body means the cookie resolves to no session.
      if (!data || !data.user || !data.session) return toLogin();
    }
    // Non-2xx: fall through (fail-open, see below).
  } catch {
    // ponytail: fail-open — server-side requireAdmin + the layout getMe gate are
    // the real boundary; a transient Convex/network blip must not lock admins out.
  }

  return NextResponse.next();
}

export const config = {
  // Admin console only. (Next's matcher can't see localStorage, so the other
  // modules are guarded client-side + by Convex authz.)
  matcher: ["/admin", "/admin/:path*"],
};
