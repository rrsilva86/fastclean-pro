import { canAccessModule } from "@/lib/plans/plans";
import { hasPermission, type Permission, type RoleCode } from "@/lib/permissions/permissions";
import type { AppModule } from "@/config/modules";
import type { TenantContext } from "@/lib/tenant/types";

export type AccessDecision = {
  allowed: boolean;
  reason?: "tenant_inactive" | "module_not_in_plan" | "missing_permission";
};

export function canAccessFeature({
  tenant,
  role,
  module,
  permission
}: {
  tenant: TenantContext;
  role: RoleCode;
  module: AppModule;
  permission: Permission | string;
}): AccessDecision {
  if (tenant.status === "suspended") {
    return { allowed: false, reason: "tenant_inactive" };
  }

  if (!canAccessModule(tenant.planCode, module)) {
    return { allowed: false, reason: "module_not_in_plan" };
  }

  if (!hasPermission(role, permission)) {
    return { allowed: false, reason: "missing_permission" };
  }

  return { allowed: true };
}
