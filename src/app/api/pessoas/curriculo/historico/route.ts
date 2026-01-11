import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pessoaId = Number(url.searchParams.get("pessoa_id"));

  if (!Number.isFinite(pessoaId)) {
    return NextResponse.json({ ok: false, error: "pessoa_id e obrigatorio." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("historico_academico")
    .select("id,pessoa_id,turma_id,titulo,nivel,ano_referencia,data_inicio,data_fim,status,observacoes,created_at,updated_at")
    .eq("pessoa_id", pessoaId)
    .order("data_fim", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: data ?? [] });
}
