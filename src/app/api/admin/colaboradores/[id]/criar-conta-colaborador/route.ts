import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

function toInt(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const out = Math.trunc(n);
  return out > 0 ? out : null;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const { id: rawId } = await ctx.params;
  const colaboradorId = toInt(rawId);
  if (!colaboradorId) {
    return NextResponse.json({ error: "colaborador_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: colab, error: cErr } = await supabase
    .from("colaboradores")
    .select("id,pessoa_id")
    .eq("id", colaboradorId)
    .maybeSingle();

  if (cErr || !colab) {
    return NextResponse.json({ error: "colaborador_nao_encontrado" }, { status: 404 });
  }

  const pessoaId = Number(colab.pessoa_id);
  if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
    return NextResponse.json({ error: "pessoa_id_invalido" }, { status: 400 });
  }

  const { data: existente, error: exErr } = await supabase
    .from("credito_conexao_contas")
    .select("id,tipo_conta,pessoa_titular_id,dia_fechamento,dia_vencimento,ativo,descricao_exibicao")
    .eq("pessoa_titular_id", pessoaId)
    .eq("tipo_conta", "COLABORADOR")
    .order("ativo", { ascending: false })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (existente?.id) {
    return NextResponse.json({ conta: existente, created: false }, { status: 200 });
  }

  const { data: cfg } = await supabase
    .from("colaborador_config_financeira")
    .select("dia_fechamento")
    .eq("colaborador_id", colaboradorId)
    .maybeSingle();

  const diaFechamentoRaw = Number(cfg?.dia_fechamento ?? 10);
  const diaFechamento =
    Number.isFinite(diaFechamentoRaw) && diaFechamentoRaw >= 1 && diaFechamentoRaw <= 31
      ? Math.trunc(diaFechamentoRaw)
      : 10;

  const { data: conta, error: insErr } = await supabase
    .from("credito_conexao_contas")
    .insert({
      pessoa_titular_id: pessoaId,
      tipo_conta: "COLABORADOR",
      dia_fechamento: diaFechamento,
      dia_vencimento: 12,
      ativo: true,
      descricao_exibicao: "Conta Interna COLABORADOR",
    })
    .select("id,tipo_conta,pessoa_titular_id,dia_fechamento,dia_vencimento,ativo,descricao_exibicao")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  return NextResponse.json({ conta, created: true }, { status: 200 });
}
