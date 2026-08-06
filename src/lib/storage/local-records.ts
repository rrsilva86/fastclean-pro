"use client";

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  return document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`))
    ?.split("=")[1] ?? "";
}

export function buildScopedStorageKey(key: string, sessionToken = decodeURIComponent(readCookie("fastclean_session"))) {
  if (!sessionToken) {
    return key;
  }

  return `${sessionToken}:${key}`;
}

export function readLocalRecords<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") {
    return fallback;
  }

  const scopedKey = buildScopedStorageKey(key);
  const rawValue = window.localStorage.getItem(scopedKey);
  if (!rawValue) {
    window.localStorage.setItem(scopedKey, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T[];
  } catch {
    window.localStorage.setItem(scopedKey, JSON.stringify(fallback));
    return fallback;
  }
}

export function writeLocalRecords<T>(key: string, records: T[]) {
  window.localStorage.setItem(buildScopedStorageKey(key), JSON.stringify(records));
  syncRemoteRecords(key, records);
}

export async function readRemoteRecords<T>(key: string, fallback: T[]): Promise<T[]> {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const response = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
      cache: "no-store",
      credentials: "same-origin"
    });

    if (!response.ok) {
      return fallback;
    }

    const payload = await response.json() as { records?: T[] };
    const records = Array.isArray(payload.records) ? payload.records : fallback;

    if (records.length > 0) {
      window.localStorage.setItem(buildScopedStorageKey(key), JSON.stringify(records));
      return records;
    }

    if (fallback.length > 0) {
      syncRemoteRecords(key, fallback);
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export function syncRemoteRecords<T>(key: string, records: T[]) {
  if (typeof window === "undefined") {
    return;
  }

  fetch(`/api/storage/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ records }),
    keepalive: JSON.stringify({ records }).length < 60000
  }).catch(() => undefined);
}
