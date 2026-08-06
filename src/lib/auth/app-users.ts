import type { PlanCode } from "@/lib/plans/plans";
import type { RoleCode } from "@/lib/permissions/permissions";

export type AppUserAccount = {
  email: string;
  password: string;
  sessionToken: string;
  name: string;
  companyName: string;
  role: RoleCode;
  planCode: PlanCode;
  isPlatformAdmin: boolean;
};

export type PasswordOverride = {
  email: string;
  passwordHash: string;
  updatedAt: string;
  sessionToken?: string;
};

export type EmailOverride = {
  email: string;
  originalEmail: string;
  sessionToken: string;
  updatedAt: string;
};

export const passwordOverridesStorageKey = "fastclean_auth_password_overrides";
export const emailOverridesStorageKey = "fastclean_auth_email_overrides";

export const appUserAccounts: AppUserAccount[] = [
  {
    email: "rafael@fastcleanpro.com",
    password: "Admin@123",
    sessionToken: "platform_admin_rafael",
    name: "Rafael Silva",
    companyName: "FastClean Pro",
    role: "owner",
    planCode: "business",
    isPlatformAdmin: true
  },
  {
    email: "raisa@fastcleanpro.com",
    password: "Raisa@123",
    sessionToken: "tenant_raisa_cleaning",
    name: "Raisa Silva",
    companyName: "Raisa Cleaning Co.",
    role: "owner",
    planCode: "professional",
    isPlatformAdmin: false
  }
];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return "";
  }

  return document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${name}=`))
    ?.split("=")[1] ?? "";
}

function buildScopedKey(key: string) {
  if (key === passwordOverridesStorageKey || key === emailOverridesStorageKey) {
    return key;
  }

  const sessionToken = decodeURIComponent(readCookie("fastclean_session"));
  return sessionToken ? `${sessionToken}:${key}` : key;
}

export async function hashPasswordForStorage(email: string, password: string) {
  const payload = new TextEncoder().encode(`${email.trim().toLowerCase()}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", payload);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function readLocalAuthRecords<T>(key: string) {
  if (typeof window === "undefined") {
    return [] as T[];
  }

  try {
    const records = JSON.parse(window.localStorage.getItem(buildScopedKey(key)) ?? "[]") as T[];
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function writeLocalAuthRecords<T>(key: string, records: T[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(buildScopedKey(key), JSON.stringify(records));
}

async function readRemoteAuthRecords<T>(key: string) {
  if (typeof window === "undefined") {
    return [] as T[];
  }

  try {
    const response = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
      cache: "no-store",
      credentials: "same-origin"
    });

    if (!response.ok) {
      return readLocalAuthRecords<T>(key);
    }

    const payload = await response.json() as { records?: T[] };
    const records = Array.isArray(payload.records) ? payload.records : [];
    writeLocalAuthRecords(key, records);

    return records;
  } catch {
    return readLocalAuthRecords<T>(key);
  }
}

