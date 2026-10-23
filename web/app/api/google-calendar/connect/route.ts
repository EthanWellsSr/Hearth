import { NextResponse } from "next/server";
import { beginGoogleConnection } from "@/lib/google-calendar-server";
export async function GET() {
  return NextResponse.redirect(await beginGoogleConnection());
}
