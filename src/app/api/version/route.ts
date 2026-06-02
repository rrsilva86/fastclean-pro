import { NextResponse } from "next/server";
import { appVersion } from "@/config/app-version";

export function GET() {
  return NextResponse.json({
    app: "FastClean Pro",
    ...appVersion
  });
}
