import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type AddParticipanteBody = {
  pessoa_id: string;
  papel?: string | null;
  observacoes?: string | null;
};

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const supabase = getSupabaseAdmin();
    const acaoId = String(ctx.params.id);
    const body = (await req.json()) as AddParticipanteBody;

    if (!body?.pessoa_id) {
      return NextResponse.json({ ok: false, error: "pessoa_id_obrigatorio" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("movimento_acao_participantes")
      .insert({
        acao_id: acaoId,
        pessoa_id: String(body.pessoa_id),
        papel: body.papel ?? null,
        observacoes: body.observacoes ?? null,
        criado_em: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, participante: { id: String(data.id) } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
