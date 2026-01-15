import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type Body = {
  pessoa_id: string;
  analise_id?: string;
  responsavel_id?: string | null;
  eh_menor?: boolean;
  observacoes?: string | null;
};

async function validateAnaliseId(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  pessoaId: string;
  analiseId: string;
}) {
  const { data, error } = await params.supabase
    .from("movimento_analises_socioeconomicas")
    .select("id,pessoa_id")
    .eq("id", params.analiseId)
    .single();

  if (error || !data?.id) {
    throw new Error("ANALISE_NAO_ENCONTRADA");
  }

  if (String(data.pessoa_id) !== params.pessoaId) {
    throw new Error("ANALISE_PESSOA_INVALIDA");
  }
}

async function createAnalise(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  pessoaId: string;
  contexto: "ASE_18_PLUS" | "ASE_MENOR";
  responsavelId: string | null;
}) {
  if (params.contexto === "ASE_MENOR" && !params.responsavelId) {
    throw new Error("RESPONSAVEL_OBRIGATORIO");
  }

  const { data, error } = await params.supabase
    .from("movimento_analises_socioeconomicas")
    .insert({
      pessoa_id: Number(params.pessoaId),
      responsavel_legal_pessoa_id:
        params.contexto === "ASE_MENOR" && params.responsavelId
          ? Number(params.responsavelId)
          : null,
      contexto: params.contexto,
      status: "RASCUNHO",
      respostas_json: {},
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message || "ERRO_CRIAR_ANALISE");
  }

  return String(data.id);
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();
    const body = (await req.json()) as Body;

    if (!body?.pessoa_id) {
      return NextResponse.json({ ok: false, error: "pessoa_id e obrigatorio" }, { status: 400 });
    }

    const pessoa_id = String(body.pessoa_id);
    const analise_id = body.analise_id ? String(body.analise_id) : null;
    const responsavel_id = body.responsavel_id ? String(body.responsavel_id) : null;
    const eh_menor = Boolean(body.eh_menor ?? false);
    const contexto = eh_menor ? "ASE_MENOR" : "ASE_18_PLUS";

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

    if (analise_id) {
      await validateAnaliseId({ supabase, pessoaId: pessoa_id, analiseId: analise_id });
    }

    let analiseFinal: string | null = analise_id;
    if (!found?.id && !analiseFinal) {
      analiseFinal = await createAnalise({
        supabase,
        pessoaId: pessoa_id,
        contexto,
        responsavelId: responsavel_id,
      });
    }

    const payload: Record<string, unknown> = {
      pessoa_id,
      responsavel_id,
      eh_menor,
      observacoes: body.observacoes ?? null,
      atualizado_em: new Date().toISOString(),
    };

    if (analiseFinal) {
      payload.analise_id = analiseFinal;
    }

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
