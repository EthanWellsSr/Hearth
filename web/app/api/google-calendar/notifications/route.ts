import { after } from "next/server";
import { receiveGoogleNotification } from "@/lib/google-calendar-server";
export const maxDuration = 300;
export async function POST(request: Request) {
  const headers = new Headers(request.headers);
  after(async () => {
    await receiveGoogleNotification(headers).catch(() =>
      console.error("Google Calendar notification processing failed"),
    );
  });
  return new Response(null, { status: 204 });
}
