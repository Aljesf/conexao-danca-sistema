import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variavel de ambiente ausente: ${name}`);
  return v;
}

export function getAdminSupabase() {
  // Recomendado: usar SERVICE ROLE KEY somente em ambiente local/CI seguro.
  const url = mustGetEnv("SUPABASE_URL");
  const serviceKey = mustGetEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
