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
}
