import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type CreateAcaoBody = {
  tipo?: "CAMPANHA" | "DOACAO" | "INTERCAMBIO" | "ACOLHIMENTO" | "EVENTO" | "OUTRA";
  titulo: string;
  descricao?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
  metricas_json?: Record<string, unknown> | null;
};

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = (await req.json()) as CreateAcaoBody;

    if (!body?.titulo) {
      return NextResponse.json({ ok: false, error: "titulo_obrigatorio" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("movimento_acoes")
      .insert({
        tipo: body.tipo ?? "OUTRA",
        titulo: body.titulo,
        descricao: body.descricao ?? null,
        data_inicio: body.data_inicio ?? null,
        data_fim: body.data_fim ?? null,
        metricas_json: body.metricas_json ?? {},
        criado_em: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, acao: { id: String(data.id) } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
