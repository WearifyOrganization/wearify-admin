import { describe, it, expect } from "vitest";
import { scrubEvent } from "@/lib/sentryScrub";

describe("scrubEvent", () => {
  it("redacts phone numbers in both stored and typed forms", () => {
    const out = scrubEvent({
      message: "loginWithOtp failed for +919876543210 (retry 9123456789)",
    }) as { message: string };
    expect(out.message).toBe("loginWithOtp failed for [phone] (retry [phone])");
  });

  it("leaves unix-second timestamps alone", () => {
    const out = scrubEvent({ message: "expiresAt 1756123456" }) as { message: string };
    expect(out.message).toContain("1756123456");
  });

  it("redacts secret-bearing keys wherever they are nested", () => {
    const out = scrubEvent({
      extra: { deviceToken: "7456ab04", staff: { pin: "1234", name: "Asha" } },
    }) as { extra: { deviceToken: string; staff: { pin: string; name: string } } };
    expect(out.extra.deviceToken).toBe("[redacted]");
    expect(out.extra.staff.pin).toBe("[redacted]");
    expect(out.extra.staff.name).toBe("Asha");
  });

  it("redacts a numeric trial-room code but keeps the ConvexError discriminant", () => {
    const out = scrubEvent({
      extra: { trial: { code: "883018" }, err: { code: "UNAUTHORIZED" } },
    }) as { extra: { trial: { code: string }; err: { code: string } } };
    expect(out.extra.trial.code).toBe("[redacted]");
    expect(out.extra.err.code).toBe("UNAUTHORIZED");
  });

  it("strips base64 try-on payloads", () => {
    const out = scrubEvent({
      message: `submit failed: data:image/png;base64,${"A".repeat(400)}`,
    }) as { message: string };
    expect(out.message).toBe("submit failed: [image]");
    expect(out.message).not.toContain("AAAA");
  });

  it("survives a cyclic event instead of throwing", () => {
    const event: Record<string, unknown> = { message: "boom" };
    event.self = event;
    expect(() => scrubEvent(event)).not.toThrow();
  });
});

describe("scrubEvent — secrets inlined in messages", () => {
  it("redacts a token interpolated into a message string", () => {
    const out = scrubEvent({
      message: "auth failed: deviceToken 7456ab04cafe / verifyToken=q9x_ZaB-1",
    }) as { message: string };
    expect(out.message).not.toContain("7456ab04cafe");
    expect(out.message).not.toContain("q9x_ZaB-1");
    expect(out.message).toContain("[redacted]");
  });

  it("does not eat ordinary prose or Convex ids", () => {
    const out = scrubEvent({
      message: "patch on jd7abc123def456ghi failed after 3 attempts",
    }) as { message: string };
    expect(out.message).toBe("patch on jd7abc123def456ghi failed after 3 attempts");
  });
});
