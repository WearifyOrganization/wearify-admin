import { describe, it, expect } from "vitest";
import { tracesSampler, AMBIENT_TRACES_RATE } from "@/lib/sentryTracing";

describe("tracesSampler", () => {
  it("always keeps the operations we instrument by hand", () => {
    expect(tracesSampler({ name: "tryon.request" })).toBe(1);
    expect(tracesSampler({ name: "upload.file" })).toBe(1);
  });

  it("samples everything else", () => {
    expect(tracesSampler({ name: "GET /store/inventory" })).toBe(AMBIENT_TRACES_RATE);
    expect(AMBIENT_TRACES_RATE).toBeLessThan(1);
  });

  // The one that actually bites: without this, a kept child of a dropped
  // parent arrives as an orphan and the trace reads as if nothing called it.
  it("follows the parent's decision rather than re-rolling", () => {
    expect(tracesSampler({ name: "GET /store/inventory", parentSampled: true })).toBe(1);
    expect(tracesSampler({ name: "tryon.request", parentSampled: false })).toBe(0);
  });
});
