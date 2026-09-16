"use client";

// Client-side phone auth utilities.
//
// Storage now goes through lib/clientStore, so every write notifies
// subscribers. The imperative getters/setters below are unchanged in
// behaviour and signature — they are still the right tool inside event
// handlers and Convex arg construction. For anything that should RE-RENDER
// when auth changes (layout guards, header avatars, store-scoped pages),
// prefer the hooks in lib/useAuth.ts instead of calling getToken() in an
// effect and mirroring it into useState.

import {
  StoreKeys,
  readJson,
  readString,
  removeKeys,
  writeJson,
  writeString,
} from "./clientStore";

export type AuthUser = {
  phone: string;
  name: string;
  role: string;
  storeId?: string;
  tailorId?: string;
  storeName?: string;
  customerId?: string;
};

export function getToken(): string | null {
  return readString(StoreKeys.AUTH_TOKEN);
}

export function setToken(token: string): void {
  writeString(StoreKeys.AUTH_TOKEN, token);
}

// Clears the token AND the cached user profile in one notification, so
// subscribers never observe a half-signed-out state.
export function clearToken(): void {
  removeKeys(StoreKeys.AUTH_TOKEN, StoreKeys.AUTH_USER);
}

export function getStoredUser(): AuthUser | null {
  return readJson<AuthUser>(StoreKeys.AUTH_USER);
}

export function setStoredUser(user: AuthUser): void {
  writeJson(StoreKeys.AUTH_USER, user);
}

export function formatPhone(raw: string): string {
  // Strip non-digits
  let digits = raw.replace(/\D/g, "");
  // Remove leading 91 if user typed it
  if (digits.startsWith("91") && digits.length > 10) {
    digits = digits.slice(2);
  }
  // Limit to 10 digits
  return digits.slice(0, 10);
}

export function fullPhone(digits: string): string {
  return `+91${digits}`;
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 && /^[6-9]/.test(digits);
}
