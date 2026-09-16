// Frontend test setup (jsdom project only).

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Node 24 exposes an experimental global `localStorage` that is inert unless
// the process is started with --localstorage-file. It shadows the jsdom
// implementation on `window`, leaving an object with no Storage methods
// (window.localStorage.clear is not a function). Install a spec-shaped
// in-memory Storage so tests are deterministic regardless of Node version.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(String(key), String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
  [name: string]: unknown;
}

for (const prop of ["localStorage", "sessionStorage"] as const) {
  Object.defineProperty(window, prop, {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  // Testing Library needs an explicit cleanup when globals are not injected,
  // otherwise mounted trees leak across cases and stale subscriptions
  // (useSyncExternalStore listeners, timers) fire into the next test.
  cleanup();
  // Each test starts from an empty browser store — several suites assert on
  // "signed out" first paint, which a leaked token from a prior test breaks.
  window.localStorage.clear();
});
