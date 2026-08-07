import { NextResponse } from "next/server";
import { sendHighLevelSms, syncClientToHighLevel } from "@/lib/highlevel/client";
import type { ClientRecord } from "@/modules/clients/types";

export const runtime = "nodejs";

type EstimateSmsPayload = {
  client?: Pick<ClientRecord, "id" | "name" | "displayName" | "companyName" | "phone" | "email" | "addresses">;
  estimate?: {
    number?: string;
    total?: string;
    publicLink?: string;
  };
  message?: string;
};

function safeReason(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  const message = record.message ?? record.error ?? record.error_description ?? record.msg;

  return typeof message === "string" ? message.slice(0, 240) : "";
}

export async function POST(request: Request) {
  let payload: EstimateSmsPayload;

  try {
    payload = await request.json() as EstimateSmsPayload;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  if (!process.env.HIGHLEVEL_PRIVATE_TOKEN || !process.env.HIGHLEVEL_LOCATION_ID) {
    return NextResponse.json({ ok: false, reason: "highlevel_environment_not_configured" }, { status: 503 });
  }

  if (!payload.client?.phone && !payload.client?.email) {
    return NextResponse.json({ ok: false, reason: "missing_client_contact" }, { status: 400 });
  }

  const clientName = payload.client.displayName || payload.client.name || payload.client.companyName || "Customer";
  const message = payload.message?.trim();

  if (!message) {
    return NextResponse.json({ ok: false, reason: "missing_message" }, { status: 400 });
  }

  const syncResult = await syncClientToHighLevel({
    client: {
      id: payload.client.id ?? `estimate_sms_${Date.now()}`,
      name: payload.client.name ?? clientName,
      displayName: clientName,
      companyName: payload.client.companyName,
      phone: payload.client.phone,
      email: payload.client.email,
      addresses: payload.client.addresses,
      status: "lead",
      tag: "Estimate SMS"
    }
  });

  if (syncResult.status !== "synced" || !syncResult.contactId) {
    return NextResponse.json({ ok: false, reason: syncResult.warning || "contact_sync_failed", detail: syncResult.detail }, { status: 502 });
  }

  const smsResult = await sendHighLevelSms({
    contactId: syncResult.contactId,
    message
  });

  if (!smsResult.ok) {
    return NextResponse.json({ ok: false, reason: `sms_send_failed_${smsResult.status}`, detail: safeReason(smsResult.body) }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    contactId: syncResult.contactId,
    estimateNumber: payload.estimate?.number,
    sentAt: new Date().toISOString()
  });
}
