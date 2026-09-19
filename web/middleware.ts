import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  normalizeInviteCode,
  PENDING_INVITE_COOKIE,
  PENDING_INVITE_MAX_AGE_SECONDS,
} from "@/lib/invite";

// Runs on every request. Keeps the user's session cookie fresh (refreshes the
// JWT before it expires) so both the browser and server always see a valid login.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Verifies the JWT signature and refreshes near-expiry sessions without an
  // Auth-server round trip when the project uses asymmetric signing keys.
  await supabase.auth.getClaims();

  const invitationMatch = request.nextUrl.pathname.match(/^\/invite\/([^/]+)$/);
  const inviteCode = normalizeInviteCode(invitationMatch?.[1]);
  if (inviteCode) {
    response.cookies.set(PENDING_INVITE_COOKIE, inviteCode, {
      httpOnly: true,
      maxAge: PENDING_INVITE_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
