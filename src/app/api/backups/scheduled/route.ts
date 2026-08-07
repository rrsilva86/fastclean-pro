import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const configuredToken = process.env.BACKUP_CRON_TOKEN;
  const requestToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(request.url).searchParams.get("token");

  if (!configuredToken || requestToken !== configuredToken) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const response = await fetch(new URL("/api/backups", request.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-fastclean-internal-backup-token": configuredToken
    },
    body: JSON.stringify({ mode: "create", source: "scheduled" })
  });

  const payload = await response.json().catch(() => ({}));
  return NextResponse.json(payload, { status: response.status });
}
