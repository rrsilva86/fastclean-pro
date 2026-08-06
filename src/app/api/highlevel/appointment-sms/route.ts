import { NextResponse } from "next/server";
import { sendHighLevelSms, syncClientToHighLevel } from "@/lib/highlevel/client";
import { defaultAppointmentMessageTemplates, renderAppointmentMessage, type AppointmentMessageTemplateKey } from "@/lib/highlevel/message-templates";
import type { ClientRecord } from "@/modules/clients/types";

export const runtime = "nodejs";

type AppointmentSmsPayload = {
  type?: AppointmentMessageTemplateKey;
  template?: string;
  client?: Pick<ClientRecord, "id" | "name" | "displayName" | "companyName" | "phone" | "email" | "addresses">;
  appointment?: {
    date?: string;
    time?: string;
    team?: string;
    service?: string;
    price?: string;
  };
  companyName?: string;
};

function safeReason(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  const message = record.message ?? record.error ?? record.error_description ?? record.msg;

  return typeof message === "string" ? message.slice(0, 240) : "";
}

function isTemplateKey(value: string | undefined): value is AppointmentMessageTemplateKey {
  return value === "appointment" || value === "arrival" || value === "departure" || value === "invoice";
}

export async function POST(request: Request) {
  let payload: AppointmentSmsPayload;

  try {
    payload = await request.json() as AppointmentSmsPayload;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  if (!process.env.HIGHLEVEL_PRIVATE_TOKEN || !process.env.HIGHLEVEL_LOCATION_ID) {
    return NextResponse.json({ ok: false, reason: "highlevel_environment_not_configured" }, { status: 503 });
  }

  if (!isTemplateKey(payload.type)) {
    return NextResponse.json({ ok: false, reason: "invalid_message_type" }, { status: 400 });
  }

  if (!payload.client?.phone && !payload.client?.email) {
    return NextResponse.json({ ok: false, reason: "missing_client_contact" }, { status: 400 });
  }

  const clientName = payload.client.displayName || payload.client.name || payload.client.companyName || "Customer";
  const template = payload.template?.trim() || defaultAppointmentMessageTemplates[payload.type];
  const message = renderAppointmentMessage(template, {
    clientName,
    companyName: payload.companyName || "FastClean Pro",
    appointmentDate: payload.appointment?.date ?? "",
    appointmentTime: payload.appointment?.time ?? "",
    team: payload.appointment?.team ?? "",
    service: payload.appointment?.service ?? "",
    price: payload.appointment?.price ?? ""
  }).trim();

  if (!message) {
    return NextResponse.json({ ok: false, reason: "missing_message" }, { status: 400 });
  }

  const syncResult = await syncClientToHighLevel({
    client: {
      id: payload.client.id ?? `appointment_sms_${Date.now()}`,
      name: payload.client.name ?? clientName,
      displayName: clientName,
      companyName: payload.client.companyName,
      phone: payload.client.phone,
      email: payload.client.email,
      addresses: payload.client.addresses,
      status: "lead",
      tag: "Appointment SMS"
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
    sentAt: new Date().toISOString()
  });
}
