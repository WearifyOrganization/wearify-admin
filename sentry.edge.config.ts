import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentryScrub";
import { tracesSampler } from "@/lib/sentryTracing";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV,

  tracesSampler,
  tracePropagationTargets: [/^\//],

  // Structured logs. The console integration is deliberately not mirrored into
  // instrumentation-client.ts: here it turns the console.warn/error we already
  // write into searchable logs for free, whereas on the kiosk the console is a
  // firehose of render chatter.
  enableLogs: true,
  beforeSendLog: scrubEvent,
  integrations: [Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] })],

  enableMetrics: true,
  beforeSendMetric: scrubEvent,

  sendDefaultPii: false,
  beforeSend: scrubEvent,
  beforeSendTransaction: scrubEvent,
  beforeBreadcrumb: scrubEvent,
});
