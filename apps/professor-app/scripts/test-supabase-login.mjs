import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const envRaw = fs.readFileSync(".env", "utf8");

function getEnv(name) {
  const match = envRaw.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match ? match[1].trim() : "";
}

const SUPABASE_URL = getEnv("EXPO_PUBLIC_SUPABASE_URL");
const SUPABASE_ANON_KEY = getEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");

const email = process.argv[2];
const password = process.argv[3];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Faltam variáveis do Supabase no .env");
  process.exit(1);
}

if (!email || !password) {
  console.error("Uso: node scripts/test-supabase-login.mjs <email> <senha>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  console.error("LOGIN_ERROR:", error.message);
  process.exit(2);
}

console.log("LOGIN_OK");
console.log(
  JSON.stringify(
    {
      userId: data.user?.id ?? null,
      email: data.user?.email ?? null,
      session: Boolean(data.session),
    },
    null,
    2
  )
);
