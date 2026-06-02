import { findUserBySessionToken } from "@/lib/auth/app-users";
import type { RoleCode } from "@/lib/permissions/permissions";
import type { PlanCode } from "@/lib/plans/plans";
import type { TenantContext } from "@/lib/tenant/types";

export type AppSession = {
  userId: string;
  name: string;
  email: string;
  role: RoleCode;
  tenant: TenantContext;
  accessibleCompanyIds: string[];
  accessibleLocationIds: string[];
  isPlatformAdmin?: boolean;
};

function toSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "fastclean";
}

export function createAppSession({
  companyName,
  planCode,
  role,
  sessionToken,
  userEmail
}: {
  companyName?: string;
  planCode?: PlanCode;
  role?: RoleCode;
  sessionToken?: string;
  userEmail?: string;
}): AppSession {
  const account = findUserBySessionToken(sessionToken);
  const resolvedCompanyName = companyName || account?.companyName || "FastClean Pro";
  const tenantSlug = toSlug(resolvedCompanyName);
  const tenant: TenantContext = {
    tenantId: account?.isPlatformAdmin ? "tenant_platform_fastclean" : `tenant_${tenantSlug}`,
    status: "active",
    planCode: planCode || account?.planCode || "professional",
    activeCompanyId: account?.isPlatformAdmin ? "company_platform_fastclean" : `company_${tenantSlug}`,
    activeLocationId: account?.isPlatformAdmin ? "location_platform_admin" : `location_${tenantSlug}_main`,
    companies: [
      {
        companyId: account?.isPlatformAdmin ? "company_platform_fastclean" : `company_${tenantSlug}`,
        locationIds: [account?.isPlatformAdmin ? "location_platform_admin" : `location_${tenantSlug}_main`]
      }
    ]
  };

  return {
    userId: sessionToken || "user_authenticated",
    name: account?.name || `${resolvedCompanyName} Admin`,
    email: account?.email || userEmail || "",
    role: role || account?.role || "owner",
    tenant,
    accessibleCompanyIds: tenant.companies.map((company) => company.companyId),
    accessibleLocationIds: tenant.companies.flatMap((company) => company.locationIds),
    isPlatformAdmin: account?.isPlatformAdmin ?? false
  };
}

export const fallbackSession = createAppSession({
  companyName: "FastClean Pro",
  planCode: "business",
  role: "owner",
  sessionToken: "platform_admin_rafael",
  userEmail: "rafael@fastcleanpro.com"
});
