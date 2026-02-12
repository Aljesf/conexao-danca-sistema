import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type PagamentoTipo = "PAGAMENTO" | "ADIANTAMENTO" | "SAQUE";
type FolhaStatus = "ABERTA" | "FECHADA" | "PAGA";

type PagamentoRow = {
  id: number;
  colaborador_id: number;
  tipo: PagamentoTipo;
  competencia_ano_mes: string | null;
  data_pagamento: string;
  valor_centavos: number;
  moeda: string;
  conta_financeira_id: number | null;
  observacoes: string | null;
  folha_pagamento_colaborador_id: number | null;
  folha_evento_id: number | null;
  created_at: string;
};

type FolhaRow = {
  id: number;
  colaborador_id: number;
  competencia_ano_mes: string;
  status: FolhaStatus;
};

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function toBool(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  return null;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isCompetencia(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

function normalizarTipo(value: unknown): PagamentoTipo | null {
  if (typeof value !== "string") return null;
  const normalized = value.toUpperCase();
  if (normalized === "PAGAMENTO" || normalized === "ADIANTAMENTO" || normalized === "SAQUE") {
    return normalized;
  }
  return null;
}

async function colaboradorExiste(supabase: ReturnType<typeof getSupabaseAdmin>, colaboradorId: number): Promise<boolean> {
  const { data, error } = await supabase.from("colaboradores").select("id").eq("id", colaboradorId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function buscarOuCriarFolha(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  colaboradorId: number,
  competencia: string,
): Promise<{ folha: FolhaRow; created: boolean } | { error: string; detail?: string; status: number }> {
  const { data: existente, error: existenteError } = await supabase
    .from("folha_pagamento_colaborador")
    .select("id,colaborador_id,competencia_ano_mes,status")
    .eq("colaborador_id", colaboradorId)
    .eq("competencia_ano_mes", competencia)
    .maybeSingle();

  if (existenteError) {
    return { error: "falha_buscar_folha", detail: existenteError.message, status: 500 };
  }

  if (existente) {
    return { folha: existente as FolhaRow, created: false };
  }

  const { data: criada, error: createError } = await supabase
    .from("folha_pagamento_colaborador")
    .insert({ colaborador_id: colaboradorId, competencia_ano_mes: competencia, status: "ABERTA" })
    .select("id,colaborador_id,competencia_ano_mes,status")
    .single();

  if (createError || !criada) {
    return {
      error: "falha_criar_folha",
      detail: createError?.message ?? "sem_retorno",
      status: 500,
    };
  }

  return { folha: criada as FolhaRow, created: true };
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const colaboradorId = toInt(ctx.params.id);

  if (!colaboradorId || colaboradorId <= 0) {
    return NextResponse.json({ ok: false, error: "colaborador_id_invalido" }, { status: 400 });
  }

  try {
    const existe = await colaboradorExiste(supabase, colaboradorId);
    if (!existe) {
      return NextResponse.json({ ok: false, error: "colaborador_nao_encontrado" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = normalizarTipo(searchParams.get("tipo"));
    const competencia = searchParams.get("competencia_ano_mes") || searchParams.get("competencia");
    const limit = Math.min(Math.max(toInt(searchParams.get("limit")) ?? 20, 1), 100);

    let query = supabase
      .from("colaborador_pagamentos")
      .select(
        "id,colaborador_id,tipo,competencia_ano_mes,data_pagamento,valor_centavos,moeda,conta_financeira_id,observacoes,folha_pagamento_colaborador_id,folha_evento_id,created_at",
      )
      .eq("colaborador_id", colaboradorId)
      .order("data_pagamento", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (tipo) {
      query = query.eq("tipo", tipo);
    }

    if (competencia) {
      if (!isCompetencia(competencia)) {
        return NextResponse.json({ ok: false, error: "competencia_ano_mes_invalida" }, { status: 400 });
      }
      query = query.eq("competencia_ano_mes", competencia);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { ok: false, error: "falha_listar_pagamentos", detail: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data: (data ?? []) as PagamentoRow[] });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: "falha_listar_pagamentos", detail }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const colaboradorId = toInt(ctx.params.id);

  if (!colaboradorId || colaboradorId <= 0) {
    return NextResponse.json({ ok: false, error: "colaborador_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const tipo = normalizarTipo(body.tipo);
  const dataPagamento = asString(body.data_pagamento);
  const valorCentavos = toInt(body.valor_centavos);
  const competenciaAnoMesRaw = asString(body.competencia_ano_mes);
  const competenciaAnoMes = competenciaAnoMesRaw && competenciaAnoMesRaw.trim() !== "" ? competenciaAnoMesRaw : null;
  const contaFinanceiraId = toInt(body.conta_financeira_id);
  const observacoesRaw = asString(body.observacoes);
  const observacoes = observacoesRaw && observacoesRaw.trim() !== "" ? observacoesRaw : null;
  const aplicarNaFolha = toBool(body.aplicar_na_folha);
  const folhaCompetenciaRaw = asString(body.folha_competencia_ano_mes);
  const folhaCompetencia = folhaCompetenciaRaw && folhaCompetenciaRaw.trim() !== "" ? folhaCompetenciaRaw : null;
  const gerarMovimentoFinanceiro = toBool(body.gerar_movimento_financeiro);

  if (!tipo) {
    return NextResponse.json({ ok: false, error: "tipo_invalido" }, { status: 400 });
  }

  if (!dataPagamento || !isIsoDate(dataPagamento)) {
    return NextResponse.json({ ok: false, error: "data_pagamento_invalida" }, { status: 400 });
  }

  if (valorCentavos === null || valorCentavos <= 0) {
    return NextResponse.json({ ok: false, error: "valor_centavos_invalido" }, { status: 400 });
  }

  if (competenciaAnoMes && !isCompetencia(competenciaAnoMes)) {
    return NextResponse.json({ ok: false, error: "competencia_ano_mes_invalida" }, { status: 400 });
  }

  if (aplicarNaFolha && (!folhaCompetencia || !isCompetencia(folhaCompetencia))) {
    return NextResponse.json(
      { ok: false, error: "folha_competencia_ano_mes_invalida" },
      { status: 400 },
    );
  }

  if (gerarMovimentoFinanceiro && !contaFinanceiraId) {
    return NextResponse.json({ ok: false, error: "conta_financeira_obrigatoria_para_movimento" }, { status: 400 });
  }

  try {
    const existe = await colaboradorExiste(supabase, colaboradorId);
    if (!existe) {
      return NextResponse.json({ ok: false, error: "colaborador_nao_encontrado" }, { status: 404 });
    }

    let contaFinanceiraCentroCustoId: number | null = null;
    if (contaFinanceiraId !== null) {
      const { data: conta, error: contaError } = await supabase
        .from("contas_financeiras")
        .select("id,centro_custo_id")
        .eq("id", contaFinanceiraId)
        .maybeSingle();

      if (contaError) {
        return NextResponse.json(
          { ok: false, error: "falha_validar_conta_financeira", detail: contaError.message },
          { status: 500 },
        );
      }

      if (!conta) {
        return NextResponse.json({ ok: false, error: "conta_financeira_invalida" }, { status: 409 });
      }

      contaFinanceiraCentroCustoId =
        typeof conta.centro_custo_id === "number" ? (conta.centro_custo_id as number) : null;
    }

    let folha: FolhaRow | null = null;
    if (aplicarNaFolha && folhaCompetencia) {
      const folhaResult = await buscarOuCriarFolha(supabase, colaboradorId, folhaCompetencia);
      if ("error" in folhaResult) {
        return NextResponse.json(
          { ok: false, error: folhaResult.error, detail: folhaResult.detail ?? null },
          { status: folhaResult.status },
        );
      }

      folha = folhaResult.folha;
      if (folha.status === "PAGA") {
        return NextResponse.json(
          { ok: false, error: "folha_paga_nao_permite_novos_eventos", folha_id: folha.id },
          { status: 409 },
        );
      }
    }

    const { data: pagamentoCriado, error: pagamentoError } = await supabase
      .from("colaborador_pagamentos")
      .insert({
        colaborador_id: colaboradorId,
        tipo,
        competencia_ano_mes: competenciaAnoMes,
        data_pagamento: dataPagamento,
        valor_centavos: valorCentavos,
        conta_financeira_id: contaFinanceiraId,
        observacoes,
        folha_pagamento_colaborador_id: folha?.id ?? null,
      })
      .select(
        "id,colaborador_id,tipo,competencia_ano_mes,data_pagamento,valor_centavos,moeda,conta_financeira_id,observacoes,folha_pagamento_colaborador_id,folha_evento_id,created_at",
      )
      .single();

    if (pagamentoError || !pagamentoCriado) {
      return NextResponse.json(
        { ok: false, error: "falha_criar_pagamento", detail: pagamentoError?.message ?? "sem_retorno" },
        { status: 500 },
      );
    }

    const pagamentoId = pagamentoCriado.id as number;
    let folhaEventoId: number | null = null;

    if (aplicarNaFolha && folha && (tipo === "ADIANTAMENTO" || tipo === "SAQUE")) {
      const descricaoEvento =
        tipo === "ADIANTAMENTO"
          ? `Desconto por adiantamento registrado em ${dataPagamento}`
          : `Desconto por saque registrado em ${dataPagamento}`;

      const { data: eventoCriado, error: eventoError } = await supabase
        .from("folha_pagamento_eventos")
        .insert({
          folha_pagamento_id: folha.id,
          tipo: "DESCONTO",
          descricao: descricaoEvento,
          valor_centavos: valorCentavos,
          origem_tipo: "COLABORADOR_PAGAMENTO",
          origem_id: pagamentoId,
        })
        .select("id")
        .single();

      if (eventoError || !eventoCriado) {
        await supabase.from("colaborador_pagamentos").delete().eq("id", pagamentoId);
        return NextResponse.json(
          { ok: false, error: "falha_criar_evento_folha", detail: eventoError?.message ?? "sem_retorno" },
          { status: 500 },
        );
      }

      folhaEventoId = eventoCriado.id as number;

      const { error: updatePagamentoError } = await supabase
        .from("colaborador_pagamentos")
        .update({ folha_evento_id: folhaEventoId })
        .eq("id", pagamentoId);

      if (updatePagamentoError) {
        await supabase.from("folha_pagamento_eventos").delete().eq("id", folhaEventoId);
        await supabase.from("colaborador_pagamentos").delete().eq("id", pagamentoId);

        return NextResponse.json(
          {
            ok: false,
            error: "falha_atualizar_pagamento_com_evento_folha",
            detail: updatePagamentoError.message,
          },
          { status: 500 },
        );
      }
    }

    if (gerarMovimentoFinanceiro) {
      if (!contaFinanceiraId || !contaFinanceiraCentroCustoId) {
        if (folhaEventoId) {
          await supabase.from("folha_pagamento_eventos").delete().eq("id", folhaEventoId);
        }
        await supabase.from("colaborador_pagamentos").delete().eq("id", pagamentoId);
        return NextResponse.json(
          { ok: false, error: "conta_financeira_sem_centro_custo_para_movimento" },
          { status: 409 },
        );
      }

      const descricaoMovimento = `Pagamento colaborador #${colaboradorId} (${tipo})`;
      const dataMovimento = `${dataPagamento}T12:00:00.000Z`;

      const { error: movimentoError } = await supabase.from("movimento_financeiro").insert({
        tipo: "DESPESA",
        centro_custo_id: contaFinanceiraCentroCustoId,
        valor_centavos: valorCentavos,
        data_movimento: dataMovimento,
        origem: "COLABORADOR_PAGAMENTO",
        origem_id: pagamentoId,
        descricao: descricaoMovimento,
        usuario_id: null,
      });

      if (movimentoError) {
        if (folhaEventoId) {
          await supabase.from("folha_pagamento_eventos").delete().eq("id", folhaEventoId);
        }
        await supabase.from("colaborador_pagamentos").delete().eq("id", pagamentoId);

        return NextResponse.json(
          { ok: false, error: "falha_criar_movimento_financeiro", detail: movimentoError.message },
          { status: 500 },
        );
      }
    }

    const { data: pagamentoFinal, error: pagamentoFinalError } = await supabase
      .from("colaborador_pagamentos")
      .select(
        "id,colaborador_id,tipo,competencia_ano_mes,data_pagamento,valor_centavos,moeda,conta_financeira_id,observacoes,folha_pagamento_colaborador_id,folha_evento_id,created_at",
      )
      .eq("id", pagamentoId)
      .maybeSingle();

    if (pagamentoFinalError || !pagamentoFinal) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar_pagamento_final", detail: pagamentoFinalError?.message ?? "sem_retorno" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data: pagamentoFinal as PagamentoRow });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: "falha_registrar_pagamento", detail }, { status: 500 });
  }
}