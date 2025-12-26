import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type TurmaRow = {
  turma_id: number;
  tipo_turma: string | null;
  ano_referencia: number | null;
};

type ServicoRow = {
  id: number;
  tipo: string;
  titulo: string | null;
  ativo: boolean;
  ano_referencia: number | null;
  referencia_tipo: string | null;
  referencia_id: number | null;
};

type PrecoRow = {
  servico_id: number;
  ano_referencia: number;
  plano_id: number;
  ativo: boolean;
  plano: {
    id: number;
    codigo: string;
    nome: string;
    valor_mensal_base_centavos: number;
    valor_anuidade_centavos: number;
  } | null;
};

function sbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function parseId(value: string | undefined): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function tipoServicoPorTurma(tipoTurma: string | null): string {
  if (tipoTurma === "CURSO_LIVRE") return "CURSO_LIVRE";
  return "REGULAR";
}

export async function GET(req: Request, ctx: { params: { turmaId?: string } }) {
  try {
    const supabase = sbAdmin();
    const turmaId = parseId(ctx.params.turmaId);
    if (!turmaId) {
      return NextResponse.json({ ok: false, error: "turma_id_invalido" }, { status: 400 });
    }

    const url = new URL(req.url);
    const anoParam = url.searchParams.get("ano_referencia");
    const anoRef = anoParam ? Number(anoParam) : null;

    const { data: turma, error: turmaErr } = await supabase
      .from("turmas")
      .select("turma_id,tipo_turma,ano_referencia")
      .eq("turma_id", turmaId)
      .maybeSingle<TurmaRow>();

    if (turmaErr) {
      return NextResponse.json({ ok: false, error: "erro_turma", message: turmaErr.message }, { status: 500 });
    }
    if (!turma) {
      return NextResponse.json({ ok: false, error: "turma_nao_encontrada" }, { status: 404 });
    }

    const tipoEsperado = tipoServicoPorTurma(turma.tipo_turma ?? null);
    const anoReferencia = Number.isInteger(anoRef) ? Number(anoRef) : turma.ano_referencia;

    const { data: servicos, error } = await supabase
      .from("servicos")
      .select("id,tipo,titulo,ativo,ano_referencia,referencia_tipo,referencia_id")
      .eq("referencia_tipo", "TURMA")
      .eq("referencia_id", turmaId)
      .eq("tipo", tipoEsperado)
      .order("id", { ascending: false });

    if (error) {
      return NextResponse.json({ ok: false, error: "erro_listar_servicos", message: error.message }, { status: 500 });
    }

    const servicosRows = (servicos ?? []) as ServicoRow[];
    const servicoIds = servicosRows.map((s) => s.id);

    let precos: PrecoRow[] = [];
    if (servicoIds.length > 0 && Number.isInteger(anoReferencia)) {
      const { data: precosData, error: precosErr } = await supabase
        .from("matricula_precos_servico")
        .select(
          "servico_id,ano_referencia,plano_id,ativo,plano:matricula_planos(id,codigo,nome,valor_mensal_base_centavos,valor_anuidade_centavos)",
        )
        .in("servico_id", servicoIds)
        .eq("ano_referencia", Number(anoReferencia))
        .eq("ativo", true);

      if (precosErr) {
        return NextResponse.json({ ok: false, error: "erro_listar_precos", message: precosErr.message }, { status: 500 });
      }
      precos = (precosData ?? []) as PrecoRow[];
    }

    const precoByServico = new Map<number, PrecoRow>();
    precos.forEach((p) => {
      if (!precoByServico.has(p.servico_id)) precoByServico.set(p.servico_id, p);
    });

    const response = servicosRows.map((s) => ({
      ...s,
      preco_vigente: precoByServico.get(s.id) ?? null,
    }));

    return NextResponse.json(
      {
        ok: true,
        turma_id: turmaId,
        ano_referencia: Number.isInteger(anoReferencia) ? Number(anoReferencia) : null,
        servicos: response,
      },
      { status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: { turmaId?: string } }) {
  try {
    const supabase = sbAdmin();
    const turmaId = parseId(ctx.params.turmaId);
    if (!turmaId) {
      return NextResponse.json({ ok: false, error: "turma_id_invalido" }, { status: 400 });
    }

    const body = (await req.json().catch(() => null)) as { servico_ids?: number[] } | null;
    const servicoIdsRaw = Array.isArray(body?.servico_ids) ? body?.servico_ids : null;
    if (!servicoIdsRaw) {
      return NextResponse.json({ ok: false, error: "payload_invalido", message: "servico_ids deve ser array." }, { status: 400 });
    }

    const servicoIds = Array.from(
      new Set(
        servicoIdsRaw
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    );

    if (servicoIds.length > 1) {
      return NextResponse.json(
        {
          ok: false,
          error: "apenas_um_servico",
          message: "Selecione apenas um servico para vincular a turma.",
        },
        { status: 400 },
      );
    }

    const { data: turma, error: turmaErr } = await supabase
      .from("turmas")
      .select("turma_id,tipo_turma,ano_referencia")
      .eq("turma_id", turmaId)
      .maybeSingle<TurmaRow>();

    if (turmaErr) {
      return NextResponse.json({ ok: false, error: "erro_turma", message: turmaErr.message }, { status: 500 });
    }
    if (!turma) {
      return NextResponse.json({ ok: false, error: "turma_nao_encontrada" }, { status: 404 });
    }

    const tipoEsperado = tipoServicoPorTurma(turma.tipo_turma ?? null);
    const anoRef = turma.ano_referencia ?? null;

    const { data: servicosValidos, error: servicosErr } = await supabase
      .from("servicos")
      .select("id,tipo")
      .in("id", servicoIds.length > 0 ? servicoIds : [0]);

    if (servicosErr) {
      return NextResponse.json({ ok: false, error: "erro_servicos", message: servicosErr.message }, { status: 500 });
    }

    if (servicoIds.length > 0) {
      const invalidos = (servicosValidos ?? []).some((s) => String((s as { tipo?: string }).tipo) !== tipoEsperado);
      if (invalidos) {
        return NextResponse.json(
          {
            ok: false,
            error: "tipo_invalido",
            message: "O servico selecionado nao corresponde ao tipo da turma.",
          },
          { status: 400 },
        );
      }
    }

    const { data: vinculadosAtuais, error: vincErr } = await supabase
      .from("servicos")
      .select("id")
      .eq("referencia_tipo", "TURMA")
      .eq("referencia_id", turmaId)
      .eq("tipo", tipoEsperado);

    if (vincErr) {
      return NextResponse.json(
        { ok: false, error: "erro_servicos_vinculados", message: vincErr.message },
        { status: 500 },
      );
    }

    const idsAtuais = (vinculadosAtuais ?? []).map((s) => Number((s as { id?: number }).id));
    const idsParaDesvincular = idsAtuais.filter((id) => !servicoIds.includes(id));

    if (idsParaDesvincular.length > 0) {
      const { error: desvErr } = await supabase
        .from("servicos")
        .update({ referencia_tipo: null, referencia_id: null })
        .in("id", idsParaDesvincular);

      if (desvErr) {
        return NextResponse.json(
          { ok: false, error: "erro_desvincular", message: desvErr.message },
          { status: 500 },
        );
      }
    }

    if (servicoIds.length > 0) {
      const { error: vinculaErr } = await supabase
        .from("servicos")
        .update({
          referencia_tipo: "TURMA",
          referencia_id: turmaId,
          ano_referencia: Number.isInteger(anoRef) ? Number(anoRef) : null,
        })
        .in("id", servicoIds);

      if (vinculaErr) {
        return NextResponse.json(
          { ok: false, error: "erro_vincular", message: vinculaErr.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true, servico_ids: servicoIds }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message: msg }, { status: 500 });
  }
}
