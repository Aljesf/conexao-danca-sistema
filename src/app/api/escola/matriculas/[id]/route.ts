import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { formatUnidadeExecucaoLabel } from "@/lib/escola/formatters/unidadeExecucaoLabel";

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

export async function GET(_req: Request, ctx: { params: Promise<{ id?: string }> }) {
  try {
    const cookieStore = await cookies();
    const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: u } = await supabaseAuth.auth.getUser();
    if (!u?.user) {
      return errJson("unauthorized", "Nao autenticado.", 401);
    }

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

    const pessoaId = toPositiveNumber((matricula as { pessoa_id?: number }).pessoa_id);
    const responsavelId = toPositiveNumber((matricula as { responsavel_financeiro_id?: number }).responsavel_financeiro_id);
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

    return okJson(
      {
        ok: true,
        matricula,
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
