import { NextResponse } from "next/server";
import {
  finishGoogleConnection,
  googleAppOrigin,
} from "@/lib/google-calendar-server";
export async function GET(request: Request) {
  try {
    const id = await finishGoogleConnection(new URL(request.url));
    return NextResponse.redirect(
      googleAppOrigin() +
        "/people/calendars?connection=" +
        encodeURIComponent(id),
    );
  } catch {
    console.error("Google Calendar OAuth callback failed");
    return NextResponse.redirect(
      googleAppOrigin() + "/people/calendars?error=connection",
    );
  }
}
