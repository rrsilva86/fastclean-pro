import { NextResponse } from "next/server";
import { sendHighLevelSms, syncClientToHighLevel } from "@/lib/highlevel/client";
import { isValidHighLevelEmail, normalizeHighLevelPhone } from "@/lib/highlevel/validation";
import type { ClientRecord } from "@/modules/clients/types";

export const runtime = "nodejs";

type TestSmsPayload = {
  name?: string;
  phone?: string;
  email?: string;
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

function createTestClient(payload: TestSmsPayload): ClientRecord {
  return {
    id: `highlevel_sms_test_${Date.now()}`,
    name: payload.name?.trim() || "FastClean SMS Test",
    displayName: payload.name?.trim() || "FastClean SMS Test",
    phone: payload.phone?.trim() ?? "",
    email: payload.email?.trim() ?? "",
    status: "lead",
    tag: "HighLevel SMS Test",
    wantsSms: true,
    wantsEmail: false
  };
}

export async function POST(request: Request) {
  let payload: TestSmsPayload;

  try {
    payload = await request.json() as TestSmsPayload;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const message = payload.message?.trim() ?? "";
  const normalizedPhone = normalizeHighLevelPhone(payload.phone ?? "");
  const email = payload.email?.trim() ?? "";

  if (!message) {
    return NextResponse.json({ ok: false, reason: "missing_message" }, { status: 400 });
  }

  if (!normalizedPhone.valid && !isValidHighLevelEmail(email)) {
    return NextResponse.json({ ok: false, reason: "missing_valid_phone_or_email" }, { status: 400 });
  }

  if (!process.env.HIGHLEVEL_PRIVATE_TOKEN || !process.env.HIGHLEVEL_LOCATION_ID) {
    return NextResponse.json({ ok: false, reason: "highlevel_environment_not_configured" }, { status: 503 });
  }

  const syncResult = await syncClientToHighLevel({ client: createTestClient(payload) });

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
    syncedAt: syncResult.syncedAt
  });
}
