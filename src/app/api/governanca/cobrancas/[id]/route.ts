import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { formatarCompetenciaLabel, montarPessoaLabel } from "@/lib/financeiro/creditoConexao/cobrancas";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CobrancaDetalheRow = {
  id: number;
  pessoa_id: number | null;
  descricao: string | null;
  vencimento: string | null;
  valor_centavos: number | null;
  status: string | null;
  competencia_ano_mes: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  observacoes: string | null;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  neofin_payload: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  pessoa: {
    id?: number | null;
    nome: string | null;
    cpf: string | null;
    email: string | null;
    telefone: string | null;
  } | null;
};

type RecebimentoRow = {
  id: number;
  valor_centavos: number | null;
  data_pagamento: string | null;
};

type MatriculaRelacionadaRow = {
  id: number;
  pessoa_id: number | null;
  responsavel_financeiro_id: number | null;
  status: string | null;
  data_matricula: string | null;
};

const STATUSS_QUITADOS = new Set(["PAGO", "PAGA", "RECEBIDO", "RECEBIDA", "LIQUIDADO", "LIQUIDADA", "QUITADO", "QUITADA"]);

function normalizarTexto(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizarStatus(value: string | null | undefined): string {
  return normalizarTexto(value)?.toUpperCase() ?? "";
}

function isMatriculaOrigem(origemTipo: string | null | undefined): boolean {
  const normalized = normalizarStatus(origemTipo);
  return normalized === "MATRICULA" || normalized.startsWith("MATRICULA_");
}

function inferirCompetencia(competencia: string | null, vencimento: string | null): string | null {
  const competenciaNormalizada = normalizarTexto(competencia);
  if (competenciaNormalizada && /^\d{4}-\d{2}$/.test(competenciaNormalizada)) {
    return competenciaNormalizada;
  }

  const vencimentoNormalizado = normalizarTexto(vencimento);
  if (vencimentoNormalizado && /^\d{4}-\d{2}-\d{2}/.test(vencimentoNormalizado)) {
    return vencimentoNormalizado.slice(0, 7);
  }

  return null;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const denied = await guardApiByRole(req as Request);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const { id } = await params;
  const cobrancaId = Number(id);

  if (!Number.isFinite(cobrancaId) || cobrancaId <= 0) {
    return NextResponse.json({ ok: false, error: "cobranca_id_invalido" }, { status: 400 });
  }

  const { data: cobranca, error: cobrancaError } = await supabase
    .from("cobrancas")
    .select(
      `
      id,
      pessoa_id,
      descricao,
      vencimento,
      valor_centavos,
      status,
      competencia_ano_mes,
      origem_tipo,
      origem_subtipo,
      origem_id,
      data_pagamento,
      metodo_pagamento,
      observacoes,
      neofin_charge_id,
      link_pagamento,
      linha_digitavel,
      neofin_payload,
      created_at,
      updated_at,
      pessoa:pessoas(id,nome,cpf,email,telefone)
      `,
    )
    .eq("id", cobrancaId)
    .maybeSingle<CobrancaDetalheRow>();

  if (cobrancaError || !cobranca) {
    return NextResponse.json({ ok: false, error: "cobranca_nao_encontrada" }, { status: 404 });
  }

  const pessoaId = typeof cobranca.pessoa_id === "number" && Number.isFinite(cobranca.pessoa_id) ? cobranca.pessoa_id : null;

  const [recebimentosResult, matriculasResult] = await Promise.all([
    supabase
      .from("recebimentos")
      .select("id,valor_centavos,data_pagamento")
      .eq("cobranca_id", cobrancaId)
      .order("data_pagamento", { ascending: false, nullsFirst: false }),
    pessoaId
      ? supabase
          .from("matriculas")
          .select("id,pessoa_id,responsavel_financeiro_id,status,data_matricula")
          .or(`responsavel_financeiro_id.eq.${pessoaId},pessoa_id.eq.${pessoaId}`)
          .order("id", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (recebimentosResult.error) {
    return NextResponse.json(
      {
        ok: false,
        error: "falha_buscar_recebimentos_cobranca",
        detail: recebimentosResult.error.message,
      },
      { status: 500 },
    );
  }

  if (matriculasResult.error) {
    return NextResponse.json(
      {
        ok: false,
        error: "falha_buscar_matriculas_relacionadas",
        detail: matriculasResult.error.message,
      },
      { status: 500 },
    );
  }

  const recebimentos = ((recebimentosResult.data ?? []) as RecebimentoRow[]) ?? [];
  const totalRecebido = recebimentos.reduce(
    (acc, item) => acc + (typeof item.valor_centavos === "number" ? item.valor_centavos : 0),
    0,
  );
  const ultimoPagamento = normalizarTexto(recebimentos[0]?.data_pagamento) ?? normalizarTexto(cobranca.data_pagamento);

  const matriculasBase = Array.from(
    new Map(
      (((matriculasResult.data ?? []) as MatriculaRelacionadaRow[]) ?? []).map((item) => [item.id, item] as const),
    ).values(),
  );

  const matriculasRelacionadas = matriculasBase.map((item) => {
    const relacionamento =
      item.id === cobranca.origem_id && isMatriculaOrigem(cobranca.origem_tipo)
        ? "ORIGEM_COBRANCA"
        : item.responsavel_financeiro_id === pessoaId
          ? "PESSOA_RESPONSAVEL"
          : "PESSOA_ALUNA";

    return {
      id: item.id,
      status: item.status,
      data_matricula: item.data_matricula,
      relacionamento,
    };
  });

  const origemId = typeof cobranca.origem_id === "number" && Number.isFinite(cobranca.origem_id) ? cobranca.origem_id : null;
  let matriculaRelacionadaId: number | null = null;
  let matriculaRelacionadaOrigem: "ORIGEM_COBRANCA" | "MATRICULA_UNICA_DA_PESSOA" | null = null;

  if (origemId && isMatriculaOrigem(cobranca.origem_tipo)) {
    matriculaRelacionadaId = origemId;
    matriculaRelacionadaOrigem = "ORIGEM_COBRANCA";

    if (!matriculasRelacionadas.some((item) => item.id === origemId)) {
      matriculasRelacionadas.unshift({
        id: origemId,
        status: null,
        data_matricula: null,
        relacionamento: "ORIGEM_COBRANCA",
      });
    }
  } else if (matriculasRelacionadas.length === 1) {
    matriculaRelacionadaId = matriculasRelacionadas[0]?.id ?? null;
    matriculaRelacionadaOrigem = matriculaRelacionadaId ? "MATRICULA_UNICA_DA_PESSOA" : null;
  }

  const valorCentavos = typeof cobranca.valor_centavos === "number" && Number.isFinite(cobranca.valor_centavos) ? cobranca.valor_centavos : 0;
  const statusNormalizado = normalizarStatus(cobranca.status);
  const statusQuitado =
    STATUSS_QUITADOS.has(statusNormalizado) ||
    Boolean(normalizarTexto(cobranca.data_pagamento)) ||
    (valorCentavos > 0 && totalRecebido >= valorCentavos);
  const statusCancelado = statusNormalizado === "CANCELADA";
  const competencia = inferirCompetencia(cobranca.competencia_ano_mes, cobranca.vencimento);
  const pessoaNome = normalizarTexto(cobranca.pessoa?.nome) ?? null;

  return NextResponse.json(
    {
      ok: true,
      data: {
        ...cobranca,
        pessoa_nome: pessoaNome,
        pessoa_label: montarPessoaLabel(pessoaNome, pessoaId),
        competencia_ano_mes: competencia,
        competencia_label: competencia ? formatarCompetenciaLabel(competencia) : null,
        recebimentos_resumo: {
          quantidade: recebimentos.length,
          total_centavos: totalRecebido,
          ultimo_pagamento: ultimoPagamento,
        },
        matriculas_relacionadas: matriculasRelacionadas,
        matricula_relacionada_id: matriculaRelacionadaId,
        matricula_relacionada_origem: matriculaRelacionadaOrigem,
        pode_registrar_pagamento: !statusCancelado && !statusQuitado,
        pode_cancelar: !statusCancelado && !statusQuitado && totalRecebido === 0 && !cobranca.neofin_charge_id,
        pode_reprocessar_pessoa: Boolean(pessoaId) && matriculasRelacionadas.length > 0,
        pode_reprocessar_matricula: Boolean(matriculaRelacionadaId),
      },
    },
    { status: 200 },
  );
}
