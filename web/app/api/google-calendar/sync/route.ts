import { timingSafeEqual } from "node:crypto";
import { runGoogleSync } from "@/lib/google-calendar-server";
export const maxDuration = 300;
export async function POST(request: Request) {
  const expected = process.env.GOOGLE_CALENDAR_SYNC_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${expected ?? ""}`);
  if (
    !expected ||
    actual.length !== wanted.length ||
    !timingSafeEqual(actual, wanted)
  )
    return new Response("Unauthorized", { status: 401 });
  try {
    await runGoogleSync();
    return Response.json({ ok: true });
  } catch {
    console.error("Scheduled Google Calendar synchronization failed");
    return Response.json({ error: "Synchronization failed" }, { status: 503 });
  }
}
