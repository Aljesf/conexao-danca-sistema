import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Body = {
  pessoa_id: string;
  responsavel_id?: string | null;
  eh_menor?: boolean;
  observacoes?: string | null;
};

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = (await req.json()) as Body;

    if (!body?.pessoa_id) {
      return NextResponse.json({ ok: false, error: "pessoa_id e obrigatorio" }, { status: 400 });
    }

    const pessoa_id = String(body.pessoa_id);
    const responsavel_id = body.responsavel_id ? String(body.responsavel_id) : null;
    const eh_menor = Boolean(body.eh_menor ?? false);

    if (eh_menor && !responsavel_id) {
      return NextResponse.json(
        { ok: false, error: "Menor de idade exige responsavel legal." },
        { status: 400 }
      );
    }

    const { data: found, error: errFound } = await supabase
      .from("movimento_beneficiarios")
      .select("id")
      .eq("pessoa_id", pessoa_id)
      .limit(1)
      .maybeSingle();

    if (errFound) throw new Error(errFound.message);

    const payload = {
      pessoa_id,
      responsavel_id,
      eh_menor,
      observacoes: body.observacoes ?? null,
      atualizado_em: new Date().toISOString(),
    };

    if (found?.id) {
      const { data, error } = await supabase
        .from("movimento_beneficiarios")
        .update(payload)
        .eq("id", found.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, beneficiario: { id: String(data.id) } });
    }

    const { data, error } = await supabase
      .from("movimento_beneficiarios")
      .insert({ ...payload, criado_em: new Date().toISOString() })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, beneficiario: { id: String(data.id) } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro inesperado";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
