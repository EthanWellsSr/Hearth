import { createClient } from "@supabase/supabase-js";

// Server-only client. Uses the secret key, so it passes through RLS.
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);
