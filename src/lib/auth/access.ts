import { canAccessFeature } from "@/lib/tenant/scope";
import { fallbackSession } from "@/lib/auth/session";
import type { AppModule } from "@/config/modules";
import type { Permission } from "@/lib/permissions/permissions";

export function getCurrentSession() {
  return fallbackSession;
}

export function canCurrentUserAccess(module: AppModule, permission: Permission | string) {
  const session = getCurrentSession();

  return canAccessFeature({
    tenant: session.tenant,
    role: session.role,
    module,
    permission
  });
}
