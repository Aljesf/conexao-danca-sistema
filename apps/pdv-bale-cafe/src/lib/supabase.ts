import { createClient } from "@supabase/supabase-js";
import { ENV } from "../config/env";

const FALLBACK_SUPABASE_URL = "https://example.invalid";
const FALLBACK_SUPABASE_ANON_KEY = "missing-supabase-anon-key";

export const hasSupabaseConfig = Boolean(ENV.SUPABASE_URL && ENV.SUPABASE_ANON_KEY);

export const supabase = createClient(
  hasSupabaseConfig ? ENV.SUPABASE_URL : FALLBACK_SUPABASE_URL,
  hasSupabaseConfig ? ENV.SUPABASE_ANON_KEY : FALLBACK_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
