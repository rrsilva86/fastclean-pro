"use client";

import { auditStorageKey, type AuditEntityType, normalizeAuditEvent, safeAuditValue } from "@/lib/audit/audit-events";

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
  const previousRecords = readStoredRecords<T>(key);
  window.localStorage.setItem(buildScopedStorageKey(key), JSON.stringify(records));
  syncRemoteRecords(key, records);
  recordMutationAuditEvents(key, previousRecords, records);
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

function readStoredRecords<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(buildScopedStorageKey(key));
    const records = value ? JSON.parse(value) as T[] : [];
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

const auditedCollections: Record<string, AuditEntityType> = {
  fastclean_clients: "customer",
  fastclean_appointments: "appointment",
  fastclean_employees: "employee",
  fastclean_teams: "team",
  fastclean_invoices: "invoice",
  fastclean_pricing_quotes: "quote",
  fastclean_pricing_rules: "pricing",
  fastclean_system_settings: "settings"
};

const ignoredAuditFields = new Set(["updatedAt", "createdAt", "activity", "communications"]);

function getRecordId(record: unknown) {
  return typeof record === "object" && record !== null && "id" in record ? String((record as { id?: unknown }).id ?? "") : "";
}

function getRecordDisplayName(record: unknown, entityType: AuditEntityType) {
  if (typeof record !== "object" || record === null) {
    return entityType;
  }

  const item = record as Record<string, unknown>;
  return String(item.displayName ?? item.name ?? item.client ?? item.customerName ?? item.number ?? item.title ?? item.label ?? item.id ?? entityType);
}

function summarizeChange(action: string, entityDisplay: string, fieldName?: string, previousValue?: unknown, newValue?: unknown) {
  if (action === "created") {
    return `${entityDisplay} created.`;
  }

  if (action === "deleted") {
    return `${entityDisplay} deleted.`;
  }

  if (!fieldName) {
    return `${entityDisplay} updated.`;
  }

  return `${entityDisplay}: ${fieldName} changed from ${formatAuditValue(previousValue)} to ${formatAuditValue(newValue)}.`;
}

function formatAuditValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function flattenAuditRecord(record: unknown, prefix = ""): Record<string, unknown> {
  if (typeof record !== "object" || record === null || Array.isArray(record)) {
    return { [prefix || "value"]: record };
  }

  return Object.entries(record as Record<string, unknown>).reduce<Record<string, unknown>>((fields, [key, value]) => {
    if (ignoredAuditFields.has(key)) {
      return fields;
    }

    const fieldName = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return { ...fields, ...flattenAuditRecord(value, fieldName) };
    }

    fields[fieldName] = value;
    return fields;
  }, {});
}

function readActorSnapshot() {
  return {
    actorDisplayNameSnapshot: readCookie("fastclean_user_name") || readCookie("fastclean_user_email") || "FastClean user",
    actorRoleSnapshot: readCookie("fastclean_role") || "owner",
    actorUserId: readCookie("fastclean_user_email") || readCookie("fastclean_session")
  };
}

function recordMutationAuditEvents<T>(collectionKey: string, previousRecords: T[], nextRecords: T[]) {
  if (collectionKey === auditStorageKey || typeof window === "undefined") {
    return;
  }

  const entityType = auditedCollections[collectionKey];
  if (!entityType) {
    return;
  }

  const previousEntries = previousRecords
    .map((record) => [getRecordId(record), record] as const)
    .filter(([id]) => id);
  const nextEntries = nextRecords
    .map((record) => [getRecordId(record), record] as const)
    .filter(([id]) => id);
  const previousById = new Map(previousEntries);
  const nextById = new Map(nextEntries);
  const tenantId = decodeURIComponent(readCookie("fastclean_session")) || "tenant_raisa_cleaning";
  const actor = readActorSnapshot();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const events = [];

  for (const [id, nextRecord] of nextById) {
    const previousRecord = previousById.get(id);
    const displayName = getRecordDisplayName(nextRecord, entityType);

    if (!previousRecord) {
      events.push(normalizeAuditEvent({
        ...actor,
        action: entityType === "appointment" ? "scheduled" : "created",
        changeSummary: summarizeChange("created", displayName),
        entityDisplayNameSnapshot: displayName,
        entityId: id,
        entityType,
        metadata: { collectionKey, snapshot: nextRecord },
        requestId,
        source: "app",
        tenantId
      }));
      continue;
    }

    const previousFields = flattenAuditRecord(previousRecord);
    const nextFields = flattenAuditRecord(nextRecord);

    for (const fieldName of new Set([...Object.keys(previousFields), ...Object.keys(nextFields)])) {
      const previousValue = previousFields[fieldName];
      const newValue = nextFields[fieldName];
      if (JSON.stringify(previousValue) === JSON.stringify(newValue)) {
        continue;
      }

      const action = fieldName === "status" ? "status_changed" : entityType === "appointment" && (fieldName === "date" || fieldName === "time") ? "rescheduled" : "updated";
      events.push(normalizeAuditEvent({
        ...actor,
        action,
        changeSummary: summarizeChange(action, displayName, fieldName, previousValue, newValue),
        entityDisplayNameSnapshot: displayName,
        entityId: id,
        entityType,
        fieldName,
        metadata: { collectionKey },
        newValue: safeAuditValue(fieldName, newValue),
        previousValue: safeAuditValue(fieldName, previousValue),
        requestId,
        source: "app",
        tenantId
      }));
    }
  }

  for (const [id, previousRecord] of previousById) {
    if (nextById.has(id)) {
      continue;
    }

    const displayName = getRecordDisplayName(previousRecord, entityType);
    events.push(normalizeAuditEvent({
      ...actor,
      action: "deleted",
      changeSummary: summarizeChange("deleted", displayName),
      entityDisplayNameSnapshot: displayName,
      entityId: id,
      entityType,
      metadata: { collectionKey, deletedSnapshot: previousRecord },
      requestId,
      source: "app",
      tenantId
    }));
  }

  if (events.length === 0) {
    return;
  }

  appendLocalAuditEvents(events);
  fetch("/api/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ events }),
    keepalive: JSON.stringify({ events }).length < 60000
  }).catch(() => undefined);
}

function appendLocalAuditEvents(events: ReturnType<typeof normalizeAuditEvent>[]) {
  const scopedKey = buildScopedStorageKey(auditStorageKey);
  let current: ReturnType<typeof normalizeAuditEvent>[] = [];
  try {
    current = JSON.parse(window.localStorage.getItem(scopedKey) ?? "[]") as ReturnType<typeof normalizeAuditEvent>[];
  } catch {
    current = [];
  }
  window.localStorage.setItem(scopedKey, JSON.stringify([...events, ...current].slice(0, 1000)));
}
