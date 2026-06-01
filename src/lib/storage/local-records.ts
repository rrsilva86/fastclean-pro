"use client";

export function readLocalRecords<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(key);
  if (!rawValue) {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T[];
  } catch {
    window.localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
}

export function writeLocalRecords<T>(key: string, records: T[]) {
  window.localStorage.setItem(key, JSON.stringify(records));
}
