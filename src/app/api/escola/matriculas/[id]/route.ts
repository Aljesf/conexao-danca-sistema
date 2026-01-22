import { NextResponse, type NextRequest } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { formatUnidadeExecucaoLabel } from "@/lib/escola/formatters/unidadeExecucaoLabel";
import { requireUser } from "@/lib/supabase/api-auth";

export const dynamic = "force-dynamic";

type ApiErrorCode = "bad_request" | "unauthorized" | "not_found" | "server_error";

type ApiError = {
  ok: false;
  error: ApiErrorCode;
  message: string;
  details?: Record<string, unknown> | null;
};

type UnidadeExecucaoRow = {
  unidade_execucao_id: number;
  denominacao: string | null;
  nome: string | null;
  origem_id: number | null;
  origem_tipo: string | null;
};

type FinanceiroResumo = {
  entrada_total_paga_centavos: number;
  parcelas_pendentes_count: number;
  parcelas_pendentes_total_centavos: number;
  proximo_vencimento: string | null;
  ultima_atualizacao: string | null;
};

type CartaoConexaoResumo = {
  parcelas_pendentes: number;
  proximo_vencimento: string | null;
  fatura_id_proxima: number | null;
  parcelas_proximas: Array<{
    periodo: string | null;
    vencimento: string | null;
    valor_centavos: number;
    status: string | null;
  }>;
};

type DocumentoEmitidoResumo = {
  id: number;
  matricula_id: number | null;
  contrato_modelo_id: number | null;
  status_assinatura: string | null;
  created_at: string | null;
};

type TurmaVinculadaResumo = {
  turma_id: number;
  nome: string | null;
};

type ItemMatriculaResumo = {
  turma_id: number;
  turma_nome: string | null;
  ue_id: number | null;
  ue_label: string | null;
};

function isSchemaMissing(err: unknown): boolean {
  const e = err as PostgrestError | null;
  return !!e && typeof e.code === "string" && (e.code === "42P01" || e.code === "42703");
}

function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function okJson<T>(payload: T, status = 200) {
  return NextResponse.json(payload, { status });
}

