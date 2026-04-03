import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { upsertLancamentoPorCobranca } from "@/lib/credito-conexao/upsertLancamentoPorCobranca";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { buildReferenciaMatriculaContaInterna } from "@/lib/financeiro/contaInternaObrigacao";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type GerarMensalBody = {
  matricula_id?: number;
  contexto_matricula_id?: number | null;
  aluno_pessoa_id?: number;
  responsavel_financeiro_id?: number;
  ano_referencia?: number;
  competencia?: string | null; // YYYY-MM
};

type TurmaAlunoRow = {
  turma_id: number | null;
  status?: string | null;
  dt_inicio?: string | null;
  dt_fim?: string | null;
};

type TurmaVinculada = {
  turma_id: number;
  status: string | null;
  dt_inicio: string | null;
  dt_fim: string | null;
};

type ComposicaoItem = {
  ordem: number;
  turma_id: number;
  ue_id: number;
  servico_id: number;
  label: string;
  valor_centavos: number;
  valor_brl: string;
};

type ResolverResp = {
  ok: boolean;
  data?: {
    item_aplicado?: {
      valor_centavos: number;
      descricao?: string | null;
      codigo_item?: string;
    };
    valor_final_centavos?: number | null;
    valor_final_brl?: string | null;
  };
  message?: string;
  error?: string;
};

type ApiErrorCode = "bad_request" | "unauthorized" | "not_found" | "server_error" | "conflict";

function errJson(code: ApiErrorCode, message: string, status: number, details?: Record<string, unknown> | null) {
  return NextResponse.json({ ok: false, error: code, message, details: details ?? null }, { status });
}

function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeCompetencia(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}$/.test(trimmed)) return null;
  return trimmed;
}

