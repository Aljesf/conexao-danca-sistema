import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function asNumberId(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error("id invalido");
  return n;
}

type CuidadosUpsert = {
  historico_lesoes?: string | null;
  restricoes_fisicas?: string | null;
  condicoes_neuro?: string | null;
  tipo_sanguineo?: string | null;

  alergias_alimentares?: string | null;
  alergias_medicamentos?: string | null;
  alergias_produtos?: string | null;

  pode_consumir_acucar?: string | null;
  pode_consumir_refrigerante?: string | null;
  restricoes_alimentares_observacoes?: string | null;

  tipo_autorizacao_saida?: string | null;

  contato_emergencia_pessoa_id?: number | null;
  contato_emergencia_relacao?: string | null;
  contato_emergencia_observacao?: string | null;
};

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const pessoaId = asNumberId(id);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("pessoa_cuidados")
      .select("*")
      .eq("pessoa_id", pessoaId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ cuidados: data ?? null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const pessoaId = asNumberId(id);
    const body = (await req.json()) as CuidadosUpsert;

    const supabase = await createClient();

    const payload = {
      pessoa_id: pessoaId,
      historico_lesoes: body.historico_lesoes ?? null,
      restricoes_fisicas: body.restricoes_fisicas ?? null,
      condicoes_neuro: body.condicoes_neuro ?? null,
      tipo_sanguineo: body.tipo_sanguineo ?? null,

      alergias_alimentares: body.alergias_alimentares ?? null,
      alergias_medicamentos: body.alergias_medicamentos ?? null,
      alergias_produtos: body.alergias_produtos ?? null,

      pode_consumir_acucar: body.pode_consumir_acucar ?? null,
      pode_consumir_refrigerante: body.pode_consumir_refrigerante ?? null,
      restricoes_alimentares_observacoes: body.restricoes_alimentares_observacoes ?? null,

      tipo_autorizacao_saida: body.tipo_autorizacao_saida ?? null,

      contato_emergencia_pessoa_id: body.contato_emergencia_pessoa_id ?? null,
      contato_emergencia_relacao: body.contato_emergencia_relacao ?? null,
      contato_emergencia_observacao: body.contato_emergencia_observacao ?? null,

      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("pessoa_cuidados")
      .upsert(payload, { onConflict: "pessoa_id" })
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ cuidados: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
