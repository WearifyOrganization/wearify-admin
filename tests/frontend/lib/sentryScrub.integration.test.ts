import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentryScrub";

// ONE init for the whole file: Sentry.init is a no-op once the SDK is already
// initialized in a process (it logs "SDK already initialized" and keeps the
// first client), so a per-test init would silently assert against the first
// test's client. Every channel is enabled here and each test clears the buffer
// instead.
const sent: unknown[] = [];

beforeAll(() => {
  Sentry.init({
    dsn: "https://abc123@o1.ingest.sentry.io/1",
    transport: () => ({
      send: async (e: unknown) => { sent.push(e); return {}; },
      flush: async () => true,
    }),
    integrations: [],
    defaultIntegrations: false,
    sendDefaultPii: false,

    enableLogs: true,
    enableMetrics: true,

    beforeSend: scrubEvent,
    beforeSendLog: scrubEvent,
    beforeSendMetric: scrubEvent,
  });
});

beforeEach(() => { sent.length = 0; });

const body = () => JSON.stringify(sent);

describe("sentry pipeline probe", () => {
  it("builds, scrubs and hands off an envelope", async () => {
    Sentry.captureException(new Error("send failed for +919876543210"));
    await Sentry.flush(2000);

    expect(sent.length).toBe(1);
    expect(body()).toContain("[phone]");
    expect(body()).not.toContain("9876543210");
  });

  // Logs, metrics and traces are separate opt-in channels with separate
  // beforeSend hooks. These assert each one is actually on AND actually
  // redacted — a channel that was never enabled and a channel leaking a
  // customer's phone number both look like a passing app.
  it("scrubs structured logs", async () => {
    Sentry.logger.error("try-on failed", { detail: "no scan for +919876543210" });
    await Sentry.flush(2000);

    expect(body()).toContain("try-on failed");
    expect(body()).toContain("[phone]");
    expect(body()).not.toContain("9876543210");
  });

  it("scrubs metric attributes", async () => {
    Sentry.metrics.count("tryon.failure.total", 1, {
      attributes: { code: "RATE_LIMIT_HOUR", deviceToken: "7456ab04ffff" },
    });
    await Sentry.flush(2000);

    expect(body()).toContain("tryon.failure.total");
    // A closed-set error code is the whole point of the metric — keep it.
    expect(body()).toContain("RATE_LIMIT_HOUR");
    expect(body()).not.toContain("7456ab04ffff");
  });

  // No span assertion here: under vitest this resolves to the Node SDK, whose
  // spans need an OpenTelemetry setup that does not exist in a unit-test
  // process. The tracing logic that is ours — which traces get kept — is
  // covered directly in sentryTracing.test.ts.
});
