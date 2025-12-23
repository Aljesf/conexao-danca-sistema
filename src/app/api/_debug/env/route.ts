import { NextResponse } from "next/server";

export async function GET() {
  const dbUrl = process.env.SUPABASE_DB_URL ?? "";
  const hasDbUrl = dbUrl.length > 0;
  const prefix = hasDbUrl ? dbUrl.slice(0, 18) : "";

  return NextResponse.json({
    ok: true,
    has_SUPABASE_DB_URL: hasDbUrl,
    SUPABASE_DB_URL_prefix: prefix,
    has_SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
    has_SUPABASE_ANON_KEY: Boolean(process.env.SUPABASE_ANON_KEY),
    has_SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
