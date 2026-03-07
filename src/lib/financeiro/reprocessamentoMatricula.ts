import {
  GET as getSugestoesReprocessamentoFinanceiroMatricula,
  POST as postReprocessamentoFinanceiroMatricula,
} from "@/app/api/escola/matriculas/[id]/reprocessar-financeiro/route";

type SugestaoEntrada = {
  valor_centavos: number;
  pago_no_ato: boolean;
  metodo_pagamento: string;
  data_pagamento: string;
  observacoes: string;
};

type SugestaoMensalidade = {
  competencia: string;
  valor_centavos: number;
  descricao: string;
};

type SugestoesFinanceirasResponse = {
  ok?: boolean;
  error?: string;
  detail?: string | null;
  matricula_id?: number;
  sugestoes?: {
    entrada?: SugestaoEntrada;
    mensalidades?: SugestaoMensalidade[];
  };
  fontes?: {
    entrada?: string;
    mensalidades?: string;
  };
};

type ExecucaoFinanceiraResponse = {
  ok?: boolean;
  error?: string;
  detail?: string | null;
  matricula_id?: number;
  conta_conexao_id?: number;
  resultados?: {
    cobrancas_criadas?: number[];
    cobrancas_atualizadas?: number[];
    lancamentos_upsert?: Array<{
      cobranca_id: number;
      lancamento_id: number | null;
    }>;
    entrada?: {
      cobranca_id: number | null;
      recebimento_id: number | null;
    };
    faturas_rebuild?: Array<{
      competencia: string;
      fatura_id: number | null;
    }>;
  };
  cobrancas_existentes?: Array<{
    id: number;
    competencia_ano_mes: string | null;
    valor_centavos: number | null;
    status: string | null;
  }>;
};

export type ReprocessamentoFinanceiroMatriculaResumo = {
  matricula_id: number;
  competencias_processadas: string[];
  cobrancas_criadas: number;
  cobrancas_atualizadas: number;
  lancamentos_upsert: number;
  entrada_reprocessada: boolean;
  faturas_afetadas: string[];
};

export type ReprocessamentoFinanceiroMatriculaSucesso = {
  ok: true;
  status: number;
  sugestoes: SugestoesFinanceirasResponse;
  execucao: ExecucaoFinanceiraResponse;
  resumo: ReprocessamentoFinanceiroMatriculaResumo;
};

export type ReprocessamentoFinanceiroMatriculaFalha = {
  ok: false;
  status: number;
  etapa: "sugestoes" | "execucao";
  body: unknown;
};

export type ReprocessamentoFinanceiroMatriculaResult =
  | ReprocessamentoFinanceiroMatriculaSucesso
  | ReprocessamentoFinanceiroMatriculaFalha;

type ExecuteOptions = {
  motivo?: string;
};

function buildRouteContext(matriculaId: number) {
  return {
    params: Promise.resolve({ id: String(matriculaId) }),
  };
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.clone().json()) as T;
  } catch {
    return null;
  }
}

function buildPostRequest(request: Request, payload: unknown): Request {
  const headers = new Headers(request.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");

  return new Request(request.url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

function buildResumo(
  matriculaId: number,
  sugestoes: SugestoesFinanceirasResponse,
  execucao: ExecucaoFinanceiraResponse,
): ReprocessamentoFinanceiroMatriculaResumo {
  const mensalidades = Array.isArray(sugestoes.sugestoes?.mensalidades) ? sugestoes.sugestoes?.mensalidades : [];
  const resultados = execucao.resultados ?? {};

  return {
    matricula_id: matriculaId,
    competencias_processadas: mensalidades.map((item) => item.competencia),
    cobrancas_criadas: resultados.cobrancas_criadas?.length ?? 0,
    cobrancas_atualizadas: resultados.cobrancas_atualizadas?.length ?? 0,
    lancamentos_upsert: resultados.lancamentos_upsert?.length ?? 0,
    entrada_reprocessada: Boolean(resultados.entrada?.cobranca_id),
    faturas_afetadas: (resultados.faturas_rebuild ?? [])
      .map((item) => item.competencia)
      .filter((item): item is string => typeof item === "string" && item.length > 0),
  };
}

export async function executarReprocessamentoFinanceiroMatricula(
  request: Request,
  matriculaId: number,
  options?: ExecuteOptions,
): Promise<ReprocessamentoFinanceiroMatriculaResult> {
  const routeContext = buildRouteContext(matriculaId);
  const sugestoesResponse = await getSugestoesReprocessamentoFinanceiroMatricula(request, routeContext);
  const sugestoesBody = await parseJsonSafe<SugestoesFinanceirasResponse>(sugestoesResponse);

  if (
    !sugestoesResponse.ok ||
    !sugestoesBody?.ok ||
    !Array.isArray(sugestoesBody.sugestoes?.mensalidades) ||
    sugestoesBody.sugestoes.mensalidades.length === 0
  ) {
    return {
      ok: false,
      status: sugestoesResponse.status,
      etapa: "sugestoes",
      body:
        sugestoesBody ??
        ({
          ok: false,
          error: "falha_buscar_sugestoes_reprocessamento",
        } satisfies Record<string, unknown>),
    };
  }

  const payload = {
    entrada: sugestoesBody.sugestoes.entrada,
    mensalidades: sugestoesBody.sugestoes.mensalidades,
    motivo: options?.motivo ?? "Reprocessamento financeiro manual via governanca.",
  };

  const execucaoRequest = buildPostRequest(request, payload);
  const execucaoResponse = await postReprocessamentoFinanceiroMatricula(execucaoRequest, routeContext);
  const execucaoBody = await parseJsonSafe<ExecucaoFinanceiraResponse>(execucaoResponse);

  if (!execucaoResponse.ok || !execucaoBody?.ok) {
    return {
      ok: false,
      status: execucaoResponse.status,
      etapa: "execucao",
      body:
        execucaoBody ??
        ({
          ok: false,
          error: "falha_reprocessar_financeiro",
        } satisfies Record<string, unknown>),
    };
  }

  return {
    ok: true,
    status: execucaoResponse.status,
    sugestoes: sugestoesBody,
    execucao: execucaoBody,
    resumo: buildResumo(matriculaId, sugestoesBody, execucaoBody),
  };
}
