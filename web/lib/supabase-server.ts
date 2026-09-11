import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// User-scoped Supabase client. Reads the logged-in user's session from cookies,
// so queries run AS that user and RLS policies apply. Use this for per-user
// feature code (todos, groceries, ...) once the client flip lands.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component (can't set cookies); the middleware
            // refreshes the session instead. Safe to ignore.
          }
        },
      },
    }
  );
}