function formatBrl(valorCentavos: number): string {
  return (valorCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function buildVencimento(competencia: string, diaVencimento: number | null): string {
  const [anoStr, mesStr] = competencia.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const dia = diaVencimento && diaVencimento >= 1 && diaVencimento <= 31 ? diaVencimento : 12;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.toISOString().slice(0, 10);
}

async function resolverMensalidadePorTurma(
  request: Request,
  cookieHeader: string,
  alunoId: number,
  turmaId: number,
  ano: number,
  tierOrdemOverride?: number | null,
): Promise<{ valor_centavos: number; descricao: string | null }> {
  const resolveUrl = new URL("/api/matriculas/precos/resolver", request.url);
  resolveUrl.searchParams.set("aluno_id", String(alunoId));
  resolveUrl.searchParams.set("alvo_tipo", "TURMA");
  resolveUrl.searchParams.set("alvo_id", String(turmaId));
  resolveUrl.searchParams.set("ano", String(ano));
  if (tierOrdemOverride && Number.isFinite(tierOrdemOverride)) {
    resolveUrl.searchParams.set("tier_ordem_override", String(tierOrdemOverride));
  }

  const resolveRes = await fetch(resolveUrl.toString(), { headers: { cookie: cookieHeader } });
  let payload: ResolverResp | null = null;
  try {
    payload = (await resolveRes.json()) as ResolverResp;
  } catch {
    payload = null;
  }

  if (!resolveRes.ok || !payload?.ok) {
    const message = payload?.message || payload?.error || "Falha ao resolver precificacao.";
    throw new Error(message);
  }

  const item = payload.data?.item_aplicado;
  const valor = Number(payload.data?.valor_final_centavos ?? item?.valor_centavos);
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new Error("valor_mensal_invalido");
  }
  return {
    valor_centavos: valor,
    descricao: item?.descricao ?? null,
  };
}

export async function POST(request: NextRequest) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    let body: GerarMensalBody;
    try {
      body = (await request.json()) as GerarMensalBody;
    } catch {
      return errJson("bad_request", "JSON invalido.", 400);
    }

    const matriculaId = toPositiveNumber(body.matricula_id);
    const anoBody = toPositiveNumber(body.ano_referencia);
    const competencia = normalizeCompetencia(body.competencia);
    if (!matriculaId) {
      return errJson("bad_request", "matricula_id_obrigatorio", 400, { matricula_id: body.matricula_id });
    }
    if (!competencia) {
      return errJson("bad_request", "competencia_invalida", 400, { competencia: body.competencia });
    }

    const admin = getSupabaseAdmin();
    const cookieStore = await cookies();

    const { data: matricula, error: matErr } = await admin
      .from("matriculas")
      .select("id,pessoa_id,responsavel_financeiro_id,ano_referencia,status")
      .eq("id", matriculaId)
      .maybeSingle();

    if (matErr) {
      return errJson("server_error", "Falha ao buscar matricula.", 500, { matErr });
    }
    if (!matricula) {
      return errJson("not_found", "Matricula nao encontrada.", 404);
    }

    const matriculaStatus = String((matricula as { status?: string | null }).status ?? "").trim().toUpperCase();

    // M7: Verificar data_limite_exercicio — não gerar lançamento além do limite
    {
      const { data: cfgFin } = await admin
        .from("escola_config_financeira")
        .select("data_limite_exercicio")
        .limit(1)
        .maybeSingle();

      const dataLimite = (cfgFin as any)?.data_limite_exercicio as string | null;
      if (dataLimite && competencia) {
        // competencia é YYYY-MM, data_limite é YYYY-MM-DD
        const limiteAnoMes = dataLimite.slice(0, 7); // YYYY-MM
        if (competencia > limiteAnoMes) {
          return errJson(
            "conflict",
            `Competencia ${competencia} ultrapassa o limite do exercicio (${dataLimite}).`,
            409,
            { competencia, data_limite_exercicio: dataLimite },
          );
        }
      }
    }
    if (matriculaStatus === "CANCELADA") {
      return errJson("conflict", "matricula_cancelada_nao_pode_gerar_mensalidade", 409, {
        matricula_id: matriculaId,
      });
    }

    const alunoId = toPositiveNumber((matricula as { pessoa_id?: number }).pessoa_id);
    const responsavelId =
      toPositiveNumber((matricula as { responsavel_financeiro_id?: number }).responsavel_financeiro_id) ??
      alunoId;
    const anoRef =
      anoBody ??
      toPositiveNumber((matricula as { ano_referencia?: number | null }).ano_referencia) ??
      new Date().getFullYear();

    if (!alunoId || !responsavelId) {
      return errJson("bad_request", "Aluno/responsavel financeiro invalidos.", 400);
    }

    const { data: conta, error: contaErr } = await admin
      .from("credito_conexao_contas")
      .select("id, dia_vencimento")
      .eq("pessoa_titular_id", responsavelId)
      .eq("tipo_conta", "ALUNO")
      .maybeSingle();

    if (contaErr) {
      return errJson("server_error", "Falha ao buscar conta do Cartao Conexao.", 500, { contaErr });
    }

    const contaConexaoId = toPositiveNumber((conta as { id?: number }).id);
    if (!contaConexaoId) {
      return errJson("not_found", "conta_cartao_conexao_nao_encontrada", 404);
    }
    const diaVencimento = toPositiveNumber((conta as { dia_vencimento?: number | null }).dia_vencimento) ?? null;

    const { data: taRows, error: taErr } = await admin
      .from("turma_aluno")
      .select("turma_id,status,dt_inicio,dt_fim")
      .eq("matricula_id", matriculaId);

    if (taErr) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar_turma_aluno", detail: taErr.message },
        { status: 500 },
      );
    }

    const competenciaInicio = `${competencia}-01`;

    const turmaRows: TurmaVinculada[] = (taRows ?? [])
      .map((row) => {
        const record = row as TurmaAlunoRow;
        const turmaId = toPositiveNumber(record.turma_id);
        if (!turmaId) return null;
        const statusRaw = record.status;
        return {
          turma_id: turmaId,
          status: typeof statusRaw === "string" ? statusRaw : statusRaw ? String(statusRaw) : null,
          dt_inicio: record.dt_inicio ? String(record.dt_inicio) : null,
          dt_fim: record.dt_fim ? String(record.dt_fim) : null,
        };
      })
      .filter((row): row is TurmaVinculada => !!row)
      .filter((row) => {
        const statusNorm = row.status ? row.status.trim().toUpperCase() : null;
        const statusOk = !statusNorm || statusNorm === "ATIVO" || statusNorm === "ATIVA";
        if (!statusOk) return false;
        const inicioComp = row.dt_inicio ? row.dt_inicio.slice(0, 7) : null;
        if (inicioComp && inicioComp > competencia) return false;
        const fim = row.dt_fim ? row.dt_fim.slice(0, 10) : null;
        if (fim && fim < competenciaInicio) return false;
        return true;
      })
      .sort((a, b) => {
        const da = a.dt_inicio ?? "";
        const db = b.dt_inicio ?? "";
        if (da < db) return -1;
        if (da > db) return 1;
        return a.turma_id - b.turma_id;
      });

    if (turmaRows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "sem_turmas_ativas_para_matricula",
          debug: { matricula_id: matriculaId, rows: taRows ?? [] },
        },
        { status: 409 },
      );
    }

    const turmaIdsOrdenados = turmaRows.map((row) => row.turma_id);
    const cookieHeader = cookieStore.toString();

    let totalCentavos = 0;
    const itens: ComposicaoItem[] = [];

    for (let i = 0; i < turmaIdsOrdenados.length; i++) {
      const turmaId = turmaIdsOrdenados[i];
      const ordem = i + 1;

      const { data: ue, error: ueErr } = await admin
        .from("escola_unidades_execucao")
        .select("unidade_execucao_id, servico_id")
        .eq("origem_tipo", "TURMA")
        .eq("origem_id", turmaId)
        .maybeSingle();

      if (ueErr || !ue) {
        return NextResponse.json(
          {
            ok: false,
            error: "ue_nao_encontrada_para_turma",
            debug: { turma_id: turmaId, ueErr: ueErr?.message ?? null },
          },
          { status: 500 },
        );
      }

      const ueId = toPositiveNumber((ue as { unidade_execucao_id?: number }).unidade_execucao_id);
      const servicoId = toPositiveNumber((ue as { servico_id?: number }).servico_id);
      if (!ueId || !servicoId) {
        return NextResponse.json(
          {
            ok: false,
            error: "ue_invalida_para_turma",
            debug: { turma_id: turmaId, unidade_execucao_id: ueId, servico_id: servicoId },
          },
          { status: 500 },
        );
      }

      const { data: turma } = await admin.from("turmas").select("nome").eq("turma_id", turmaId).maybeSingle();
      const label = turma?.nome ? String(turma.nome) : `Turma ${turmaId}`;

      let resultado: { valor_centavos: number; descricao: string | null };
      try {
        resultado = await resolverMensalidadePorTurma(request, cookieHeader, alunoId, turmaId, anoRef, ordem);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "erro_resolver_preco";
        return NextResponse.json(
          {
            ok: false,
            error: "falha_resolver_preco",
            debug: { turma_id: turmaId, servico_id: servicoId, ue_id: ueId, message },
          },
          { status: 500 },
        );
      }

      totalCentavos += resultado.valor_centavos;
      const valorBrl = formatBrl(resultado.valor_centavos);

      itens.push({
        ordem,
        turma_id: turmaId,
        ue_id: ueId,
        servico_id: servicoId,
        label,
        valor_centavos: resultado.valor_centavos,
        valor_brl: valorBrl,
      });
    }

    const referenciaItem = buildReferenciaMatriculaContaInterna(matriculaId, competencia);
    const descricao =
      `Mensalidade ${competencia} - ` +
      itens.map((item) => `${item.ordem}a ${item.label}: ${item.valor_brl}`).join(" | ");
    const composicaoJson = {
      matricula_id: matriculaId,
      competencia,
      aluno_pessoa_id: alunoId,
      responsavel_financeiro_id: responsavelId,
      ano_referencia: anoRef,
      total_centavos: totalCentavos,
      total_brl: formatBrl(totalCentavos),
      itens,
    };

    const vencimento = buildVencimento(competencia, diaVencimento);

    const { data: cobrancaExistente, error: cobrFindErr } = await admin
      .from("cobrancas")
      .select("id")
      .eq("pessoa_id", responsavelId)
      .eq("origem_tipo", "MATRICULA")
      .eq("origem_id", matriculaId)
      .eq("origem_subtipo", "CARTAO_CONEXAO")
      .eq("competencia_ano_mes", competencia)
      .neq("status", "CANCELADA")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cobrFindErr) {
      return errJson("server_error", "Falha ao buscar cobranca.", 500, { cobrFindErr });
    }

    let cobrancaId = toPositiveNumber((cobrancaExistente as { id?: number } | null)?.id);

    if (!cobrancaId) {
      const { data: cobranca, error: cobrErr } = await admin
        .from("cobrancas")
        .insert({
          pessoa_id: responsavelId,
          descricao,
          valor_centavos: totalCentavos,
          vencimento,
          status: "PENDENTE",
          origem_tipo: "MATRICULA",
          origem_id: matriculaId,
          origem_subtipo: "CARTAO_CONEXAO",
          origem_item_tipo: "MATRICULA",
          origem_item_id: matriculaId,
          origem_label: `Matricula #${matriculaId}`,
          competencia_ano_mes: competencia,
        })
        .select("id")
        .single();

      if (cobrErr || !cobranca) {
        return errJson("server_error", "Falha ao criar cobranca.", 500, { cobrErr });
      }

      cobrancaId = toPositiveNumber((cobranca as { id?: number }).id);
    } else {
      const { error: cobrUpdErr } = await admin
        .from("cobrancas")
        .update({
          descricao,
          valor_centavos: totalCentavos,
          vencimento,
          origem_subtipo: "CARTAO_CONEXAO",
          origem_item_tipo: "MATRICULA",
          origem_item_id: matriculaId,
          origem_label: `Matricula #${matriculaId}`,
          competencia_ano_mes: competencia,
        })
        .eq("id", cobrancaId);

      if (cobrUpdErr) {
        return errJson("server_error", "Falha ao atualizar cobranca.", 500, { cobrUpdErr });
      }
    }

    if (!cobrancaId) {
      return errJson("server_error", "cobranca_id_invalido", 500);
    }

    try {
      await upsertLancamentoPorCobranca({
        cobrancaId,
        contaConexaoId,
        competencia,
        valorCentavos: totalCentavos,
        alunoId,
        matriculaId,
        descricao,
        referenciaItem,
        origemSistema: "MATRICULA_MENSAL",
        origemId: matriculaId,
        composicaoJson: composicaoJson as Record<string, unknown>,
      });
    } catch (upErr) {
      const detail = upErr instanceof Error ? upErr.message : String(upErr);
      return errJson("server_error", "falha_upsert_lancamento_consolidado", 500, { detail });
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          conta_conexao_id: contaConexaoId,
          cobranca_id: cobrancaId,
          competencia,
          referencia_item: referenciaItem,
          total_centavos: totalCentavos,
          itens,
        },
        debug: {
          turmas_encontradas: turmaRows,
          turma_ids_ordenados: turmaIdsOrdenados,
          total_centavos: totalCentavos,
          itens,
        },
      },
      { status: 200 },
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return errJson("server_error", "Erro inesperado ao gerar lancamentos mensais.", 500, { message: msg });
  }
}
