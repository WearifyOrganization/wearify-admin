"use client";

// Client-only clock hooks.
//
// TWO BUGS THIS REPLACES
//
// 1. Rendering `new Date().toLocaleTimeString()` inline in JSX (admin/revenue,
//    admin/models, admin/agents, admin/command-center). The server renders the
//    server's clock, the client renders the browser's, and React reports a
//    hydration mismatch. Returning null until mounted keeps the two renders
//    identical.
//
// 2. Seeding a clock with setState inside an effect (admin/dashboard), which
//    trips `react-hooks/set-state-in-effect` and costs an extra render pass.
//
// Both become one useSyncExternalStore subscription. getSnapshot buckets by the
// tick interval so repeated calls within the same tick return an identical
// value — the stability useSyncExternalStore requires.

import { useCallback, useSyncExternalStore } from "react";

type Listener = () => void;

// One timer per distinct interval, shared by every hook instance using it.
// A dashboard with a 1s clock and a 30s clock runs exactly two timers no
// matter how many components subscribe.
type Ticker = {
  listeners: Set<Listener>;
  timer: ReturnType<typeof setInterval> | null;
  bucket: number;
  value: number;
};

const tickers = new Map<number, Ticker>();

function getTicker(intervalMs: number): Ticker {
  let ticker = tickers.get(intervalMs);
  if (!ticker) {
    ticker = { listeners: new Set(), timer: null, bucket: -1, value: 0 };
    tickers.set(intervalMs, ticker);
  }
  return ticker;
}

// Quantise `now` to the interval. Two calls inside the same tick produce the
// same bucket, so the cached value (and its identity) is reused.
function snapshot(intervalMs: number): number {
  const ticker = getTicker(intervalMs);
  const bucket = Math.floor(Date.now() / intervalMs);
  if (bucket !== ticker.bucket) {
    ticker.bucket = bucket;
    ticker.value = bucket * intervalMs;
  }
  return ticker.value;
}

function subscribeTo(intervalMs: number, listener: Listener): () => void {
  const ticker = getTicker(intervalMs);
  ticker.listeners.add(listener);
  if (!ticker.timer) {
    ticker.timer = setInterval(() => {
      for (const l of [...ticker.listeners]) l();
    }, intervalMs);
  }
  return () => {
    ticker.listeners.delete(listener);
    if (ticker.listeners.size === 0 && ticker.timer) {
      clearInterval(ticker.timer);
      ticker.timer = null;
    }
  };
}

/**
 * Epoch milliseconds, refreshed every `intervalMs`.
 * Returns null on the server and during hydration, so callers render the same
 * markup on both sides. Use for "x minutes ago" style relative timestamps.
 */
export function useNowMs(intervalMs = 1000): number | null {
  const subscribe = useCallback(
    (listener: Listener) => subscribeTo(intervalMs, listener),
    [intervalMs],
  );
  const getSnapshot = useCallback(() => snapshot(intervalMs), [intervalMs]);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

/**
 * A live Date, refreshed every `intervalMs`. Null on the server / hydration.
 */
export function useNow(intervalMs = 1000): Date | null {
  const ms = useNowMs(intervalMs);
  return ms === null ? null : new Date(ms);
}

/**
 * A formatted wall-clock string, refreshed every `intervalMs`.
 * Returns "" before mount so the server and client agree on first paint —
 * the same trick the old inline `useState("")` used, without the effect.
 */
export function useClockLabel(
  options: Intl.DateTimeFormatOptions = {},
  locales?: Intl.LocalesArgument,
  intervalMs = 1000,
): string {
  const now = useNow(intervalMs);
  if (now === null) return "";
  return now.toLocaleTimeString(locales, options);
}