function errJson(code: ApiErrorCode, message: string, status: number, details?: Record<string, unknown> | null) {
  return okJson({ ok: false, error: code, message, details: details ?? null } satisfies ApiError, status);
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const params = await ctx.params;
    const matriculaId = toPositiveNumber(params.id);
    if (!matriculaId) {
      return errJson("bad_request", "ID de matricula invalido.", 400, { id: params.id });
    }

    const admin = getSupabaseAdmin();

    const { data: matricula, error: matriculaErr } = await admin
      .from("matriculas")
      .select("*")
      .eq("id", matriculaId)
      .maybeSingle();

    if (matriculaErr) {
      return errJson("server_error", "Falha ao buscar matricula.", 500, { matriculaErr });
    }

    if (!matricula) {
      return errJson("not_found", "Matricula nao encontrada.", 404);
    }

    const alunoPessoaId = toPositiveNumber(
      (matricula as { pessoa_id?: number | null; aluno_pessoa_id?: number | null; aluno_id?: number | null })
        .pessoa_id ??
        (matricula as { aluno_pessoa_id?: number | null }).aluno_pessoa_id ??
        (matricula as { aluno_id?: number | null }).aluno_id,
    );
    const responsavelPessoaId = toPositiveNumber(
      (matricula as { responsavel_pessoa_id?: number | null; responsavel_id?: number | null })
        .responsavel_pessoa_id ??
        (matricula as { responsavel_id?: number | null }).responsavel_id,
    );
    const responsavelFinanceiroPessoaId = toPositiveNumber(
      (matricula as { responsavel_financeiro_id?: number | null; responsavel_financeiro_pessoa_id?: number | null })
        .responsavel_financeiro_id ??
        (matricula as { responsavel_financeiro_pessoa_id?: number | null }).responsavel_financeiro_pessoa_id,
    );

    const pessoaId = alunoPessoaId;
    const responsavelId = responsavelFinanceiroPessoaId ?? responsavelPessoaId;
    const vinculoId = toPositiveNumber((matricula as { vinculo_id?: number }).vinculo_id);
    const servicoIdRaw = (matricula as { servico_id?: number | null; produto_id?: number | null }).servico_id ??
      (matricula as { produto_id?: number | null }).produto_id ??
      null;

    const { data: turma } = vinculoId
      ? await admin.from("turmas").select("turma_id,produto_id,nome").eq("turma_id", vinculoId).maybeSingle()
      : { data: null };

    const servicoId = toPositiveNumber(servicoIdRaw ?? (turma as { produto_id?: number | null } | null)?.produto_id);

    const { data: unidadeExecucao, error: ueErr } = vinculoId
      ? await admin
          .from("escola_unidades_execucao")
          .select("unidade_execucao_id,denominacao,nome,origem_id,origem_tipo")
          .eq("origem_tipo", "TURMA")
          .eq("origem_id", vinculoId)
          .maybeSingle()
      : { data: null, error: null };

    if (ueErr && !isSchemaMissing(ueErr)) {
      return errJson("server_error", "Falha ao buscar unidade de execucao.", 500, { ueErr });
    }

    const { data: servico } = servicoId
      ? await admin.from("escola_produtos_educacionais").select("id,titulo").eq("id", servicoId).maybeSingle()
      : { data: null };

    const { data: pessoa } = pessoaId
      ? await admin.from("pessoas").select("id,nome").eq("id", pessoaId).maybeSingle()
      : { data: null };

    const { data: responsavel } = responsavelId
      ? await admin.from("pessoas").select("id,nome").eq("id", responsavelId).maybeSingle()
      : { data: null };

    let precoAplicado: Record<string, unknown> | null = null;
    const { data: itens, error: itensErr } = await admin
      .from("matriculas_itens")
      .select("id,item_id,valor_centavos,moeda,created_at")
      .eq("matricula_id", matriculaId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (itensErr && !isSchemaMissing(itensErr)) {
      return errJson("server_error", "Falha ao buscar itens da matricula.", 500, { itensErr });
    }

    if (itens && itens.length > 0) {
      precoAplicado = itens[0] as Record<string, unknown>;
    }

    const planoPagamentoId = toPositiveNumber((matricula as { plano_pagamento_id?: number | null }).plano_pagamento_id);
    const { data: planoPagamento, error: planoErr } = planoPagamentoId
      ? await admin
          .from("matricula_planos_pagamento")
          .select("id,titulo,ciclo_cobranca,numero_parcelas,ativo")
          .eq("id", planoPagamentoId)
          .maybeSingle()
      : { data: null, error: null };

    if (planoErr && !isSchemaMissing(planoErr)) {
      return errJson("server_error", "Falha ao buscar plano de pagamento.", 500, { planoErr });
    }

    let financeiroResumo: FinanceiroResumo | null = null;
    const { data: linhas, error: linhasErr } = await admin
      .from("matriculas_financeiro_linhas")
      .select("tipo,valor_centavos,status,vencimento,updated_at,created_at")
      .eq("matricula_id", matriculaId);

    if (linhasErr && !isSchemaMissing(linhasErr)) {
      return errJson("server_error", "Falha ao buscar resumo financeiro.", 500, { linhasErr });
    }

    if (!linhasErr && linhas) {
      let entradaTotal = 0;
      let parcelasPendentesCount = 0;
      let parcelasPendentesTotal = 0;
      let proximoVencimento: string | null = null;
      let ultimaAtualizacao: string | null = null;

      for (const row of linhas as Array<Record<string, unknown>>) {
        const tipo = String(row.tipo ?? "").trim().toUpperCase();
        const status = String(row.status ?? "").trim().toUpperCase();
        const valor = Number(row.valor_centavos ?? 0);
        const vencimento = typeof row.vencimento === "string" ? row.vencimento : null;
        const updatedAt =
          typeof row.updated_at === "string"
            ? row.updated_at
            : typeof row.created_at === "string"
              ? row.created_at
              : null;

        if (Number.isFinite(valor)) {
          if (tipo === "ENTRADA" && status === "PAGO") {
            entradaTotal += valor;
          }
          if (tipo === "PARCELA" && status === "PENDENTE") {
            parcelasPendentesCount += 1;
            parcelasPendentesTotal += valor;
            if (vencimento && (!proximoVencimento || vencimento < proximoVencimento)) {
              proximoVencimento = vencimento;
            }
          }
        }

        if (updatedAt && (!ultimaAtualizacao || updatedAt > ultimaAtualizacao)) {
          ultimaAtualizacao = updatedAt;
        }
      }

      financeiroResumo = {
        entrada_total_paga_centavos: entradaTotal,
        parcelas_pendentes_count: parcelasPendentesCount,
        parcelas_pendentes_total_centavos: parcelasPendentesTotal,
        proximo_vencimento: proximoVencimento,
        ultima_atualizacao: ultimaAtualizacao,
      };
    }

    let resumoCartao: CartaoConexaoResumo | null = null;
    if (responsavelId) {
      const { data: contas, error: contaErr } = await admin
        .from("credito_conexao_contas")
        .select("id, ativo, tipo_conta")
        .eq("pessoa_titular_id", responsavelId)
        .eq("ativo", true)
        .order("id", { ascending: false })
        .limit(1);

      if (contaErr && !isSchemaMissing(contaErr)) {
        return errJson("server_error", "Falha ao buscar conta do cartao conexao.", 500, { contaErr });
      }

      const contaId = contas && contas.length > 0 ? Number(contas[0]?.id) : null;
      if (contaId && Number.isFinite(contaId)) {
        const statusFaturas = ["ABERTA", "PENDENTE", "EM_ABERTO"];
        const { data: faturasRaw, error: faturasErr } = await admin
          .from("credito_conexao_faturas")
          .select("id, periodo_referencia, data_vencimento, status, valor_total_centavos")
          .eq("conta_conexao_id", contaId)
          .in("status", statusFaturas)
          .order("data_vencimento", { ascending: true, nullsFirst: false })
          .order("data_fechamento", { ascending: true, nullsFirst: false })
          .limit(4);

        if (faturasErr && !isSchemaMissing(faturasErr)) {
          return errJson("server_error", "Falha ao buscar faturas do cartao conexao.", 500, { faturasErr });
        }

        const faturas = (faturasRaw ?? []).map((row) => {
          const record = row as Record<string, unknown>;
          const valorRaw = Number(record.valor_total_centavos);
          return {
            id: Number(record.id),
            periodo: typeof record.periodo_referencia === "string" ? record.periodo_referencia : null,
            vencimento: typeof record.data_vencimento === "string" ? record.data_vencimento : null,
            valor_centavos: Number.isFinite(valorRaw) ? valorRaw : 0,
            status: typeof record.status === "string" ? record.status : null,
          };
        });

        const proximaFatura = faturas.length > 0 ? faturas[0] : null;

        const statusLancamentos = ["PENDENTE_FATURA", "FATURADO"];
        const { count: pendentesCount, error: pendentesErr } = await admin
          .from("credito_conexao_lancamentos")
          .select("id", { count: "exact", head: true })
          .eq("conta_conexao_id", contaId)
          .in("status", statusLancamentos);

        if (pendentesErr && !isSchemaMissing(pendentesErr)) {
          return errJson("server_error", "Falha ao buscar lancamentos do cartao conexao.", 500, { pendentesErr });
        }

        resumoCartao = {
          parcelas_pendentes: pendentesCount ?? 0,
          proximo_vencimento: proximaFatura?.vencimento ?? null,
          fatura_id_proxima: proximaFatura?.id ? Number(proximaFatura.id) : null,
          parcelas_proximas: faturas.map((f) => ({
            periodo: f.periodo,
            vencimento: f.vencimento,
            valor_centavos: f.valor_centavos,
            status: f.status,
          })),
        };
      }
    }

    const { data: emitidos, error: emitidosErr } = await admin
      .from("documentos_emitidos")
      .select("id, matricula_id, contrato_modelo_id, status_assinatura, created_at")
      .eq("matricula_id", matriculaId)
      .order("id", { ascending: false })
      .limit(20);

    if (emitidosErr && !isSchemaMissing(emitidosErr)) {
      return errJson("server_error", "Falha ao buscar documentos emitidos.", 500, { emitidosErr });
    }

    const { data: turmasRaw, error: turmasErr } = await admin
      .from("turma_aluno")
      .select("turma:turmas(turma_id,nome), status")
      .eq("matricula_id", matriculaId)
      .in("status", ["ATIVO", "ativo"]);

    if (turmasErr && !isSchemaMissing(turmasErr)) {
      return errJson("server_error", "Falha ao buscar turmas vinculadas.", 500, { turmasErr });
    }

    const turmasVinculadas: TurmaVinculadaResumo[] = (turmasRaw ?? [])
      .map((row) => {
        const turma = (row as { turma?: { turma_id?: number | null; nome?: string | null } | null }).turma;
        const turmaId = toPositiveNumber(turma?.turma_id);
        if (!turmaId) return null;
        return { turma_id: turmaId, nome: turma?.nome ?? null };
      })
      .filter((row): row is TurmaVinculadaResumo => !!row);

    const turmaIdsVinculados = turmasVinculadas.map((t) => t.turma_id);
    const { data: uesVinculadas, error: uesVincErr } =
      turmaIdsVinculados.length > 0
        ? await admin
            .from("escola_unidades_execucao")
            .select("unidade_execucao_id,denominacao,nome,origem_id,origem_tipo")
            .eq("origem_tipo", "TURMA")
            .in("origem_id", turmaIdsVinculados)
        : { data: null, error: null };

    if (uesVincErr && !isSchemaMissing(uesVincErr)) {
      return errJson("server_error", "Falha ao buscar unidades de execucao das turmas.", 500, { uesVincErr });
    }

    const ueByTurma = new Map<number, UnidadeExecucaoRow>();
    (uesVinculadas ?? []).forEach((row) => {
      const record = row as UnidadeExecucaoRow;
      const turmaId = toPositiveNumber(record.origem_id);
      if (!turmaId) return;
      ueByTurma.set(turmaId, record);
    });

    const itensMatricula: ItemMatriculaResumo[] = turmasVinculadas.map((turma) => {
      const ue = ueByTurma.get(turma.turma_id) ?? null;
      const ueLabel = ue
        ? formatUnidadeExecucaoLabel({
            unidadeExecucaoId: toPositiveNumber(ue.unidade_execucao_id),
            origemTipo: ue.origem_tipo,
            turmaId: turma.turma_id,
            turmaNome: turma.nome,
            unidadeDenominacao: ue.denominacao,
            unidadeNome: ue.nome,
          })
        : null;

      return {
        turma_id: turma.turma_id,
        turma_nome: turma.nome ?? null,
        ue_id: ue ? toPositiveNumber(ue.unidade_execucao_id) : null,
        ue_label: ueLabel,
      };
    });

    const ueRow = unidadeExecucao as UnidadeExecucaoRow | null;
    const unidadeExecucaoLabel = ueRow
      ? formatUnidadeExecucaoLabel({
          unidadeExecucaoId: toPositiveNumber(ueRow.unidade_execucao_id),
          origemTipo: ueRow.origem_tipo,
          turmaId: vinculoId,
          turmaNome: (turma as { nome?: string | null } | null)?.nome ?? null,
          unidadeDenominacao: ueRow.denominacao,
          unidadeNome: ueRow.nome,
        })
      : null;

    const matriculaPayload = {
      ...(matricula as Record<string, unknown>),
      aluno_pessoa_id: alunoPessoaId ?? 0,
      responsavel_pessoa_id: responsavelPessoaId,
      responsavel_financeiro_pessoa_id: responsavelFinanceiroPessoaId,
    };

    return okJson(
      {
        ok: true,
        data: matriculaPayload,
        matricula: matriculaPayload,
        pessoa: pessoa ?? null,
        responsavel_financeiro: responsavel ?? null,
        servico: servico ?? (servicoId ? { id: servicoId, titulo: null } : null),
        turma: turma ?? null,
        unidade_execucao: unidadeExecucao ?? null,
        unidade_execucao_label: unidadeExecucaoLabel,
        preco_aplicado: precoAplicado,
        plano_pagamento: planoPagamento ?? null,
        financeiro_resumo: financeiroResumo,
        resumo_financeiro_cartao_conexao: resumoCartao,
        documentos_emitidos: (emitidos ?? []) as DocumentoEmitidoResumo[],
        turmas_vinculadas: turmasVinculadas,
        itens_matricula: itensMatricula,
        historico: [],
      },
      200,
    );
  } catch (e: unknown) {
    return errJson("server_error", "Erro inesperado ao buscar matricula.", 500, {
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

