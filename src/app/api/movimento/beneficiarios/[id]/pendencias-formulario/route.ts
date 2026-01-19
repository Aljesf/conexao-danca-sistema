import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getSupabaseAdmin();
    const { id } = await ctx.params;
    const beneficiarioId = String(id);

    const { data, error } = await supabase
      .from("movimento_formularios_instancia")
      .select(
        "id, tipo, status, respondente_pessoa_id, criado_em, iniciado_em, concluido_em"
      )
      .eq("beneficiario_id", beneficiarioId)
      .in("status", ["PENDENTE", "EM_ANDAMENTO"])
      .order("criado_em", { ascending: true });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, pendencias: data ?? [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
