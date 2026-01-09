import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type CheckItem = {
  key: string;
  ok: boolean;
  message: string;
  sql_sugerido?: string;
};

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error("ENV ausente: NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRole, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  try {
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase.rpc("schema_healthcheck_matriculas");
    if (error) {
      return NextResponse.json({ ok: false, error: "schema_check_failed", message: error.message }, { status: 500 });
    }

    const checks = (data ?? []) as CheckItem[];
    const ok = checks.every((item) => item.ok === true);

    return NextResponse.json({ ok, checks }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: "schema_check_failed", message }, { status: 500 });
  }
}
