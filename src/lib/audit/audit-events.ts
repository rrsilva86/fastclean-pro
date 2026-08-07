export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "deactivated"
  | "reactivated"
  | "scheduled"
  | "rescheduled"
  | "cancelled"
  | "completed"
  | "status_changed"
  | "payment_recorded"
  | "payment_reversed"
  | "invoice_voided"
  | "permission_changed"
  | "integration_changed"
  | "document_uploaded"
  | "document_deleted"
  | "login_security_changed"
  | "pricing_calculated"
  | "pricing_overridden"
  | "quote_saved"
  | "backup_created"
  | "backup_downloaded"
  | "backup_restored"
  | "backup_failed";

export type AuditEntityType =
  | "customer"
  | "appointment"
  | "recurring_schedule"
  | "invoice"
  | "payment"
  | "employee"
  | "team"
  | "service"
  | "document"
  | "integration"
  | "settings"
  | "permissions"
  | "automation"
  | "communication"
  | "pricing"
  | "quote"
  | "backup";

export type AuditEvent = {
  id: string;
  tenantId: string;
  companyId?: string;
  locationId?: string;
  actorUserId?: string;
  actorDisplayNameSnapshot?: string;
  actorRoleSnapshot?: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityDisplayNameSnapshot?: string;
  fieldName?: string;
  previousValue?: unknown;
  newValue?: unknown;
  changeSummary: string;
  metadata: Record<string, unknown>;
  source: "app" | "api" | "backup" | "restore" | "system";
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  createdAt: string;
};

export const auditStorageKey = "fastclean_audit_events";

const sensitiveFieldPatterns = [
  /password/i,
  /token/i,
  /secret/i,
  /api.?key/i,
  /private/i,
  /card/i,
  /cvc/i,
  /ssn/i,
  /tax.?id/i,
  /bank.?account/i,
  /routing/i
];

export function isSensitiveField(fieldName: string) {
  return sensitiveFieldPatterns.some((pattern) => pattern.test(fieldName));
}

export function safeAuditValue(fieldName: string, value: unknown) {
  if (value === undefined) {
    return null;
  }

  if (isSensitiveField(fieldName)) {
    return "[masked]";
  }

  if (typeof value === "string" && value.length > 400) {
    return `${value.slice(0, 400)}...`;
  }

  return value;
}

export function createAuditId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `audit_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function normalizeAuditEvent(event: Partial<AuditEvent> & Pick<AuditEvent, "action" | "entityType" | "entityId" | "changeSummary">): AuditEvent {
  return {
    id: event.id ?? createAuditId(),
    tenantId: event.tenantId ?? "tenant_unknown",
    companyId: event.companyId,
    locationId: event.locationId,
    actorUserId: event.actorUserId,
    actorDisplayNameSnapshot: event.actorDisplayNameSnapshot,
    actorRoleSnapshot: event.actorRoleSnapshot,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    entityDisplayNameSnapshot: event.entityDisplayNameSnapshot,
    fieldName: event.fieldName,
    previousValue: event.previousValue,
    newValue: event.newValue,
    changeSummary: event.changeSummary,
    metadata: event.metadata ?? {},
    source: event.source ?? "app",
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    requestId: event.requestId,
    createdAt: event.createdAt ?? new Date().toISOString()
  };
}
