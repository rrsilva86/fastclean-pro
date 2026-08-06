import { NextResponse } from "next/server";
import { verifyHighLevelWebhookSignature } from "@/lib/highlevel/webhook-signature";
import { getHighLevelWebhookId, markHighLevelWebhookProcessed, wasHighLevelWebhookProcessed } from "@/lib/highlevel/webhook-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verification = verifyHighLevelWebhookSignature(request.headers, rawBody);

  if (!verification.ok) {
    return NextResponse.json({ ok: false, reason: "invalid_signature" }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const webhookId = getHighLevelWebhookId(payload);

  if (webhookId && wasHighLevelWebhookProcessed(webhookId)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  markHighLevelWebhookProcessed(webhookId);

  queueMicrotask(() => {
    void payload;
  });

  return NextResponse.json({ ok: true });
}
