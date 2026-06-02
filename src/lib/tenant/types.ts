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

export const initialTenantContext: TenantContext = {
  tenantId: "tenant_fastclean_pro",
  status: "active",
  planCode: "professional",
  activeCompanyId: "company_fastclean_pro",
  activeLocationId: "location_fastclean_pro",
  companies: [
    {
      companyId: "company_fastclean_pro",
      locationIds: ["location_fastclean_pro"]
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
