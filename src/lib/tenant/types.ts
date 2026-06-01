import type { PlanCode } from "@/lib/plans/plans";

export type TenantStatus = "trial" | "active" | "past_due" | "suspended";

export type CompanyContext = {
  companyId: string;
  locationIds: string[];
};

export type TenantContext = {
  tenantId: string;
  status: TenantStatus;
  planCode: PlanCode;
  companies: CompanyContext[];
  activeCompanyId: string;
  activeLocationId?: string;
};

export const demoTenantContext: TenantContext = {
  tenantId: "tenant_demo_fastclean",
  status: "trial",
  planCode: "professional",
  activeCompanyId: "company_demo_fastclean",
  activeLocationId: "location_demo_boston",
  companies: [
    {
      companyId: "company_demo_fastclean",
      locationIds: ["location_demo_boston", "location_demo_cambridge"]
    },
    {
      companyId: "company_demo_franchise",
      locationIds: ["location_demo_miami"]
    }
  ]
};

export function belongsToTenant(context: TenantContext, tenantId: string) {
  return context.tenantId === tenantId;
}

export function canUseCompany(context: TenantContext, companyId: string) {
  return context.companies.some((company) => company.companyId === companyId);
}

export function canUseLocation(context: TenantContext, locationId: string) {
  return context.companies.some((company) => company.locationIds.includes(locationId));
}
