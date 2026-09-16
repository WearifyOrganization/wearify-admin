import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentryScrub";
import { tracesSampler } from "@/lib/sentryTracing";

// No DSN in dev/preview means Sentry is inert rather than noisy.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,

  // Session Replay is deliberately NOT added. The kiosk is a camera-facing
  // mirror showing customers mid-try-on and the tablet DOM holds phone numbers;
  // recording either is a DPDP problem, not a debugging feature. Omitting the
  // integration also keeps it out of the bundle.

  // Tracing: see lib/sentryTracing.ts for what gets kept.
  tracesSampler,
  // Only same-origin requests carry `sentry-trace`/`baggage`. Convex storage
  // upload URLs are a different origin with their own CORS allowlist — adding
  // headers they do not permit would fail the preflight and break uploads.
  tracePropagationTargets: [/^\//],

  // Structured logs (Sentry.logger.*). Off by default in the SDK.
  enableLogs: true,
  beforeSendLog: scrubEvent,

  // Trace metrics (Sentry.metrics.count/gauge/distribution).
  enableMetrics: true,
  beforeSendMetric: scrubEvent,

  sendDefaultPii: false,
  beforeSend: scrubEvent,
  beforeSendTransaction: scrubEvent,
  beforeBreadcrumb: scrubEvent,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
