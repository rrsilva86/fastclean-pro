export type RoleCode = "owner" | "manager" | "office" | "driver" | "helper";

export const permissions = [
  "dashboard.read",
  "calendar.read",
  "appointments.read",
  "appointments.create",
  "appointments.update",
  "appointments.cancel",
  "clients.read",
  "clients.create",
  "clients.update",
  "clients.delete",
  "clients.security_codes.read",
  "teams.read",
  "teams.manage",
  "employees.read",
  "employees.manage",
  "invoices.read",
  "invoices.manage",
  "payroll.read",
  "payroll.manage",
  "messages.read",
  "messages.manage",
  "reports.read",
  "documents.read",
  "documents.manage",
  "crm.read",
  "crm.manage",
  "settings.manage",
  "billing.manage",
  "audit_logs.read"
] as const;

export type Permission = (typeof permissions)[number];

export const defaultRolePermissions: Record<RoleCode, Permission[]> = {
  owner: [...permissions],
  manager: [
    "dashboard.read",
    "calendar.read",
    "appointments.read",
    "appointments.create",
    "appointments.update",
    "appointments.cancel",
    "clients.read",
    "clients.create",
    "clients.update",
    "clients.security_codes.read",
    "teams.read",
    "teams.manage",
    "employees.read",
    "employees.manage",
    "invoices.read",
    "invoices.manage",
    "payroll.read",
    "payroll.manage",
    "messages.read",
    "messages.manage",
    "reports.read",
    "documents.read",
    "documents.manage",
    "crm.read",
    "crm.manage",
    "audit_logs.read"
  ],
  office: [
    "dashboard.read",
    "calendar.read",
    "appointments.read",
    "appointments.create",
    "appointments.update",
    "clients.read",
    "clients.create",
    "clients.update",
    "teams.read",
    "employees.read",
    "invoices.read",
    "invoices.manage",
    "messages.read",
    "messages.manage",
    "crm.read",
    "crm.manage"
  ],
  driver: ["calendar.read", "appointments.read", "appointments.update", "clients.read", "clients.security_codes.read", "teams.read"],
  helper: ["calendar.read", "appointments.read", "appointments.update"]
};

export function hasPermission(role: RoleCode, permission: Permission | string) {
  return defaultRolePermissions[role]?.includes(permission as Permission) ?? false;
}

export function hasAnyPermission(role: RoleCode, requiredPermissions: string[]) {
  return requiredPermissions.some((permission) => hasPermission(role, permission));
}
