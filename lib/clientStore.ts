"use client";

// Typed, SSR-safe, reactive wrapper over localStorage.
//
// WHY THIS EXISTS
// Before this module, ~50 components each did the same thing by hand:
//
//   const [storeId, setStoreId] = useState<string | null>(null);
//   useEffect(() => {
//     try {
//       const u = JSON.parse(localStorage.getItem("wearify_auth_user") || "{}");
//       if (u.storeId) setStoreId(u.storeId);
//     } catch {}
//   }, []);
//
// That pattern has four problems, all of which bit this codebase:
//   1. setState-inside-effect triggers a cascading re-render, which is why
//      `react-hooks/set-state-in-effect` had to be disabled in 27 places.
//   2. The first render always sees `null`, so every consumer needs a
//      throwaway loading branch even when the value is synchronously available.
//   3. Writes in one component are invisible to another until remount — there
//      is no subscription, so logout in the sidebar leaves stale state in a page.
//   4. Raw JSON.parse on untyped strings, repeated 50 times, each with its own
//      (or missing) try/catch.
//
// useSyncExternalStore fixes all four: React reads the value during render
// (no effect, no cascade), the value is correct on the very first client
// render, and every subscriber re-renders when any writer touches storage.
//
// SSR: getServerSnapshot returns null, so server markup renders the
// "signed out" shape and React swaps in the real value on hydration. This is
// the documented, warning-free way to handle browser-only state.

import { useCallback, useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Key registry
// ---------------------------------------------------------------------------
// Every localStorage key the app uses, in one place. Previously these were
// bare string literals repeated across 53 files, so a typo silently read
// `null` forever. All values are JSON-encoded EXCEPT AUTH_TOKEN, which is a
// bare string (kept as-is: rewriting it would invalidate every logged-in
// session in the field).
export const StoreKeys = {
  AUTH_TOKEN: "wearify_auth_token",
  AUTH_USER: "wearify_auth_user",
  KIOSK_STORE: "wearify_kiosk_store",
  KIOSK_SESSION: "wearify_kiosk_session",
  KIOSK_TRYSTATE: "wearify_kiosk_trystate",
  KIOSK_SHORTLISTED: "wearify_kiosk_shortlisted",
  TABLET_DEVICE: "wearify_tablet_device",
  TABLET_STAFF: "wearify_tablet_staff",
  TABLET_STORE: "wearify_tablet_store",
  TABLET_SESSION: "wearify_tablet_session",
  TABLET_CUSTOMER: "wearify_tablet_customer",
} as const;

export type StoreKey = (typeof StoreKeys)[keyof typeof StoreKeys];

// ---------------------------------------------------------------------------
// Subscription plumbing
// ---------------------------------------------------------------------------

// The native `storage` event fires only in OTHER tabs, never the one that did
// the write. Same-tab writes dispatch this instead so local subscribers update.
const LOCAL_EVENT = "wearify:storage";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit(): void {
  // Copy before iterating: a listener may unsubscribe during notification.
  for (const listener of [...listeners]) listener();
}

// Module-level (not per-render) so useSyncExternalStore sees a stable identity
// and doesn't resubscribe on every render.
function subscribe(onStoreChange: Listener): () => void {
  listeners.add(onStoreChange);
  // Attach the window listeners lazily on the first subscriber, and drop them
  // when the last one leaves, so an app with no storage consumers pays nothing.
  if (listeners.size === 1 && typeof window !== "undefined") {
    window.addEventListener("storage", emit);
    window.addEventListener(LOCAL_EVENT, emit);
  }
  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", emit);
      window.removeEventListener(LOCAL_EVENT, emit);
    }
  };
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOCAL_EVENT));
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

// useSyncExternalStore requires getSnapshot to return a REFERENTIALLY STABLE
// value while the underlying data is unchanged. A naive `JSON.parse(raw)` per
// call returns a fresh object every time, which React reads as "changed" and
// re-renders forever. Cache the parsed object against the exact raw string it
// came from; a write changes the raw string, which invalidates the entry.
const parseCache = new Map<string, { raw: string | null; value: unknown }>();

// Read a JSON-encoded value. Returns null when absent, unparseable, or when
// localStorage is unavailable (SSR, private mode, disabled cookies).
export function readJson<T>(key: StoreKey): T | null {
  if (typeof window === "undefined") return null;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return null;
  }
  const cached = parseCache.get(key);
  if (cached && cached.raw === raw) return cached.value as T | null;

  let value: unknown = null;
  if (raw !== null) {
    try {
      value = JSON.parse(raw);
    } catch {
      value = null; // corrupt entry — treat as absent rather than throwing
    }
  }
  parseCache.set(key, { raw, value });
  return value as T | null;
}

// Read a bare-string value (AUTH_TOKEN). Primitives are compared by value, so
// no cache is needed for snapshot stability.
export function readString(key: StoreKey): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export function writeJson<T>(key: StoreKey, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled. Swallow: losing a cached preference
    // must never break the surface that wrote it.
  }
  notify();
}

export function writeString(key: StoreKey, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* see writeJson */
  }
  notify();
}

// Remove one or more keys, then notify once. Taking a list keeps multi-key
// logout atomic from a subscriber's point of view — they see the fully
// signed-out state in a single re-render, never a half-cleared one.
export function removeKeys(...keys: StoreKey[]): void {
  if (typeof window === "undefined") return;
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* see writeJson */
    }
    parseCache.delete(key);
  }
  notify();
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

// Always null on the server and during hydration; React re-renders with the
// real value immediately after mount.
function serverSnapshot(): null {
  return null;
}

// Subscribe to a JSON-encoded key. Re-renders on any write to storage,
// including writes from another tab.
export function useStoredJson<T>(key: StoreKey): T | null {
  const getSnapshot = useCallback(() => readJson<T>(key), [key]);
  return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
}

// Subscribe to a bare-string key.
export function useStoredString(key: StoreKey): string | null {
  const getSnapshot = useCallback(() => readString(key), [key]);
  return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
}

// Test-only: drop memoized parses so a test can seed localStorage directly.
export function __resetParseCacheForTests(): void {
  parseCache.clear();
}
