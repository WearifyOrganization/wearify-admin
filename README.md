# Wearify Admin — Mission Control

The privileged management console (`/admin/*`): stores and onboarding,
catalogue approval with reference-card review, devices and pairing, admin
users, tailors KYC, platform settings, models, security, network, revenue and
the mostly-static operations sections. One of the six Wearify frontends; it
talks to the single Wearify Convex backend (`wearify-backend`) through the
generated contract package `@wearify/shared` and holds no backend code of its
own.

## How it fits

```
wearify-admin  ──▶  @wearify/shared (typed api, dataModel, rules)  ──▶  wearify-backend (Convex)
       │                                                                        ▲
       └── /api/auth/[...all]  (same-origin façade)  ──▶  Better Auth routes ───┘
```

## Authentication (Better Auth, deliberately different from the other surfaces)

- Better Auth **runs inside Convex** (`wearify-backend/convex/betterAuth`,
  `convex/http.ts`). This app exposes `app/api/auth/[...all]/route.ts`, which
  re-exports the handler from `lib/auth-server.ts`
  (`convexBetterAuthNextJs`) so the session cookie is same-origin.
- `app/layout.tsx` calls `getToken()` server-side and hands the initial JWT to
  `components/ConvexClientProvider.tsx` (`ConvexBetterAuthProvider` with
  `lib/auth-client.ts`); failures fall back to an unauthenticated first
  render, never a 500.
- `proxy.ts` (Next's middleware file) matches `/admin/:path*`, checks for a
  Better Auth session cookie, validates it against `/api/auth/get-session`
  and redirects to `/admin/login`. It is fail-open on network errors and is
  not the security boundary; `requireAdmin` in the backend is.
- `app/admin/layout.tsx` waits for Convex auth to settle, then treats
  `adminUsers.getMe` as the authority for role and scope.
- Admin is the only surface that reads `ctx.auth` on the backend; there is no
  bearer token, device token or OTP flow here.

## Other pieces

- **Backend functions used:** `adminUsers`, `stores`, `devices`,
  `kioskPairing`, `settings`, `dashboard`, `network`, `tailorOps`, `sarees` /
  `sareeCards` (approval), `phoneAuth.{get,set}OtpDevMode`, and the operations
  sections (`agents`, `models`, `releases`, `resilience`, `security`,
  `support`, `legal`, `billing`).
- **UI:** `components/ui/wearify-ui.tsx` (the full design-system primitives),
  `ui/toast`, `SareeCardPanel` (approval modal), `RouteAuthError`, `recharts`
  on dashboard/models/revenue, `lucide-react` in the shell.
- **Uploads:** `lib/useUpload` + `lib/uploadGuards` (+ `lib/imageCompress`
  through the card panel), store logos on onboarding.
- **Assets:** `public/legal/*.pdf` (linked from onboarding) and
  `public/wearify-logo.svg`.
- **Fonts:** IBM Plex Sans and JetBrains Mono via a Google Fonts link in
  `app/admin/layout.tsx`; `globals.css` sets them as `--font-sans`/`--font-mono`.
- **Observability:** Sentry via `instrumentation*.ts` and `sentry.*.config.ts`
  with the PII scrubber in `lib/sentryScrub.ts`; inert without a DSN.
- **Root `/`:** not served. The monorepo's marketing launcher at `/` was not
  part of the admin surface and was not copied; `/admin` itself redirects to
  the dashboard or login as before.

## Development

```bash
pnpm install          # pnpm 11 (packageManager); `npx pnpm@11.13.1` if not installed
cp .env.example .env.local   # fill NEXT_PUBLIC_CONVEX_URL and NEXT_PUBLIC_CONVEX_SITE_URL
pnpm dev
```

`@wearify/shared` is currently `link:../wearify-shared`; a sibling checkout of
`wearify-shared` must exist until the dependency is pinned to a published
version. `dev` and `build` pass `--webpack` because Turbopack does not resolve
that symlink outside the project root; drop the flag once the package is
pinned.

## Checks

```bash
pnpm type-check
pnpm test             # vitest, jsdom (Sentry scrub/tracing suites)
pnpm lint
pnpm build
```

## Environment

Names only; see `.env.example`. `NEXT_PUBLIC_CONVEX_URL` and
`NEXT_PUBLIC_CONVEX_SITE_URL` are required at build time. `BETTER_AUTH_SECRET`
and `SITE_URL` belong to the Convex deployment, not to this app.

## Notes from the extraction

- `eslint-plugin-react-hooks` is pinned in `pnpm-workspace.yaml` to the
  version the monorepo lockfile resolves.