async function saveAuthRecords<T>(key: string, records: T[]) {
  writeLocalAuthRecords(key, records);

  await fetch(`/api/storage/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ records })
  });
}

export function readLocalPasswordOverrides() {
  return readLocalAuthRecords<PasswordOverride>(passwordOverridesStorageKey);
}

export function readLocalEmailOverrides() {
  return readLocalAuthRecords<EmailOverride>(emailOverridesStorageKey);
}

export async function readRemotePasswordOverrides() {
  return readRemoteAuthRecords<PasswordOverride>(passwordOverridesStorageKey);
}

export async function readRemoteEmailOverrides() {
  return readRemoteAuthRecords<EmailOverride>(emailOverridesStorageKey);
}

export async function savePasswordOverrides(records: PasswordOverride[]) {
  await saveAuthRecords(passwordOverridesStorageKey, records);
}

export async function saveEmailOverrides(records: EmailOverride[]) {
  await saveAuthRecords(emailOverridesStorageKey, records);
}

function applyEmailOverride(account: AppUserAccount, emailOverrides: EmailOverride[]) {
  const override = emailOverrides.find((item) => item.sessionToken === account.sessionToken);
  return override ? { ...account, email: override.email } : account;
}

export function resolveUserByEmail(email: string, emailOverrides = readLocalEmailOverrides()) {
  const normalizedEmail = normalizeEmail(email);
  const overriddenAccount = emailOverrides.find((item) => normalizeEmail(item.email) === normalizedEmail);

  if (overriddenAccount) {
    const account = appUserAccounts.find((item) => item.sessionToken === overriddenAccount.sessionToken);
    return account ? applyEmailOverride(account, emailOverrides) : undefined;
  }

  const account = appUserAccounts.find((item) => item.email.toLowerCase() === normalizedEmail);
  return account ? applyEmailOverride(account, emailOverrides) : undefined;
}

export function findUserByCredentials(email: string, password: string) {
  return appUserAccounts.find((account) => account.email.toLowerCase() === normalizeEmail(email) && account.password === password);
}

export async function findUserByCredentialsWithOverrides(email: string, password: string, overrides = readLocalPasswordOverrides(), emailOverrides = readLocalEmailOverrides()) {
  const account = resolveUserByEmail(email, emailOverrides);

  if (!account) {
    return undefined;
  }

  const baseAccount = appUserAccounts.find((item) => item.sessionToken === account.sessionToken);
  const override = overrides.find(
    (item) =>
      item.sessionToken === account.sessionToken ||
      normalizeEmail(item.email) === normalizeEmail(account.email) ||
      normalizeEmail(item.email) === normalizeEmail(baseAccount?.email ?? "")
  );
  if (!override) {
    return account.password === password ? account : undefined;
  }

  const stablePasswordHash = await hashPasswordForStorage(override.sessionToken ?? account.sessionToken, password);
  const legacyPasswordHash = await hashPasswordForStorage(override.email, password);
  return override.passwordHash === stablePasswordHash || override.passwordHash === legacyPasswordHash ? account : undefined;
}

export async function changeUserPassword(email: string, currentPassword: string, nextPassword: string) {
  const overrides = await readRemotePasswordOverrides();
  const emailOverrides = await readRemoteEmailOverrides();
  const account = await findUserByCredentialsWithOverrides(email, currentPassword, overrides, emailOverrides);

  if (!account) {
    return { ok: false as const, reason: "current_password_invalid" };
  }

  const normalizedEmail = normalizeEmail(email);
  const nextOverride: PasswordOverride = {
    email: normalizeEmail(account.email),
    passwordHash: await hashPasswordForStorage(account.sessionToken, nextPassword),
    sessionToken: account.sessionToken,
    updatedAt: new Date().toISOString()
  };
  const records = [...overrides.filter((item) => item.sessionToken !== account.sessionToken && normalizeEmail(item.email) !== normalizedEmail), nextOverride];

  await savePasswordOverrides(records);
  return { ok: true as const };
}

export async function changeUserEmail(currentEmail: string, currentPassword: string, nextEmail: string) {
  const normalizedNextEmail = normalizeEmail(nextEmail);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedNextEmail);

  if (!validEmail) {
    return { ok: false as const, reason: "invalid_email" };
  }

  const passwordOverrides = await readRemotePasswordOverrides();
  const emailOverrides = await readRemoteEmailOverrides();
  const account = await findUserByCredentialsWithOverrides(currentEmail, currentPassword, passwordOverrides, emailOverrides);

  if (!account) {
    return { ok: false as const, reason: "current_password_invalid" };
  }

  const existingAccount = resolveUserByEmail(normalizedNextEmail, emailOverrides);
  if (existingAccount && existingAccount.sessionToken !== account.sessionToken) {
    return { ok: false as const, reason: "email_in_use" };
  }

  const records = [
    ...emailOverrides.filter((item) => item.sessionToken !== account.sessionToken),
    {
      email: normalizedNextEmail,
      originalEmail: appUserAccounts.find((item) => item.sessionToken === account.sessionToken)?.email ?? account.email,
      sessionToken: account.sessionToken,
      updatedAt: new Date().toISOString()
    }
  ];

  await saveEmailOverrides(records);
  return { ok: true as const, email: normalizedNextEmail };
}

export function findUserBySessionToken(sessionToken: string | undefined) {
  return appUserAccounts.find((account) => account.sessionToken === sessionToken);
}

export function isKnownSession(sessionToken: string | undefined) {
  return Boolean(findUserBySessionToken(sessionToken) || sessionToken?.startsWith("tenant_"));
}
