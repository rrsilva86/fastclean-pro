import type { ClientRecord } from "@/modules/clients/types";
import { compactHighLevelPayload, isValidHighLevelEmail, normalizeHighLevelPhone } from "@/lib/highlevel/validation";

const highLevelBaseUrl = "https://services.leadconnectorhq.com";
const highLevelApiVersion = "v3";

export type HighLevelSyncStatus = "synced" | "skipped" | "failed";

export type HighLevelSyncResult = {
  contactId?: string;
  status: HighLevelSyncStatus;
  syncedAt: string;
  warning?: string;
  detail?: string;
};

export type HighLevelSmsRequest = {
  contactId: string;
  message: string;
  locationId?: string;
};

export type HighLevelContactSyncInput = {
  client: ClientRecord;
  locationId?: string;
};

function getRequiredEnvironmentValue(name: string, fallback?: string) {
  const value = fallback ?? process.env[name];

  if (!value) {
    throw new Error(`${name} is required for the HighLevel integration.`);
  }

  return value;
}

function getHighLevelHeaders(token?: string) {
  return {
    Authorization: `Bearer ${getRequiredEnvironmentValue("HIGHLEVEL_PRIVATE_TOKEN", token)}`,
    Version: highLevelApiVersion,
    "Content-Type": "application/json",
    Accept: "application/json"
  };
}

async function postHighLevel<TResponse>(path: string, payload: Record<string, unknown>, token?: string) {
  const response = await fetch(`${highLevelBaseUrl}${path}`, {
    method: "POST",
    headers: getHighLevelHeaders(token),
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      body
    };
  }

  return {
    ok: true as const,
    status: response.status,
    body: body as TResponse
  };
}

function getContactId(response: unknown) {
  if (!response || typeof response !== "object") {
    return "";
  }

  const record = response as Record<string, unknown>;
  const contact = record.contact && typeof record.contact === "object" ? record.contact as Record<string, unknown> : undefined;
  const id = record.id ?? record.contactId ?? contact?.id;

  return typeof id === "string" ? id : "";
}

function getHighLevelErrorMessage(response: unknown) {
  if (!response || typeof response !== "object") {
    return "";
  }

  const record = response as Record<string, unknown>;
  const message = record.message ?? record.error ?? record.error_description ?? record.msg;

  return typeof message === "string" ? message.slice(0, 240) : "";
}

export async function syncClientToHighLevel({ client, locationId }: HighLevelContactSyncInput, token?: string): Promise<HighLevelSyncResult> {
  const normalizedPhone = normalizeHighLevelPhone(client.phone ?? "");
  const email = client.email?.trim() ?? "";
  const safeLocationId = getRequiredEnvironmentValue("HIGHLEVEL_LOCATION_ID", locationId);
  const warnings: string[] = [];

  if (normalizedPhone.warning) {
    warnings.push(normalizedPhone.warning);
  }

  if (email && !isValidHighLevelEmail(email)) {
    warnings.push("invalid_email");
  }

  if (!normalizedPhone.valid && !isValidHighLevelEmail(email)) {
    return {
      status: "skipped",
      syncedAt: new Date().toISOString(),
      warning: warnings.join(",") || "missing_valid_phone_or_email"
    };
  }

  const payload = compactHighLevelPayload({
    locationId: safeLocationId,
    firstName: client.name || client.displayName || client.companyName,
    name: client.displayName || client.name || client.companyName,
    companyName: client.companyName,
    phone: normalizedPhone.valid ? normalizedPhone.e164 : undefined,
    email: isValidHighLevelEmail(email) ? email : undefined,
    address1: client.addresses?.find((address) => address.primary)?.street ?? client.addresses?.[0]?.street,
    city: client.addresses?.find((address) => address.primary)?.city ?? client.addresses?.[0]?.city,
    state: client.addresses?.find((address) => address.primary)?.state ?? client.addresses?.[0]?.state,
    postalCode: client.addresses?.find((address) => address.primary)?.postalCode ?? client.addresses?.[0]?.postalCode
  });

  const result = await postHighLevel<{ id?: string; contactId?: string; contact?: { id?: string } }>("/contacts/upsert", payload, token);

  if (!result.ok) {
    return {
      status: "failed",
      syncedAt: new Date().toISOString(),
      warning: `highlevel_upsert_failed_${result.status}`,
      detail: getHighLevelErrorMessage(result.body)
    };
  }

  return {
    contactId: getContactId(result.body),
    status: "synced",
    syncedAt: new Date().toISOString(),
    warning: warnings.join(",") || undefined
  };
}

export async function sendHighLevelSms({ contactId, message, locationId }: HighLevelSmsRequest, token?: string) {
  const payload = compactHighLevelPayload({
    type: "SMS",
    contactId,
    message,
    locationId: getRequiredEnvironmentValue("HIGHLEVEL_LOCATION_ID", locationId)
  });

  return postHighLevel("/conversations/messages", payload, token);
}

export const highLevelEndpointVersions = {
  sendSms: {
    method: "POST",
    path: "/conversations/messages",
    version: highLevelApiVersion,
    scope: "conversations/message.write"
  },
  upsertContact: {
    method: "POST",
    path: "/contacts/upsert",
    version: highLevelApiVersion,
    scope: "contacts.write"
  }
} as const;
