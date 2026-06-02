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

export function findUserByCredentials(email: string, password: string) {
  return appUserAccounts.find((account) => account.email.toLowerCase() === email.trim().toLowerCase() && account.password === password);
}

export function findUserBySessionToken(sessionToken: string | undefined) {
  return appUserAccounts.find((account) => account.sessionToken === sessionToken);
}

export function isKnownSession(sessionToken: string | undefined) {
  return Boolean(findUserBySessionToken(sessionToken) || sessionToken?.startsWith("tenant_"));
}
