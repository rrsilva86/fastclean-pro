const processedWebhookIds = new Set<string>();

export function getHighLevelWebhookId(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;
  const candidates = [record.webhookId, record.id, record.eventId, record.messageId];
  const id = candidates.find((candidate) => typeof candidate === "string" && candidate.trim());

  return typeof id === "string" ? id : "";
}

export function wasHighLevelWebhookProcessed(webhookId: string) {
  return Boolean(webhookId && processedWebhookIds.has(webhookId));
}

export function markHighLevelWebhookProcessed(webhookId: string) {
  if (webhookId) {
    processedWebhookIds.add(webhookId);
  }
}
