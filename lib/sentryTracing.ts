// The sampling decision for every trace, shared by the browser, node and edge
// inits so all three agree on what a trace is worth.
//
// The kiosk is a single-page app that runs for a whole retail day, so a flat
// rate is the wrong shape: it would spend the quota on router navigations and
// then drop the one trace that matters — the render a customer stood and
// waited for. Named app operations are always kept; ambient traffic is
// sampled. Same instinct as convex/tryOn/telemetry.ts: instrument the
// customer's wait, not the framework's chatter.

// @sentry/nextjs does not re-export the sampler's context type (the name
// collides across its client/server/edge entrypoints), so name the two fields
// we actually read. Structurally compatible with TracesSamplerSamplingContext.
type SamplingContext = { name: string; parentSampled?: boolean };

// The knob. 5% of ambient traffic is enough to catch a page-load regression
// without paying for a tablet that idles on one screen for an hour.
const configured = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_RATE);
export const AMBIENT_TRACES_RATE =
  Number.isFinite(configured) && configured >= 0 && configured <= 1 ? configured : 0.05;

// Prefixes of the spans we start by hand. Keep in sync with the call sites;
// anything not listed is ambient and gets sampled.
const ALWAYS_SAMPLED = ["tryon.", "upload.", "image."];

export function tracesSampler(ctx: SamplingContext): number {
  // Never split a trace: a sampled parent keeps its children and a dropped
  // parent drops them, or a kept span arrives with a hole where its caller was.
  if (ctx.parentSampled !== undefined) return ctx.parentSampled ? 1 : 0;
  if (ALWAYS_SAMPLED.some((prefix) => ctx.name.startsWith(prefix))) return 1;
  return AMBIENT_TRACES_RATE;
}
