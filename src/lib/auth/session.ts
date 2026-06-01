import { demoTenantContext } from "@/lib/tenant/types";
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
};

export const demoUsers: Record<RoleCode, Omit<AppSession, "tenant" | "accessibleCompanyIds" | "accessibleLocationIds">> = {
  owner: {
    userId: "user_demo_owner",
    name: "Rafael Silva",
    email: "owner@fastcleanpro.com",
    role: "owner"
  },
  manager: {
    userId: "user_demo_manager",
    name: "Mariana Costa",
    email: "manager@fastcleanpro.com",
    role: "manager"
  },
  office: {
    userId: "user_demo_office",
    name: "Sofia Admin",
    email: "office@fastcleanpro.com",
    role: "office"
  },
  driver: {
    userId: "user_demo_driver",
    name: "John Miller",
    email: "driver@fastcleanpro.com",
    role: "driver"
  },
  helper: {
    userId: "user_demo_helper",
    name: "Maria Santos",
    email: "helper@fastcleanpro.com",
    role: "helper"
  }
};

export function createDemoSession(role: RoleCode = "owner", planCode: PlanCode = demoTenantContext.planCode, companyName?: string): AppSession {
  const user = demoUsers[role] ?? demoUsers.owner;
  const tenantId = companyName ? `tenant_${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "fastclean"}` : demoTenantContext.tenantId;
  const tenant = {
    ...demoTenantContext,
    tenantId,
    planCode,
    status: "active" as const
  };

  return {
    ...user,
    name: companyName ? `${companyName} Admin` : user.name,
    tenant,
    accessibleCompanyIds: tenant.companies.map((company) => company.companyId),
    accessibleLocationIds: tenant.companies.flatMap((company) => company.locationIds)
  };
}

export const demoSession = createDemoSession("owner");
