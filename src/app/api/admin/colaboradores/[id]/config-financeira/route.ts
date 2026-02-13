import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type Body = {
  gera_folha: boolean;
  dia_fechamento: number;
  dia_pagamento: number;
  pagamento_no_mes_seguinte: boolean;
  politica_desconto_cartao: "DESCONTA_NA_FOLHA" | "NAO_DESCONTA" | "MANUAL";
  politica_corte_cartao: "POR_DIA_FECHAMENTO" | "SEM_CORTE";
  tipo_remuneracao: "MENSAL" | "HORISTA";
  valor_hora_centavos: number;
  salario_base_centavos: number;
};

function toInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
}

function asPoliticaDesconto(
  value: unknown,
): "DESCONTA_NA_FOLHA" | "NAO_DESCONTA" | "MANUAL" {
  if (value === "DESCONTA_NA_FOLHA" || value === "NAO_DESCONTA" || value === "MANUAL") return value;
  return "DESCONTA_NA_FOLHA";
}

function asPoliticaCorte(value: unknown): "POR_DIA_FECHAMENTO" | "SEM_CORTE" {
  if (value === "POR_DIA_FECHAMENTO" || value === "SEM_CORTE") return value;
  return "POR_DIA_FECHAMENTO";
}

function asTipoRemuneracao(value: unknown): "MENSAL" | "HORISTA" {
  if (value === "MENSAL" || value === "HORISTA") return value;
  return "MENSAL";
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const { id: rawId } = await ctx.params;
  const colaboradorId = toInt(rawId);
  if (!colaboradorId || colaboradorId <= 0) {
    return NextResponse.json({ error: "colaborador_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Partial<Body> | null;
  if (!body) {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const payload = {
    gera_folha: asBool(body.gera_folha, false),
    dia_fechamento: clampInt(Number(body.dia_fechamento ?? 31), 1, 31),
    dia_pagamento: clampInt(Number(body.dia_pagamento ?? 5), 1, 31),
    pagamento_no_mes_seguinte: asBool(body.pagamento_no_mes_seguinte, true),
    politica_desconto_cartao: asPoliticaDesconto(body.politica_desconto_cartao),
    politica_corte_cartao: asPoliticaCorte(body.politica_corte_cartao),
    tipo_remuneracao: asTipoRemuneracao(body.tipo_remuneracao),
    valor_hora_centavos: clampInt(Number(body.valor_hora_centavos ?? 0), 0, 999999999),
    salario_base_centavos: clampInt(Number(body.salario_base_centavos ?? 0), 0, 999999999),
  };

  const supabase = getSupabaseAdmin();

  const { data: colaborador, error: colaboradorErr } = await supabase
    .from("colaboradores")
    .select("id")
    .eq("id", colaboradorId)
    .maybeSingle();

  if (colaboradorErr) return NextResponse.json({ error: colaboradorErr.message }, { status: 500 });
  if (!colaborador) return NextResponse.json({ error: "colaborador_nao_encontrado" }, { status: 404 });

  const { data: existing, error: existingErr } = await supabase
    .from("colaborador_config_financeira")
    .select("id")
    .eq("colaborador_id", colaboradorId)
    .maybeSingle();

  if (existingErr) return NextResponse.json({ error: existingErr.message }, { status: 500 });

  if (!existing) {
    const { error: insErr } = await supabase
      .from("colaborador_config_financeira")
      .insert({ colaborador_id: colaboradorId, ...payload });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  } else {
    const { error: updErr } = await supabase
      .from("colaborador_config_financeira")
      .update(payload)
      .eq("colaborador_id", colaboradorId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  const { data: cfg, error: cfgErr } = await supabase
    .from("colaborador_config_financeira")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .single();

  if (cfgErr) return NextResponse.json({ error: cfgErr.message }, { status: 500 });
  return NextResponse.json({ config_financeira: cfg }, { status: 200 });
}
