import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function hasTable(supabase: ReturnType<typeof getSupabaseAdminClient>, table: string) {
  const { data, error } = await supabase
    .from("information_schema.tables")
    .select("table_name")
    .eq("table_schema", "public")
    .eq("table_name", table)
    .maybeSingle();

  return { ok: !!data && !error, error };
}

async function hasColumn(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  table: string,
  column: string,
) {
  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", table)
    .eq("column_name", column)
    .maybeSingle();

  return { ok: !!data && !error, error };
}

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();

    const checks: CheckItem[] = [];

    const tServicos = await hasTable(supabase, "servicos");
    checks.push({
      key: "table.servicos",
      ok: tServicos.ok,
      message: tServicos.ok ? "Tabela servicos OK" : "Falta tabela public.servicos",
      sql_sugerido: tServicos.ok ? undefined : "CREATE TABLE public.servicos (...);",
    });

    const tMatriculas = await hasTable(supabase, "matriculas");
    checks.push({
      key: "table.matriculas",
      ok: tMatriculas.ok,
      message: tMatriculas.ok ? "Tabela matriculas OK" : "Falta tabela public.matriculas",
    });

    const tPrecos = await hasTable(supabase, "matricula_precos_servico");
    checks.push({
      key: "table.matricula_precos_servico",
      ok: tPrecos.ok,
      message: tPrecos.ok
        ? "Tabela matricula_precos_servico OK"
        : "Falta tabela public.matricula_precos_servico",
      sql_sugerido: tPrecos.ok ? undefined : "CREATE TABLE public.matricula_precos_servico (...);",
    });

    const cPrecosAno = await hasColumn(supabase, "matricula_precos_servico", "ano_referencia");
    checks.push({
      key: "col.matricula_precos_servico.ano_referencia",
      ok: cPrecosAno.ok,
      message: cPrecosAno.ok
        ? "Coluna matricula_precos_servico.ano_referencia OK"
        : "Falta coluna matricula_precos_servico.ano_referencia",
      sql_sugerido: cPrecosAno.ok
        ? undefined
        : "ALTER TABLE public.matricula_precos_servico ADD COLUMN ano_referencia integer;",
    });

    const cMatServ = await hasColumn(supabase, "matriculas", "servico_id");
    checks.push({
      key: "col.matriculas.servico_id",
      ok: cMatServ.ok,
      message: cMatServ.ok ? "Coluna matriculas.servico_id OK" : "Falta coluna matriculas.servico_id",
      sql_sugerido: cMatServ.ok ? undefined : "ALTER TABLE public.matriculas ADD COLUMN servico_id bigint;",
    });

    const cMatPlano = await hasColumn(supabase, "matriculas", "plano_id");
    checks.push({
      key: "col.matriculas.plano_id",
      ok: cMatPlano.ok,
      message: cMatPlano.ok ? "Coluna matriculas.plano_id OK" : "Falta coluna matriculas.plano_id",
      sql_sugerido: cMatPlano.ok ? undefined : "ALTER TABLE public.matriculas ADD COLUMN plano_id bigint;",
    });

    const ok = checks.every((c) => c.ok);

    return NextResponse.json({ ok, checks }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: "schema_check_failed", message }, { status: 500 });
  }
}
