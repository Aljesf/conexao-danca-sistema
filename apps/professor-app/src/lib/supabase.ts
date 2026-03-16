import { createClient } from "@supabase/supabase-js";
import { ENV } from "../config/env";

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  // Validacao de ambiente acontece na tela de login.
}

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
