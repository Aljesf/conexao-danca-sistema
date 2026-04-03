import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { requireUser } from "@/lib/supabase/api-auth";
import { aplicarBolsaNaMatricula } from "@/lib/bolsas/aplicarBolsaNaMatricula";
import { calcularValorFamiliaCentavos, isBolsaTipoModo, type BolsaTipoModo } from "@/lib/bolsas/bolsasTypes";
import { liquidarPrimeiraMatricula } from "@/lib/matriculas/liquidarPrimeiraMatricula";
import {
  buscarMatriculaAtivaExistentePorPessoa,
  insertMatriculaItens,
  vincularTurmaAlunoPorItens,
  type MatriculaItemInsert,
  type MatriculaAtivaExistenteResumo,
  type TurmaAlunoVinculoResumo,
} from "@/lib/matriculas/matriculaItens";
import { inserirMatriculaEventoSupabase } from "@/lib/matriculas/eventos";
import { buscarMatriculasCanceladasPorPessoa } from "@/lib/matriculas/reativacaoData";
import type { MatriculaReativacaoEligibilidade } from "@/lib/matriculas/reativacao";
 
type TipoMatricula = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
type MetodoLiquidacao = "CARTAO_CONEXAO" | "COBRANCAS_LEGADO" | "CREDITO_BOLSA" | "OUTRO";
type ModeloLiquidacaoExecucao = "FAMILIA" | "BOLSA";

type PlanoPagamentoMvp = {
  id: number;
  ativo: boolean;
  ciclo_cobranca: "COBRANCA_UNICA" | "COBRANCA_EM_PARCELAS" | "COBRANCA_MENSAL" | null;
  numero_parcelas: number | null;
  termino_cobranca: "FIM_TURMA_CURSO" | "FIM_PROJETO" | "FIM_ANO_LETIVO" | "DATA_ESPECIFICA" | null;
  data_fim_manual: string | null;
  regra_total_devido: "PROPORCIONAL" | "FIXO" | null;
  permite_prorrata: boolean | null;
  ciclo_financeiro: "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | null;
  forma_liquidacao_padrao: string | null;
};

type PoliticaPrimeiroPagamento = {
  modo: "PADRAO" | "ADIAR_PARA_VENCIMENTO";
  motivo_excecao?: string | null;
};

type ExecucaoManualIn = {
  turma_id: number;
  nivel?: string | null;
  nivel_id?: number | null;
  valor_mensal_centavos?: number | null;
  liquidacao_tipo?: ModeloLiquidacaoExecucao | null;
  bolsa?: {
    projeto_social_id?: number | null;
    bolsa_tipo_id?: number | null;
  } | null;
};

type ExecucaoManual = {
  turma_id: number;
  nivel: string;
  nivel_id: number | null;
  valor_mensal_centavos: number;
  liquidacao_tipo: ModeloLiquidacaoExecucao;
  bolsa: {
    projeto_social_id: number;
    bolsa_tipo_id: number;
  } | null;
};

type ExecucaoPersistencia = {
  turma_id: number;
  nivel: string;
  valor_mensal_centavos: number;
  liquidacao_tipo: ModeloLiquidacaoExecucao;
  origem_valor: string;
};

type ResumoCusteio = {
  familia_centavos: number;
  projeto_social_centavos: number;
};

type BodyNovo = {
  pessoa_id: number;
  responsavel_financeiro_id: number;
  tipo_matricula: TipoMatricula;
  ignorar_matricula_cancelada?: boolean | null;
  metodo_liquidacao?: MetodoLiquidacao | null;
  vinculo_id: number;
  nivel_id?: number | null;
  vinculos_ids?: number[] | null;
  itens?: MatriculaItemIn[] | null;
  ano_referencia?: number | null;
  data_matricula?: string | null;
  data_inicio_vinculo?: string | null;
  escola_tabela_preco_curso_id?: number | null;
  plano_pagamento_id?: number | null;
  forma_liquidacao_padrao?: string | null;
  documento_modelo_id?: number | null;
  contrato_modelo_id?: number | null;
  observacoes?: string | null;
  total_mensalidade_centavos?: number | null;
  execucoes?: ExecucaoManualIn[] | null;
  politica_primeiro_pagamento?: PoliticaPrimeiroPagamento | null;
};

type MatriculaItemIn = {
  servico_id: number;
  unidade_execucao_id: number;
  turma_id?: number | null;
};

type MatriculaItem = {
  servico_id: number;
  unidade_execucao_id: number;
  turma_id: number;
};

type MatriculaItemDraft = {
  turma_id: number | null;
  modulo_id: number | null;
  descricao: string;
  origem_tipo: string;
  valor_base_centavos: number;
  valor_liquido_centavos: number;
  data_inicio: string | null;
  observacoes: string | null;
};

type TurmaResumo = {
  turma_id: number;
  produto_id: number | null;
  nome: string | null;
};

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "bad_request", message, details: details ?? null }, { status: 400 });
}

function conflict(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "conflict", message, details: details ?? null }, { status: 409 });
}

function jsonError(
  error_code: string,
  error: unknown,
  status: number = 500,
  extra?: Record<string, unknown>,
) {
  const messageFromObject =
    error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string"
      ? (error as { message: string }).message
      : null;
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : messageFromObject ?? "erro_interno";
  console.error(`[api/matriculas/novo] ${error_code}:`, message, extra ?? {});
  return NextResponse.json({ ok: false, error_code, error: message, ...(extra ?? {}) }, { status });
}

function serverError(error_code: string, message: string, details?: Record<string, unknown>) {
  return jsonError(error_code, message, 500, details ? { details } : undefined);
}

function buildMatriculaAtivaExistentePayload(matricula: MatriculaAtivaExistenteResumo) {
  return {
    ok: false,
    error: "matricula_ativa_existente",
    matricula_existente: true,
    matricula_id: matricula.id,
    message:
      "A pessoa ja possui matricula ativa. Abra a matricula existente para acrescentar/remover modulos ou trocar turma.",
    matricula: {
      id: matricula.id,
      status: matricula.status,
      tipo_matricula: matricula.tipo_matricula,
      ano_referencia: matricula.ano_referencia,
      vinculo_id: matricula.vinculo_id,
      turma_nome: matricula.turma_nome,
      data_matricula: matricula.data_matricula,
      data_inicio_vinculo: matricula.data_inicio_vinculo,
    },
  };
}

function buildMatriculaCanceladaExistentePayload(contexto: MatriculaReativacaoEligibilidade) {
  return {
    ok: false,
    error: "matricula_cancelada_existente",
    possui_matricula_cancelada: contexto.possui_matricula_cancelada,
    matriculas_canceladas_encontradas: contexto.matriculas_canceladas_encontradas,
    acao_sugerida: contexto.acao_sugerida,
    message:
      "Esta pessoa possui matricula cancelada. Reative a matricula anterior para preservar historico e ajustar modulos/turmas, ou confirme a criacao de uma nova matricula.",
  };
}

function parseDateOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value;
}

function parseDateYmdOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function parsePositiveIntOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

function parseMetodoLiquidacao(value: unknown): MetodoLiquidacao {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (raw === "CARTAO_CONEXAO") return "CARTAO_CONEXAO";
  if (raw === "COBRANCAS_LEGADO") return "COBRANCAS_LEGADO";
  if (raw === "CREDITO_BOLSA") return "CREDITO_BOLSA";
  if (raw === "OUTRO") return "OUTRO";
  return "CARTAO_CONEXAO";
}

function parseModeloLiquidacaoExecucao(value: unknown): ModeloLiquidacaoExecucao {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  return raw === "BOLSA" ? "BOLSA" : "FAMILIA";
}

function isSchemaMissingError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  if (code === "42P01" || code === "42703") return true;
  const msgRaw = (err as { message?: unknown }).message;
  const msg = typeof msgRaw === "string" ? msgRaw.toLowerCase() : "";
  return msg.includes("does not exist") || msg.includes("relation") || msg.includes("column");
}

function normalizeIdArray(value: unknown): number[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of value) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return null;
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function parseItens(value: unknown): MatriculaItemIn[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const itens: MatriculaItemIn[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Record<string, unknown>;
    const servicoId = Number(record.servico_id);
    const unidadeExecucaoId = Number(record.unidade_execucao_id);
    if (!Number.isFinite(servicoId) || servicoId <= 0) return null;
    if (!Number.isFinite(unidadeExecucaoId) || unidadeExecucaoId <= 0) return null;
    const turmaRaw = record.turma_id;
    const turmaId = turmaRaw === undefined || turmaRaw === null ? null : Number(turmaRaw);
    if (turmaRaw !== undefined && turmaRaw !== null) {
      if (!Number.isFinite(turmaId) || (turmaId as number) <= 0) return null;
    }
    itens.push({
      servico_id: servicoId,
      unidade_execucao_id: unidadeExecucaoId,
      turma_id: Number.isFinite(turmaId as number) ? (turmaId as number) : null,
    });
  }
  return itens;
}

function parseExecucoes(value: unknown): ExecucaoManual[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const execucoes: ExecucaoManual[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Record<string, unknown>;
    const turmaId = Number(record.turma_id);
    if (!Number.isInteger(turmaId) || turmaId <= 0) return null;
    const valorRaw = record.valor_mensal_centavos ?? record.valor_mensal;
    const valor = Number(valorRaw);
    if (!Number.isFinite(valor) || !Number.isInteger(valor) || valor < 0) return null;
    const nivel = typeof record.nivel === "string" ? record.nivel.trim() : "";
    const nivelIdRaw = record.nivel_id;
    const nivelId = nivelIdRaw === undefined || nivelIdRaw === null ? null : Number(nivelIdRaw);
    if (nivelIdRaw !== undefined && nivelIdRaw !== null && (!Number.isInteger(nivelId) || nivelId <= 0)) return null;
    const liquidacaoTipo = parseModeloLiquidacaoExecucao(record.liquidacao_tipo ?? record.modelo_liquidacao);
    const bolsaRaw = record.bolsa;
    let bolsa: ExecucaoManual["bolsa"] = null;
    if (liquidacaoTipo === "BOLSA") {
      if (!bolsaRaw || typeof bolsaRaw !== "object") return null;
      const bolsaRecord = bolsaRaw as Record<string, unknown>;
      const projetoSocialId = parsePositiveIntOrNull(bolsaRecord.projeto_social_id);
      const bolsaTipoId = parsePositiveIntOrNull(bolsaRecord.bolsa_tipo_id);
      if (!projetoSocialId || !bolsaTipoId) return null;
      bolsa = {
        projeto_social_id: projetoSocialId,
        bolsa_tipo_id: bolsaTipoId,
      };
    }
    execucoes.push({
      turma_id: turmaId,
      nivel,
      nivel_id: Number.isInteger(nivelId) ? nivelId : null,
      valor_mensal_centavos: Math.trunc(valor),
      liquidacao_tipo: liquidacaoTipo,
      bolsa,
    });
  }
  return execucoes;
}

function buildDescricaoMatriculaItem(params: {
  turmaNome?: string | null;
  turmaId?: number | null;
  moduloId?: number | null;
  prefixo?: string;
}) {
  const turmaNome = typeof params.turmaNome === "string" ? params.turmaNome.trim() : "";
  if (turmaNome) return turmaNome;
  if (params.moduloId) return `${params.prefixo ?? "Modulo"} #${params.moduloId}`;
  if (params.turmaId) return `Turma #${params.turmaId}`;
  return params.prefixo ?? "Item da matricula";
}

function isExecucaoManual(x: unknown): x is ExecucaoManual {
  if (!x || typeof x !== "object") return false;
  const record = x as Record<string, unknown>;
  const turmaId = Number(record.turma_id);
  if (!Number.isFinite(turmaId) || turmaId <= 0) return false;
  const valorRaw = record.valor_mensal_centavos ?? record.valor_mensal;
  const valor = Number(valorRaw);
  if (!Number.isFinite(valor)) return false;
  const nivelIdRaw = record.nivel_id;
  if (nivelIdRaw !== undefined && nivelIdRaw !== null && !Number.isFinite(Number(nivelIdRaw))) return false;
  if (typeof record.nivel !== "string" && (nivelIdRaw === undefined || nivelIdRaw === null)) return false;
  const liquidacao = parseModeloLiquidacaoExecucao(record.liquidacao_tipo ?? record.modelo_liquidacao);
  if (liquidacao === "BOLSA") {
    const bolsaRaw = record.bolsa;
    if (!bolsaRaw || typeof bolsaRaw !== "object") return false;
    const bolsa = bolsaRaw as Record<string, unknown>;
    if (!Number.isFinite(Number(bolsa.projeto_social_id))) return false;
    if (!Number.isFinite(Number(bolsa.bolsa_tipo_id))) return false;
  }
  return true;
}

function buildOrigemValorExecucao(execucao: ExecucaoManual): string {
  if (execucao.liquidacao_tipo === "BOLSA") {
    const projetoSocialId = execucao.bolsa?.projeto_social_id;
    if (projetoSocialId) return `MANUAL|BOLSA|${projetoSocialId}`;
    return "MANUAL|BOLSA";
  }
  return "MANUAL|FAMILIA";
}

function parsePoliticaPrimeiroPagamento(value: unknown): PoliticaPrimeiroPagamento | null {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const modoRaw = typeof record.modo === "string" ? record.modo.trim().toUpperCase() : "PADRAO";
  if (modoRaw !== "PADRAO" && modoRaw !== "ADIAR_PARA_VENCIMENTO") return null;
  const motivo = typeof record.motivo_excecao === "string" ? record.motivo_excecao.trim() : null;
  return { modo: modoRaw as PoliticaPrimeiroPagamento["modo"], motivo_excecao: motivo };
}

function parseDateParts(value: string | null | undefined): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

type PrimeiraCobrancaCalc = {
  tipo: "ENTRADA_PRORATA" | "MENSALIDADE_CHEIA_CARTAO";
  valor_centavos: number;
  ano_base: number;
  mes_base: number;
  mes_primeira_mensalidade: number;
};

function calcularPrimeiraCobranca(params: {
  totalCentavos: number;
  dataInicio: string | null;
  dataMatricula: string | null;
  dia_corte_prorata?: number | null;
  data_limite_exercicio?: string | null;
}): PrimeiraCobrancaCalc {
  const { totalCentavos, dataInicio, dataMatricula } = params;
  const hoje = new Date();
  const fallback = {
    year: hoje.getUTCFullYear(),
    month: hoje.getUTCMonth() + 1,
    day: hoje.getUTCDate(),
  };
  const dataBase = parseDateParts(dataInicio) ?? parseDateParts(dataMatricula) ?? fallback;
  const { year, month, day } = dataBase;
  // M6: cutoffDia e inicioLetivoJaneiro vêm de escola_config_financeira.dia_corte_prorata
  const cutoffDia = (params as any).dia_corte_prorata ?? 12;
  const inicioLetivoJaneiro = cutoffDia;

  // M7: Limite máximo de mês baseado em data_limite_exercicio (default: 12)
  const dataLimiteExercicio = (params as any).data_limite_exercicio as string | null | undefined;
  const mesLimiteExercicio = dataLimiteExercicio
    ? Number(dataLimiteExercicio.slice(5, 7)) || 12
    : 12;

  if (month === 1) {
    if (day <= inicioLetivoJaneiro) {
      return {
        tipo: "MENSALIDADE_CHEIA_CARTAO",
        valor_centavos: Math.trunc(totalCentavos),
        ano_base: year,
        mes_base: month,
        mes_primeira_mensalidade: month,
      };
    }
    const baseDiasJaneiro = 31 - inicioLetivoJaneiro + 1;
    const diasRestantes = Math.max(0, 31 - day + 1);
    const valor = Math.round((totalCentavos * diasRestantes) / baseDiasJaneiro);
    return {
      tipo: "ENTRADA_PRORATA",
      valor_centavos: Math.max(0, valor),
      ano_base: year,
      mes_base: month,
      mes_primeira_mensalidade: Math.min(mesLimiteExercicio, month + 1),
    };
  }

  if (day <= cutoffDia) {
    return {
      tipo: "MENSALIDADE_CHEIA_CARTAO",
      valor_centavos: Math.trunc(totalCentavos),
      ano_base: year,
      mes_base: month,
      mes_primeira_mensalidade: month,
    };
  }

  const ultimoDia = lastDayOfMonth(year, month);
  const diasRestantes = Math.max(0, ultimoDia - day + 1);
  const valor = Math.round((totalCentavos * diasRestantes) / 30);
  return {
    tipo: "ENTRADA_PRORATA",
    valor_centavos: Math.max(0, valor),
    ano_base: year,
    mes_base: month,
    mes_primeira_mensalidade: Math.min(mesLimiteExercicio, month + 1),
  };
}

async function rollbackCompensatorioMatricula(params: {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  matriculaId: number;
  bolsaConcessaoIds: number[];
}): Promise<{ ok: boolean; errors: string[] }> {
  const { supabase, matriculaId, bolsaConcessaoIds } = params;
  const errors: string[] = [];
  const pushErr = (scope: string, err: unknown) => {
    if (!err || isSchemaMissingError(err)) return;
    const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message ?? "erro") : "erro";
    errors.push(`${scope}: ${msg}`);
  };

  const { data: cobrancasOrigemRows, error: cobrancasOrigemErr } = await supabase
    .from("cobrancas")
    .select("id")
    .eq("origem_tipo", "MATRICULA")
    .eq("origem_id", matriculaId);
  pushErr("listar_cobrancas_origem", cobrancasOrigemErr);
  const cobrancaIds = new Set<number>(
    (cobrancasOrigemRows ?? [])
      .map((row) => Number((row as { id?: unknown }).id))
      .filter((id) => Number.isInteger(id) && id > 0),
  );

  const { data: lancRows, error: lancRowsErr } = await supabase
    .from("credito_conexao_lancamentos")
    .select("id,cobranca_id")
    .eq("origem_sistema", "MATRICULA")
    .eq("origem_id", matriculaId);
  pushErr("listar_lancamentos_cartao", lancRowsErr);
  const lancamentoIds = (lancRows ?? [])
    .map((row) => Number((row as { id?: unknown }).id))
    .filter((id) => Number.isInteger(id) && id > 0);
  for (const row of lancRows ?? []) {
    const cobrancaId = Number((row as { cobranca_id?: unknown }).cobranca_id);
    if (Number.isInteger(cobrancaId) && cobrancaId > 0) cobrancaIds.add(cobrancaId);
  }

  const cobrancaIdsArr = Array.from(cobrancaIds);

  const { error: eBolsaLedger } = await supabase.from("bolsa_ledger").delete().eq("matricula_id", matriculaId);
  pushErr("delete_bolsa_ledger", eBolsaLedger);

  const { error: eFinanceiroLinhas } = await supabase
    .from("matriculas_financeiro_linhas")
    .delete()
    .eq("matricula_id", matriculaId);
  pushErr("delete_matriculas_financeiro_linhas", eFinanceiroLinhas);

  const { error: eTurmaAluno } = await supabase.from("turma_aluno").delete().eq("matricula_id", matriculaId);
  pushErr("delete_turma_aluno", eTurmaAluno);

  const { error: eCobrancaAvulsa } = await supabase
    .from("financeiro_cobrancas_avulsas")
    .delete()
    .eq("origem_tipo", "MATRICULA_ENTRADA")
    .eq("origem_id", matriculaId);
  pushErr("delete_cobrancas_avulsas", eCobrancaAvulsa);

  if (lancamentoIds.length > 0) {
    const { error: eLinksFatura } = await supabase
      .from("credito_conexao_fatura_lancamentos")
      .delete()
      .in("lancamento_id", lancamentoIds);
    pushErr("delete_fatura_lancamentos", eLinksFatura);
  }

  if (lancamentoIds.length > 0) {
    const { error: eLancamentos } = await supabase
      .from("credito_conexao_lancamentos")
      .delete()
      .in("id", lancamentoIds);
    pushErr("delete_lancamentos_cartao", eLancamentos);
  }

  if (cobrancaIdsArr.length > 0) {
    const { error: eRecebimentos } = await supabase
      .from("recebimentos")
      .delete()
      .in("cobranca_id", cobrancaIdsArr);
    pushErr("delete_recebimentos", eRecebimentos);
  }

  if (cobrancaIdsArr.length > 0) {
    const { error: eCobrancas } = await supabase.from("cobrancas").delete().in("id", cobrancaIdsArr);
    pushErr("delete_cobrancas", eCobrancas);
  }

  const { error: eBolsaConcessoesMatricula } = await supabase
    .from("bolsa_concessoes")
    .delete()
    .eq("matricula_id", matriculaId);
  pushErr("delete_bolsa_concessoes_matricula", eBolsaConcessoesMatricula);

  const bolsaConcessaoIdsUnicos = Array.from(
    new Set(bolsaConcessaoIds.filter((id) => Number.isInteger(id) && id > 0)),
  );
  if (bolsaConcessaoIdsUnicos.length > 0) {
    const { error: eBolsaConcessoesIds } = await supabase
      .from("bolsa_concessoes")
      .delete()
      .in("id", bolsaConcessaoIdsUnicos);
    pushErr("delete_bolsa_concessoes_ids", eBolsaConcessoesIds);
  }

  const { error: eExecucoes } = await supabase
    .from("matricula_execucao_valores")
    .delete()
    .eq("matricula_id", matriculaId);
  pushErr("delete_execucoes_manuais", eExecucoes);

  const { error: eItensNovaCamada } = await (supabase as unknown as { from: (table: string) => any })
    .from("matricula_itens")
    .delete()
    .eq("matricula_id", matriculaId);
  pushErr("delete_matricula_itens", eItensNovaCamada);

  const { error: eItens } = await supabase.from("matriculas_itens").delete().eq("matricula_id", matriculaId);
  pushErr("delete_matriculas_itens", eItens);

  const { error: eMatricula } = await supabase.from("matriculas").delete().eq("id", matriculaId);
  pushErr("delete_matricula", eMatricula);

  return { ok: errors.length === 0, errors };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth instanceof NextResponse) return auth;

    const { supabase, userId } = auth;

    const { data: isAdmin, error: adminErr } = await supabase.rpc("is_admin", { uid: userId });

    if (adminErr) {
      console.error("[api/matriculas/novo] rpc is_admin error:", adminErr);
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "forbidden", message: "Sem permissão para concluir matrícula." },
        { status: 403 },
      );
    }

    const admin = getSupabaseAdmin();
    const cookieHeader = request.headers.get("cookie") ?? "";

    let body: BodyNovo;
    try {
      body = (await request.json()) as BodyNovo;
    } catch {
      return badRequest("JSON invalido.");
    }

  const metodoLiquidacaoInput = parseMetodoLiquidacao(body.metodo_liquidacao);
  let metodoLiquidacao = metodoLiquidacaoInput;

  const pessoaId = Number(body.pessoa_id);
  const respFinId = Number(body.responsavel_financeiro_id);
  const tipoMatricula = body.tipo_matricula;
  const itensParsed = parseItens(body.itens);
  if (itensParsed === null) {
    return badRequest("itens invalidos.");
  }
  const execucoesRaw = (body as Record<string, unknown>).execucoes;
  const execucoesArray = Array.isArray(execucoesRaw) ? execucoesRaw : null;
  const modoManual = !!execucoesArray;
  if (execucoesArray && !execucoesArray.every(isExecucaoManual)) {
    return badRequest("execucoes invalidas.");
  }
  const execucoesParsed = parseExecucoes(execucoesRaw);
  if (execucoesParsed === null) {
    return badRequest("execucoes invalidas.");
  }
  const execucoesIn = execucoesParsed ?? [];
  const hasExecucoes = Object.prototype.hasOwnProperty.call(body as Record<string, unknown>, "execucoes");
  if (hasExecucoes && execucoesIn.length === 0) {
    return badRequest("execucoes_obrigatorias.");
  }
  const totalMensalidadeManual =
    typeof body.total_mensalidade_centavos === "number" ? Number(body.total_mensalidade_centavos) : NaN;
  if (modoManual && (!Number.isFinite(totalMensalidadeManual) || totalMensalidadeManual <= 0)) {
    return NextResponse.json(
      { ok: false, error: "total_mensalidade_centavos_invalido_no_modo_manual" },
      { status: 400 },
    );
  }
  const politicaPrimeiroPagamento = parsePoliticaPrimeiroPagamento(body.politica_primeiro_pagamento);
  if (body.politica_primeiro_pagamento && !politicaPrimeiroPagamento) {
    return badRequest("politica_primeiro_pagamento invalida.");
  }
  const politicaModo = politicaPrimeiroPagamento?.modo ?? "PADRAO";

  const usarExecucoes = modoManual && execucoesIn.length > 0;
  if (usarExecucoes) {
    const temBolsa = execucoesIn.some((execucao) => execucao.liquidacao_tipo === "BOLSA");
    const temFamilia = execucoesIn.some((execucao) => execucao.liquidacao_tipo === "FAMILIA");
    if (temBolsa && !temFamilia) {
      metodoLiquidacao = "CREDITO_BOLSA";
    } else {
      metodoLiquidacao = "CARTAO_CONEXAO";
    }
  }
  const itensIn = usarExecucoes ? [] : itensParsed ?? [];
  const hasItens = !usarExecucoes && Object.prototype.hasOwnProperty.call(body as Record<string, unknown>, "itens");
  if (hasItens && itensIn.length === 0) {
    return badRequest("itens_obrigatorios.");
  }

  const itensResolved: MatriculaItem[] = [];
  for (const it of itensIn) {
    const servicoId = Number(it.servico_id);
    const ueId = Number(it.unidade_execucao_id);
    const turmaIdDirect = it.turma_id ?? null;

    if (!Number.isFinite(servicoId) || !Number.isFinite(ueId)) continue;

    if (typeof turmaIdDirect === "number" && Number.isFinite(turmaIdDirect)) {
      itensResolved.push({ servico_id: servicoId, unidade_execucao_id: ueId, turma_id: turmaIdDirect });
      continue;
    }

    const { data: ue, error: ueErr } = await supabase
      .from("escola_unidades_execucao")
      .select("origem_tipo, origem_id")
      .eq("unidade_execucao_id", ueId)
      .maybeSingle();

    if (ueErr || !ue || ue.origem_tipo !== "TURMA" || !ue.origem_id) {
      return jsonError("RESOLVER_TURMA_FAIL", "Nao foi possivel resolver turma.", 500, { ue_id: ueId, ueErr });
    }

    itensResolved.push({ servico_id: servicoId, unidade_execucao_id: ueId, turma_id: Number(ue.origem_id) });
  }

  if (itensIn.length > 0 && itensResolved.length === 0) {
    return NextResponse.json({ ok: false, error: "itens_invalidos" }, { status: 400 });
  }

  const itens = itensIn.length > 0 ? itensResolved : [];

  let vinculoId = Number(body.vinculo_id);
  const vinculosIdsParsed = normalizeIdArray(body.vinculos_ids);
  if (vinculosIdsParsed === null) {
    return badRequest("vinculos_ids invalidos.");
  }
  let vinculosIds = vinculosIdsParsed ?? [];

  if (usarExecucoes) {
    const vinculoBody = Number(body.vinculo_id);
    if (Number.isFinite(vinculoBody) && vinculoBody > 0) {
      vinculoId = vinculoBody;
    } else {
      vinculoId = execucoesIn[0]?.turma_id ?? vinculoId;
    }

    if (vinculosIds.length === 0) {
      vinculosIds = Array.from(new Set(execucoesIn.map((execucao) => execucao.turma_id)));
    }
    if (Number.isFinite(vinculoId) && vinculoId > 0 && !vinculosIds.includes(vinculoId)) {
      vinculosIds.unshift(vinculoId);
    }
  } else if (itens.length > 0) {
    const principal = itens[0];
    vinculoId = principal.turma_id;
    vinculosIds = Array.from(new Set(itens.map((item) => item.turma_id)));
  } else {
    if (!Number.isFinite(vinculoId) || vinculoId <= 0) {
      vinculoId = vinculosIds[0] ?? NaN;
    }

    if (vinculosIds.length === 0 && Number.isFinite(vinculoId) && vinculoId > 0) {
      vinculosIds = [vinculoId];
    } else if (vinculosIds.length > 0 && Number.isFinite(vinculoId) && !vinculosIds.includes(vinculoId)) {
      vinculosIds.unshift(vinculoId);
    }
  }

  const execucaoByTurma = new Map<number, ExecucaoManual>();
  if (usarExecucoes) {
    for (const execucao of execucoesIn) {
      if (execucaoByTurma.has(execucao.turma_id)) {
        return badRequest("execucao_turma_duplicada.", { turma_id: execucao.turma_id });
      }
      execucaoByTurma.set(execucao.turma_id, execucao);
    }
  }

  const nivelIdRaw = usarExecucoes ? null : body.nivel_id ?? null;
  const nivelId = nivelIdRaw === null ? null : Number(nivelIdRaw);
  if (!usarExecucoes && nivelIdRaw !== null && (!Number.isInteger(nivelId) || nivelId <= 0)) {
    return badRequest("nivel_id invalido.");
  }

  if (!pessoaId || !respFinId || !tipoMatricula || !Number.isFinite(vinculoId) || vinculoId <= 0) {
    return badRequest(
      "Campos obrigatorios ausentes: pessoa_id, responsavel_financeiro_id, tipo_matricula, vinculo_id (ou itens/vinculos_ids).",
    );
  }

  const anoRef = body.ano_referencia ?? null;

  const dataMatricula = parseDateOrNull(body.data_matricula) ?? null;
  const dataInicioVinculo = parseDateOrNull(body.data_inicio_vinculo) ?? dataMatricula ?? null;

  const escolaTabelaPrecoCursoId = body.escola_tabela_preco_curso_id ?? null;
  const planoPagamentoId = body.plano_pagamento_id ?? null;

  const formaLiquidacaoPadrao = body.forma_liquidacao_padrao ?? null;
  const documentoModeloId = body.documento_modelo_id ?? body.contrato_modelo_id ?? null;

  if (tipoMatricula === "REGULAR" && (anoRef === null || typeof anoRef !== "number")) {
    return badRequest("ano_referencia e obrigatorio para tipo_matricula = REGULAR.");
  }

  const { data: pessoa, error: pessoaErr } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", pessoaId)
    .maybeSingle();

  if (pessoaErr) return serverError("VALIDAR_PESSOA_FAIL", "Falha ao validar pessoa.", { pessoaErr });
  if (!pessoa) return badRequest("pessoa_id nao encontrado.");

  const { data: respFin, error: respErr } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", respFinId)
    .maybeSingle();

  if (respErr) return serverError("VALIDAR_RESPONSAVEL_FAIL", "Falha ao validar responsavel financeiro.", { respErr });
  if (!respFin) return badRequest("responsavel_financeiro_id nao encontrado.");

  try {
    const matriculaAtivaExistente = await buscarMatriculaAtivaExistentePorPessoa(
      admin as unknown as { from: (table: string) => any },
      pessoaId,
    );

    if (matriculaAtivaExistente) {
      return NextResponse.json(buildMatriculaAtivaExistentePayload(matriculaAtivaExistente), {
        status: 409,
      });
    }
  } catch (matriculaAtivaExistenteError) {
    return serverError(
      "VALIDAR_MATRICULA_ATIVA_EXISTENTE_FAIL",
      "Falha ao validar matricula ativa existente.",
      {
        matriculaAtivaExistenteError:
          matriculaAtivaExistenteError instanceof Error
            ? matriculaAtivaExistenteError.message
            : String(matriculaAtivaExistenteError),
      },
    );
  }

  if (!body.ignorar_matricula_cancelada) {
    try {
      const matriculasCanceladas = await buscarMatriculasCanceladasPorPessoa(
        admin as unknown as { from: (table: string) => any },
        pessoaId,
      );

      if (matriculasCanceladas.possui_matricula_cancelada) {
        return NextResponse.json(buildMatriculaCanceladaExistentePayload(matriculasCanceladas), {
          status: 409,
        });
      }
    } catch (matriculasCanceladasError) {
      return serverError(
        "VALIDAR_MATRICULA_CANCELADA_EXISTENTE_FAIL",
        "Falha ao validar matricula cancelada existente.",
        {
          matriculasCanceladasError:
            matriculasCanceladasError instanceof Error
              ? matriculasCanceladasError.message
              : String(matriculasCanceladasError),
        },
      );
    }
  }

  const { data: turmas, error: turmaErr } = await supabase
    .from("turmas")
    .select("turma_id,produto_id,nome")
    .in("turma_id", vinculosIds);

  if (turmaErr) return serverError("VALIDAR_TURMA_FAIL", "Falha ao validar turma (vinculo_id).", { turmaErr });

  const foundIds = new Set((turmas ?? []).map((t) => Number((t as { turma_id?: number }).turma_id)));
  const missingIds = vinculosIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    return badRequest("vinculo_id (turma) nao encontrado.", { missing_ids: missingIds });
  }

  const turmasById = new Map<number, TurmaResumo>();
  (turmas ?? []).forEach((row) => {
    const turmaId = Number((row as { turma_id?: number }).turma_id);
    if (!Number.isInteger(turmaId) || turmaId <= 0) return;
    turmasById.set(turmaId, {
      turma_id: turmaId,
      produto_id: parsePositiveIntOrNull((row as { produto_id?: unknown }).produto_id),
      nome: typeof (row as { nome?: unknown }).nome === "string" ? String((row as { nome?: unknown }).nome) : null,
    });
  });

  let execucoesValidas: ExecucaoManual[] = execucoesIn;

  if (usarExecucoes) {
    const { data: turmaNiveis, error: turmaNiveisError } = await supabase
      .from("turma_niveis")
      .select("turma_id, nivel_id")
      .in("turma_id", vinculosIds);

    if (turmaNiveisError) {
      return serverError("VALIDAR_NIVEIS_TURMAS_FAIL", "Falha ao validar niveis das turmas.", {
        turmaNiveisError,
        turma_ids: vinculosIds,
      });
    }

    const niveisPorTurma = new Map<number, Set<number>>();
    const nivelIds = new Set<number>();
    (turmaNiveis ?? []).forEach((row) => {
      const turmaId = Number((row as { turma_id?: number }).turma_id);
      const nivelId = Number((row as { nivel_id?: number }).nivel_id);
      if (!Number.isFinite(turmaId) || !Number.isFinite(nivelId)) return;
      if (!niveisPorTurma.has(turmaId)) niveisPorTurma.set(turmaId, new Set());
      niveisPorTurma.get(turmaId)!.add(nivelId);
    });

    execucoesValidas = [];
    for (const execucao of execucoesIn) {
      const niveisTurma = niveisPorTurma.get(execucao.turma_id) ?? new Set<number>();
      if (niveisTurma.size > 0) {
        if (!execucao.nivel_id) {
          return badRequest("nivel_id_obrigatorio.", { turma_id: execucao.turma_id });
        }
        if (!niveisTurma.has(execucao.nivel_id)) {
          return badRequest("nivel_id_nao_pertence_a_turma.", { turma_id: execucao.turma_id });
        }
        nivelIds.add(execucao.nivel_id);
      }
    }

    const niveisById = new Map<number, string>();
    if (nivelIds.size > 0) {
      const { data: niveisData, error: niveisErr } = await supabase
        .from("niveis")
        .select("id, nome")
        .in("id", Array.from(nivelIds));

      if (niveisErr) {
        return serverError("VALIDAR_NIVEIS_FAIL", "Falha ao validar niveis.", { niveisErr });
      }

      (niveisData ?? []).forEach((nivelRow) => {
        const id = Number((nivelRow as { id?: number }).id);
        const nome = (nivelRow as { nome?: string }).nome;
        if (Number.isFinite(id) && typeof nome === "string") {
          niveisById.set(id, nome);
        }
      });
    }

    execucoesValidas = [];
    for (const execucao of execucoesIn) {
      const nivelNome = execucao.nivel_id ? niveisById.get(execucao.nivel_id) ?? execucao.nivel : execucao.nivel;
      const nivelFinal = (nivelNome ?? "").trim();
      if (!nivelFinal) {
        return badRequest("nivel_obrigatorio.", { turma_id: execucao.turma_id });
      }
      execucoesValidas.push({ ...execucao, nivel: nivelFinal });
    }
  } else {
    const { data: turmaNiveis, error: turmaNiveisError } = await supabase
      .from("turma_niveis")
      .select("nivel_id")
      .eq("turma_id", vinculoId);

    if (turmaNiveisError) {
      return serverError("VALIDAR_NIVEIS_TURMA_FAIL", "Falha ao validar niveis da turma.", {
        turmaNiveisError,
        turma_id: vinculoId,
      });
    }

    const turmaPossuiNiveis = (turmaNiveis?.length ?? 0) > 0;
    if (turmaPossuiNiveis) {
      if (!nivelId) return badRequest("nivel_id_obrigatorio.");
      const nivelOk = (turmaNiveis ?? []).some((row) => Number(row.nivel_id) === nivelId);
      if (!nivelOk) return badRequest("nivel_id_nao_pertence_a_turma.");
    }
  }

  if (!usarExecucoes && anoRef !== null) {
    const resolveUrl = new URL("/api/matriculas/precos/resolver", request.url);
    resolveUrl.searchParams.set("aluno_id", String(pessoaId));
    resolveUrl.searchParams.set("alvo_tipo", "TURMA");
    resolveUrl.searchParams.set("alvo_id", String(vinculoId));
    resolveUrl.searchParams.set("ano", String(anoRef));

    const resolveRes = await fetch(resolveUrl.toString(), {
      headers: { cookie: cookieHeader },
    });

    let resolvePayload: { ok?: boolean; message?: string; details?: Record<string, unknown> } | null = null;
    try {
      resolvePayload = (await resolveRes.json()) as {
        ok?: boolean;
        message?: string;
        details?: Record<string, unknown>;
      };
    } catch {
      resolvePayload = null;
    }

    if (!resolveRes.ok || !resolvePayload?.ok) {
      const status = resolveRes.status === 409 ? 409 : resolveRes.status === 400 ? 400 : 500;
      const errorCode = status === 409 ? "conflict" : status === 400 ? "bad_request" : "server_error";
      return NextResponse.json(
        {
          ok: false,
          error: errorCode,
          message: resolvePayload?.message || "Falha ao validar precificacao.",
          details: resolvePayload?.details ?? null,
        },
        { status },
      );
    }
  }

  if (!usarExecucoes && escolaTabelaPrecoCursoId !== null) {
    const { data: tabelaPreco, error: tabErr } = await supabase
      .from("escola_tabelas_precos_cursos")
      .select("id, ativo")
      .eq("id", escolaTabelaPrecoCursoId)
      .maybeSingle();

    if (tabErr) {
      return serverError("VALIDAR_TABELA_PRECO_FAIL", "Falha ao validar escola_tabela_preco_curso_id.", { tabErr });
    }
    if (!tabelaPreco) return badRequest("escola_tabela_preco_curso_id nao encontrado.");
    if (!tabelaPreco.ativo) return badRequest("Tabela de precos informada esta inativa.");
  }

  let plano: PlanoPagamentoMvp | null = null;

  if (planoPagamentoId !== null) {
    const { data: planoDb, error: planoErr } = await supabase
      .from("matricula_planos_pagamento")
      .select(
        [
          "id",
          "ativo",
          "ciclo_cobranca",
          "numero_parcelas",
          "termino_cobranca",
          "data_fim_manual",
          "regra_total_devido",
          "permite_prorrata",
          "ciclo_financeiro",
          "forma_liquidacao_padrao",
        ].join(","),
      )
      .eq("id", planoPagamentoId)
      .maybeSingle();

    if (planoErr) {
      return serverError("VALIDAR_PLANO_PAGAMENTO_FAIL", "Falha ao validar plano_pagamento_id.", { planoErr });
    }
    if (!planoDb) return badRequest("plano_pagamento_id nao encontrado.");

    plano = planoDb as unknown as PlanoPagamentoMvp;

    if (!plano.ativo) return badRequest("Plano de pagamento informado esta inativo.");

    if (!plano.ciclo_cobranca) {
      return badRequest("Plano de pagamento invalido: ciclo_cobranca ausente.");
    }

    if (plano.ciclo_cobranca === "COBRANCA_EM_PARCELAS") {
      if (!plano.numero_parcelas || plano.numero_parcelas <= 0) {
        return badRequest("Plano invalido: COBRANCA_EM_PARCELAS exige numero_parcelas.");
      }
    }

    if (plano.ciclo_cobranca === "COBRANCA_MENSAL") {
      if (!plano.termino_cobranca) {
        return badRequest("Plano invalido: COBRANCA_MENSAL exige termino_cobranca.");
      }
      if (plano.termino_cobranca === "DATA_ESPECIFICA" && !plano.data_fim_manual) {
        return badRequest("Plano invalido: DATA_ESPECIFICA exige data_fim_manual.");
      }
      if (plano.termino_cobranca === "FIM_ANO_LETIVO") {
        const anoBase = anoRef ?? (dataInicioVinculo ? Number(String(dataInicioVinculo).slice(0, 4)) : null);
        if (!anoBase || Number.isNaN(anoBase)) {
          return badRequest("Plano com termino FIM_ANO_LETIVO exige ano_referencia (ou data_inicio_vinculo valida).");
        }
      }
    }
  }

  if (tipoMatricula === "REGULAR") {
    const { data: dup, error: dupErr } = await supabase
      .from("matriculas")
      .select("id")
      .eq("pessoa_id", pessoaId)
      .eq("vinculo_id", vinculoId)
      .eq("tipo_matricula", "REGULAR")
      .eq("ano_referencia", anoRef)
      .in("status", ["ATIVA", "TRANCADA"])
      .limit(1);

    if (dupErr) {
      return serverError("CHECAR_DUPLICIDADE_FAIL", "Falha ao checar duplicidade de matricula.", { dupErr });
    }
    if (dup && dup.length > 0) {
      return conflict("Matricula REGULAR duplicada para a mesma pessoa/turma/ano.", { matricula_id: dup[0]?.id });
    }
  }

  let totalMensalidadeCentavos = Number(body.total_mensalidade_centavos ?? 0);
  if (!Number.isFinite(totalMensalidadeCentavos)) totalMensalidadeCentavos = 0;
  if (usarExecucoes) {
    totalMensalidadeCentavos = Math.trunc(totalMensalidadeManual);
  }
  let totalMensalidadeFamiliaCentavos = totalMensalidadeCentavos;

  const execucoesBolsa = usarExecucoes
    ? execucoesValidas.filter((execucao) => execucao.liquidacao_tipo === "BOLSA")
    : [];
  for (const execucao of execucoesBolsa) {
    if (!execucao.bolsa?.projeto_social_id || !execucao.bolsa?.bolsa_tipo_id) {
      return badRequest("execucao_bolsa_invalida.", { turma_id: execucao.turma_id });
    }
  }

  let resumoCusteio: ResumoCusteio = {
    familia_centavos: 0,
    projeto_social_centavos: 0,
  };
  const execucoesParaPersistir: ExecucaoPersistencia[] = [];

  if (usarExecucoes) {
    const bolsaTipoIds = Array.from(
      new Set(
        execucoesBolsa
          .map((execucao) => execucao.bolsa?.bolsa_tipo_id ?? null)
          .filter((id): id is number => Number.isInteger(id) && id > 0),
      ),
    );
    const bolsaTiposMap = new Map<
      number,
      {
        projeto_social_id: number;
        modo: BolsaTipoModo;
        percentual_desconto: number | null;
        valor_final_familia_centavos: number | null;
      }
    >();

    if (bolsaTipoIds.length > 0) {
      const { data: bolsaTiposData, error: bolsaTiposErr } = await supabase
        .from("bolsa_tipos")
        .select("id,projeto_social_id,modo,percentual_desconto,valor_final_familia_centavos")
        .in("id", bolsaTipoIds);

      if (bolsaTiposErr) {
        return serverError("VALIDAR_BOLSA_TIPOS_FAIL", "Falha ao validar tipos de bolsa.", { bolsaTiposErr });
      }

      for (const row of bolsaTiposData ?? []) {
        const record = row as Record<string, unknown>;
        const id = Number(record.id);
        const projetoSocialId = Number(record.projeto_social_id);
        const modoRaw = record.modo;
        if (!Number.isInteger(id) || id <= 0) continue;
        if (!Number.isInteger(projetoSocialId) || projetoSocialId <= 0) continue;
        if (!isBolsaTipoModo(modoRaw)) continue;
        const percentualRaw = record.percentual_desconto;
        const valorFinalRaw = record.valor_final_familia_centavos;
        bolsaTiposMap.set(id, {
          projeto_social_id: projetoSocialId,
          modo: modoRaw,
          percentual_desconto:
            typeof percentualRaw === "number" && Number.isFinite(percentualRaw) ? percentualRaw : null,
          valor_final_familia_centavos:
            typeof valorFinalRaw === "number" && Number.isFinite(valorFinalRaw)
              ? Math.max(0, Math.trunc(valorFinalRaw))
              : null,
        });
      }
    }

    for (const execucao of execucoesValidas) {
      if (execucao.liquidacao_tipo === "FAMILIA") {
        resumoCusteio.familia_centavos += execucao.valor_mensal_centavos;
        execucoesParaPersistir.push({
          turma_id: execucao.turma_id,
          nivel: execucao.nivel,
          valor_mensal_centavos: execucao.valor_mensal_centavos,
          liquidacao_tipo: "FAMILIA",
          origem_valor: "MANUAL|FAMILIA",
        });
        continue;
      }

      const projetoSocialId = execucao.bolsa?.projeto_social_id;
      const bolsaTipoId = execucao.bolsa?.bolsa_tipo_id;
      if (!projetoSocialId || !bolsaTipoId) {
        return badRequest("execucao_bolsa_invalida.", { turma_id: execucao.turma_id });
      }
      const bolsaTipo = bolsaTiposMap.get(bolsaTipoId);
      if (!bolsaTipo) {
        return badRequest("bolsa_tipo_nao_encontrado.", { turma_id: execucao.turma_id, bolsa_tipo_id: bolsaTipoId });
      }
      if (bolsaTipo.projeto_social_id !== projetoSocialId) {
        return badRequest("bolsa_tipo_nao_pertence_ao_projeto.", {
          turma_id: execucao.turma_id,
          projeto_social_id: projetoSocialId,
          bolsa_tipo_id: bolsaTipoId,
        });
      }

      const valorFamiliaCalculado = calcularValorFamiliaCentavos({
        modo: bolsaTipo.modo,
        valorContratadoCentavos: execucao.valor_mensal_centavos,
        percentualDesconto: bolsaTipo.percentual_desconto,
        valorFinalFamiliaCentavos: bolsaTipo.valor_final_familia_centavos,
      });
      const valorFamilia = Math.max(0, Math.min(execucao.valor_mensal_centavos, Math.trunc(valorFamiliaCalculado)));
      const valorProjetoSocial = Math.max(0, execucao.valor_mensal_centavos - valorFamilia);

      resumoCusteio.familia_centavos += valorFamilia;
      resumoCusteio.projeto_social_centavos += valorProjetoSocial;

      if (valorFamilia > 0) {
        execucoesParaPersistir.push({
          turma_id: execucao.turma_id,
          nivel: execucao.nivel,
          valor_mensal_centavos: valorFamilia,
          liquidacao_tipo: "FAMILIA",
          origem_valor: "MANUAL|FAMILIA",
        });
      }

      if (valorProjetoSocial > 0) {
        execucoesParaPersistir.push({
          turma_id: execucao.turma_id,
          nivel: execucao.nivel,
          valor_mensal_centavos: valorProjetoSocial,
          liquidacao_tipo: "BOLSA",
          origem_valor: buildOrigemValorExecucao(execucao),
        });
      }
    }

    totalMensalidadeCentavos = resumoCusteio.familia_centavos + resumoCusteio.projeto_social_centavos;
    totalMensalidadeFamiliaCentavos = resumoCusteio.familia_centavos;
  } else {
    const totalNormalizado = Math.max(0, Math.trunc(totalMensalidadeCentavos));
    resumoCusteio =
      metodoLiquidacao === "CREDITO_BOLSA"
        ? { familia_centavos: 0, projeto_social_centavos: totalNormalizado }
        : { familia_centavos: totalNormalizado, projeto_social_centavos: 0 };
    totalMensalidadeFamiliaCentavos = resumoCusteio.familia_centavos;
  }

  const resolverValorItemPorTurma = async (turmaId: number, fallback: number): Promise<number> => {
    if (!anoRef) return Math.max(0, Math.trunc(fallback));

    const resolveUrl = new URL("/api/matriculas/precos/resolver", request.url);
    resolveUrl.searchParams.set("aluno_id", String(pessoaId));
    resolveUrl.searchParams.set("alvo_tipo", "TURMA");
    resolveUrl.searchParams.set("alvo_id", String(turmaId));
    resolveUrl.searchParams.set("ano", String(anoRef));

    const resolveRes = await fetch(resolveUrl.toString(), {
      headers: { cookie: cookieHeader },
    });

    const payload = (await resolveRes.json().catch(() => null)) as
      | {
          ok?: boolean;
          message?: string;
          data?: {
            valor_final_centavos?: number | null;
            item_aplicado?: { valor_centavos?: number | null } | null;
          } | null;
        }
      | null;

    if (!resolveRes.ok || !payload?.ok) {
      throw new Error(payload?.message || `falha_resolver_preco_item_turma_${turmaId}`);
    }

    const valorDireto = Number(payload.data?.valor_final_centavos ?? NaN);
    if (Number.isFinite(valorDireto)) return Math.max(0, Math.trunc(valorDireto));

    const valorAplicado = Number(payload.data?.item_aplicado?.valor_centavos ?? NaN);
    if (Number.isFinite(valorAplicado)) return Math.max(0, Math.trunc(valorAplicado));

    return Math.max(0, Math.trunc(fallback));
  };

  let matriculaItemDrafts: MatriculaItemDraft[] = [];
  try {
    if (usarExecucoes && execucoesValidas.length > 0) {
      matriculaItemDrafts = execucoesValidas.map((execucao) => {
        const turma = turmasById.get(execucao.turma_id) ?? null;
        const descricaoBase =
          execucao.nivel?.trim() ? `Modulo ${execucao.nivel.trim()}` : "Modulo da matricula";
        return {
          turma_id: execucao.turma_id,
          modulo_id: turma?.produto_id ?? null,
          descricao: buildDescricaoMatriculaItem({
            turmaNome: turma?.nome ?? null,
            turmaId: execucao.turma_id,
            moduloId: turma?.produto_id ?? null,
            prefixo: descricaoBase,
          }),
          origem_tipo: "CURSO",
          valor_base_centavos: Math.max(0, Math.trunc(execucao.valor_mensal_centavos)),
          valor_liquido_centavos: Math.max(0, Math.trunc(execucao.valor_mensal_centavos)),
          data_inicio: dataInicioVinculo,
          observacoes: body.observacoes ?? null,
        };
      });
    } else if (itens.length > 0) {
      const totalItensBase = Math.max(
        0,
        Math.trunc(totalMensalidadeFamiliaCentavos > 0 ? totalMensalidadeFamiliaCentavos : totalMensalidadeCentavos),
      );
      const valorRateadoBase = itens.length > 0 ? Math.floor(totalItensBase / itens.length) : 0;
      const restoRateio = itens.length > 0 ? totalItensBase - valorRateadoBase * itens.length : 0;

      const drafts: MatriculaItemDraft[] = [];
      for (let index = 0; index < itens.length; index += 1) {
        const item = itens[index];
        const turma = turmasById.get(item.turma_id) ?? null;
        const fallback = valorRateadoBase + (index === itens.length - 1 ? restoRateio : 0);
        const valorResolvido = await resolverValorItemPorTurma(item.turma_id, fallback);
        drafts.push({
          turma_id: item.turma_id,
          modulo_id: item.servico_id,
          descricao: buildDescricaoMatriculaItem({
            turmaNome: turma?.nome ?? null,
            turmaId: item.turma_id,
            moduloId: item.servico_id,
            prefixo: "Modulo",
          }),
          origem_tipo: "CURSO",
          valor_base_centavos: valorResolvido,
          valor_liquido_centavos: valorResolvido,
          data_inicio: dataInicioVinculo,
          observacoes: body.observacoes ?? null,
        });
      }
      matriculaItemDrafts = drafts;
    } else {
      const turma = turmasById.get(vinculoId) ?? null;
      const valorLegado = Math.max(
        0,
        Math.trunc(totalMensalidadeFamiliaCentavos > 0 ? totalMensalidadeFamiliaCentavos : totalMensalidadeCentavos),
      );
      matriculaItemDrafts = [
        {
          turma_id: Number.isFinite(vinculoId) && vinculoId > 0 ? vinculoId : null,
          modulo_id: turma?.produto_id ?? null,
          descricao: buildDescricaoMatriculaItem({
            turmaNome: turma?.nome ?? null,
            turmaId: Number.isFinite(vinculoId) ? vinculoId : null,
            moduloId: turma?.produto_id ?? null,
            prefixo: "Modulo principal",
          }),
          origem_tipo: "CURSO",
          valor_base_centavos: valorLegado,
          valor_liquido_centavos: valorLegado,
          data_inicio: dataInicioVinculo,
          observacoes: body.observacoes ?? null,
        },
      ];
    }
  } catch (itemDraftError) {
    return serverError("RESOLVER_ITENS_MATRICULA_FAIL", "Falha ao preparar itens da matricula.", {
      itemDraftError:
        itemDraftError instanceof Error ? itemDraftError.message : String(itemDraftError),
    });
  }

  let primeiraCobranca: PrimeiraCobrancaCalc | null = null;
  let primeiraCobrancaStatus: string | null = null;
  let excecaoPrimeiroPagamento = false;
  let motivoExcecaoPrimeiroPagamento: string | null = null;
  let excecaoAutorizadaPor: string | null = null;
  let excecaoCriadaEm: string | null = null;

  // M6/M7: carregar config financeira para pró-rata e limite de exercício
  let diaCorteProrata: number | null = null;
  let dataLimiteExercicio: string | null = null;
  {
    const { data: cfgFin } = await admin
      .from("escola_config_financeira")
      .select("dia_corte_prorata,data_limite_exercicio")
      .limit(1)
      .maybeSingle();
    if (cfgFin) {
      diaCorteProrata = typeof (cfgFin as any).dia_corte_prorata === "number" ? (cfgFin as any).dia_corte_prorata : null;
      dataLimiteExercicio = (cfgFin as any).data_limite_exercicio ?? null;
    }
  }

  if (usarExecucoes) {
    primeiraCobranca = calcularPrimeiraCobranca({
      totalCentavos: totalMensalidadeFamiliaCentavos,
      dataInicio: dataInicioVinculo,
      dataMatricula: dataMatricula,
      dia_corte_prorata: diaCorteProrata,
      data_limite_exercicio: dataLimiteExercicio,
    });

    if (primeiraCobranca.tipo === "ENTRADA_PRORATA" && politicaModo === "ADIAR_PARA_VENCIMENTO") {
      const motivo = politicaPrimeiroPagamento?.motivo_excecao?.trim() ?? "";
      if (!motivo) {
        return badRequest("motivo_excecao_obrigatorio.");
      }
      excecaoPrimeiroPagamento = true;
      motivoExcecaoPrimeiroPagamento = motivo;
      excecaoAutorizadaPor = userId;
      excecaoCriadaEm = new Date().toISOString();
      primeiraCobrancaStatus = "ADIADA_EXCECAO";
    } else {
      primeiraCobrancaStatus = "PENDENTE";
    }
  }

  // A3: Verificar se existe taxa de matrícula na tabela de preços
  let temTaxaMatricula = false;
  let valorTaxaMatriculaCentavos: number | null = null;
  {
    const taxaAtiva = (await admin
      .from("escola_config_financeira")
      .select("taxa_matricula_ativa")
      .limit(1)
      .maybeSingle()).data;

    if ((taxaAtiva as any)?.taxa_matricula_ativa && escolaTabelaPrecoCursoId) {
      const { data: itemTaxa } = await admin
        .from("matricula_tabela_itens")
        .select("id,valor_centavos")
        .eq("tabela_id", escolaTabelaPrecoCursoId)
        .eq("ativo", true)
        .eq("codigo_item", "TAXA_MATRICULA")
        .limit(1)
        .maybeSingle();

      if (itemTaxa && typeof (itemTaxa as any).valor_centavos === "number" && (itemTaxa as any).valor_centavos > 0) {
        temTaxaMatricula = true;
        valorTaxaMatriculaCentavos = (itemTaxa as any).valor_centavos;
      }
    }
  }

  const insertPayload: Record<string, unknown> = {
    pessoa_id: pessoaId,
    responsavel_financeiro_id: respFinId,
    tipo_matricula: tipoMatricula,
    metodo_liquidacao: metodoLiquidacao,
    vinculo_id: vinculoId,
    ano_referencia: anoRef,
    data_matricula: dataMatricula,
    data_inicio_vinculo: dataInicioVinculo,
    escola_tabela_preco_curso_id: escolaTabelaPrecoCursoId,
    plano_pagamento_id: planoPagamentoId,
    forma_liquidacao_padrao: formaLiquidacaoPadrao ?? plano?.forma_liquidacao_padrao ?? null,
    documento_modelo_id: documentoModeloId,
    observacoes: body.observacoes ?? null,
    total_mensalidade_centavos: totalMensalidadeCentavos,
    status: "TRANCADA",
    created_by: userId,
    updated_by: userId,
    primeira_cobranca_tipo: primeiraCobranca?.tipo ?? undefined,
    primeira_cobranca_status: primeiraCobrancaStatus ?? undefined,
    primeira_cobranca_valor_centavos: primeiraCobranca?.valor_centavos ?? undefined,
    excecao_primeiro_pagamento: excecaoPrimeiroPagamento || undefined,
    motivo_excecao_primeiro_pagamento: motivoExcecaoPrimeiroPagamento ?? undefined,
    excecao_autorizada_por: excecaoAutorizadaPor ?? undefined,
    excecao_criada_em: excecaoCriadaEm ?? undefined,
    tem_taxa_matricula: temTaxaMatricula || undefined,
    valor_taxa_matricula_centavos: valorTaxaMatriculaCentavos ?? undefined,
  };

  for (const k of Object.keys(insertPayload)) {
    if (insertPayload[k] === undefined) delete insertPayload[k];
  }

  const insertSelect =
    "id, pessoa_id, responsavel_financeiro_id, tipo_matricula, metodo_liquidacao, vinculo_id, ano_referencia, data_matricula, data_inicio_vinculo, escola_tabela_preco_curso_id, plano_pagamento_id, forma_liquidacao_padrao, documento_modelo_id, status";

  const { data: matriculaCriadaInicial, error: insErr } = await supabase
    .from("matriculas")
    .insert(insertPayload)
    .select(insertSelect)
    .single();

  if (insErr) return serverError("CRIAR_MATRICULA_FAIL", "Falha ao criar matricula.", { insErr });

  let matriculaCriada = matriculaCriadaInicial;
  const matriculaId = (matriculaCriada as { id: number }).id;
  const bolsasAplicadas: Array<{
    turma_id: number;
    projeto_social_beneficiario_id: number;
    bolsa_concessao_id: number;
    projeto_social_id: number;
    bolsa_tipo_id: number;
  }> = [];
  const rollbackAndServerError = async (errorCode: string, message: string, details?: Record<string, unknown>) => {
    const rollback = await rollbackCompensatorioMatricula({
      supabase: admin,
      matriculaId,
      bolsaConcessaoIds: bolsasAplicadas.map((item) => item.bolsa_concessao_id),
    });
    return serverError(errorCode, message, {
      ...(details ?? {}),
      rollback_ok: rollback.ok,
      rollback_errors: rollback.errors,
      matricula_id: matriculaId,
    });
  };
  let itensCriados: Awaited<ReturnType<typeof insertMatriculaItens>> = [];
  let vinculosTurmaAluno: TurmaAlunoVinculoResumo[] = [];

  if (usarExecucoes && execucoesValidas.length > 0) {
    let hasModeloLiquidacaoColumn = false;
    const { data: execCols, error: execColsErr } = await admin
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_schema", "public")
      .eq("table_name", "matricula_execucao_valores")
      .in("column_name", ["modelo_liquidacao"]);

    if (!execColsErr) {
      hasModeloLiquidacaoColumn = (execCols ?? []).some((row) => (row as { column_name?: string }).column_name === "modelo_liquidacao");
    }

    const rowsBase = execucoesParaPersistir.map((execucao) => ({
      matricula_id: matriculaId,
      turma_id: execucao.turma_id,
      nivel: execucao.nivel,
      valor_mensal_centavos: execucao.valor_mensal_centavos,
      origem_valor: execucao.origem_valor,
      ativo: true,
    }));

    const rows = rowsBase.map((row, idx) => {
      const execucao = execucoesParaPersistir[idx];
      const enriched: Record<string, unknown> = { ...row };
      if (hasModeloLiquidacaoColumn) enriched.modelo_liquidacao = execucao.liquidacao_tipo;
      return enriched;
    });

    let { error: execErr } = await admin.from("matricula_execucao_valores").insert(rows);
    if (execErr && isSchemaMissingError(execErr) && hasModeloLiquidacaoColumn) {
      const retry = await admin.from("matricula_execucao_valores").insert(rowsBase);
      execErr = retry.error;
    }
    if (execErr) {
      const msg = execErr.message ?? "";
      if (msg.includes("relation") && msg.includes("matricula_execucao_valores")) {
        return await rollbackAndServerError("TABELA_AUXILIAR_NAO_EXISTE", "Falha ao salvar execucoes da matricula.", {
          hint: "Aplique a migration SQL da tabela matricula_execucao_valores no Supabase.",
          execErr,
        });
      }
      return await rollbackAndServerError("MANUAL_INSERT_EXECUCOES_FAIL", "Falha ao salvar valores manuais.", { execErr });
    }
  }

  try {
    const itensPayload: MatriculaItemInsert[] = matriculaItemDrafts.map((item) => ({
      matricula_id: matriculaId,
      curso_id: null,
      modulo_id: item.modulo_id,
      turma_id_inicial: item.turma_id,
      descricao: item.descricao,
      origem_tipo: item.origem_tipo,
      valor_base_centavos: item.valor_base_centavos,
      valor_liquido_centavos: item.valor_liquido_centavos,
      status: "ATIVO",
      data_inicio: item.data_inicio,
      observacoes: item.observacoes,
    }));

    itensCriados = await insertMatriculaItens(
      admin as unknown as { from: (table: string) => any },
      itensPayload,
    );

    if (itensCriados.length === 0) {
      return await rollbackAndServerError(
        "CRIAR_MATRICULA_ITENS_FAIL",
        "Nenhum item da matricula foi criado.",
      );
    }

    vinculosTurmaAluno = await vincularTurmaAlunoPorItens({
      supabase: admin as unknown as { from: (table: string) => any },
      matriculaId,
      alunoPessoaId: pessoaId,
      dataInicio: dataInicioVinculo,
      itens: itensCriados.map((item) => ({
        matricula_item_id: item.id,
        turma_id: item.turma_id_inicial,
      })),
    });
  } catch (matriculaItemError) {
    return await rollbackAndServerError(
      "CRIAR_MATRICULA_ITENS_FAIL",
      "Falha ao materializar itens da matricula.",
      {
        matriculaItemError:
          matriculaItemError instanceof Error ? matriculaItemError.message : String(matriculaItemError),
      },
    );
  }

  if (execucoesBolsa.length > 0) {
    const bolsaDataInicioDefault = parseDateYmdOrNull(dataMatricula) ?? new Date().toISOString().slice(0, 10);
    for (const execucao of execucoesBolsa) {
      const projetoSocialId = execucao.bolsa?.projeto_social_id;
      const bolsaTipoId = execucao.bolsa?.bolsa_tipo_id;
      if (!projetoSocialId || !bolsaTipoId) {
        return await rollbackAndServerError("EXECUCAO_BOLSA_INVALIDA", "Execucao de bolsa invalida.", {
          turma_id: execucao.turma_id,
        });
      }
      try {
        const aplicada = await aplicarBolsaNaMatricula({
          pessoa_id: pessoaId,
          projeto_social_id: projetoSocialId,
          bolsa_tipo_id: bolsaTipoId,
          matricula_id: matriculaId,
          turma_id: execucao.turma_id,
          data_inicio: bolsaDataInicioDefault,
          status: "ATIVA",
        });
        bolsasAplicadas.push({
          turma_id: execucao.turma_id,
          projeto_social_beneficiario_id: aplicada.projeto_social_beneficiario_id,
          bolsa_concessao_id: aplicada.bolsa_concessao_id,
          projeto_social_id: projetoSocialId,
          bolsa_tipo_id: bolsaTipoId,
        });
      } catch (bolsaErr) {
        return await rollbackAndServerError("APLICAR_BOLSA_NA_MATRICULA_FAIL", "Falha ao aplicar bolsa na matricula.", {
          bolsaErr,
          turma_id: execucao.turma_id,
          projeto_social_id: projetoSocialId,
          bolsa_tipo_id: bolsaTipoId,
        });
      }
    }
  }

  const modoLiquidacaoAutomatica = resumoCusteio.familia_centavos <= 0 ? "MOVIMENTO" : "LANCAR_NO_CARTAO";
  const tipoPrimeiraCobranca = primeiraCobranca?.tipo ?? "ENTRADA_PRORATA";
  const liquidacaoAto = await liquidarPrimeiraMatricula({
    baseUrl: new URL(request.url).origin,
    cookieHeader,
    matriculaId,
    matriculaItemIds: itensCriados.map((item) => item.id),
    tipoPrimeiraCobranca,
    modo: modoLiquidacaoAutomatica,
    observacoes: body.observacoes ?? null,
  });
  if (!liquidacaoAto.ok) {
    return await rollbackAndServerError("LIQUIDAR_PRIMEIRA_MATRICULA_FAIL", "Falha na liquidacao automatica do ato.", {
      liquidacao_error: liquidacaoAto.error,
      liquidacao_detail: liquidacaoAto.detail,
      liquidacao_payload: liquidacaoAto.payload ?? null,
    });
  }

  // A3: Gerar cobrança da taxa de matrícula se houver
  let taxaMatriculaCobrancaId: number | null = null;
  if (temTaxaMatricula && valorTaxaMatriculaCentavos && valorTaxaMatriculaCentavos > 0) {
    try {
      const { data: cobrancaTaxa, error: cobrancaTaxaErr } = await admin
        .from("cobrancas")
        .insert({
          pessoa_id: respFinId || pessoaId,
          valor_centavos: valorTaxaMatriculaCentavos,
          descricao: `Taxa de matrícula #${matriculaId}`,
          vencimento: new Date().toISOString().slice(0, 10),
          status: "PENDENTE",
          origem_tipo: "MATRICULA",
          origem_id: matriculaId,
          origem_subtipo: "TAXA_MATRICULA",
          centro_custo_id: (await admin
            .from("centros_custo")
            .select("id")
            .or("codigo.eq.ESCOLA,codigo.eq.ESC")
            .eq("ativo", true)
            .limit(1)
            .maybeSingle()).data?.id ?? null,
          competencia_ano_mes: `${anoRef}-${String(new Date().getMonth() + 1).padStart(2, "0")}`,
        })
        .select("id")
        .single();

      if (!cobrancaTaxaErr && cobrancaTaxa) {
        taxaMatriculaCobrancaId = cobrancaTaxa.id;

        // A3: Registrar em matriculas_financeiro_linhas
        await admin
          .from("matriculas_financeiro_linhas")
          .insert({
            matricula_id: matriculaId,
            tipo: "TAXA_MATRICULA",
            valor_centavos: valorTaxaMatriculaCentavos,
            descricao: `Taxa de matrícula #${matriculaId}`,
            origem_tabela: "cobrancas",
            origem_id: cobrancaTaxa.id,
            status: "PENDENTE",
            vencimento: new Date().toISOString().slice(0, 10),
            data_evento: new Date().toISOString().slice(0, 10),
          });
      }
    } catch (taxaErr) {
      console.warn("[api/matriculas/novo] Erro ao gerar cobrança taxa matrícula:", taxaErr);
    }
  }

  const { data: matriculaFinal, error: ativarErr } = await supabase
    .from("matriculas")
    .update({
      status: "ATIVA",
      updated_by: userId,
    })
    .eq("id", matriculaId)
    .select(insertSelect)
    .single();

  if (ativarErr) {
    return await rollbackAndServerError("ATIVAR_MATRICULA_FAIL", "Falha ao finalizar matricula apos liquidacao.", {
      ativarErr,
    });
  }

  matriculaCriada = matriculaFinal;

  try {
    await inserirMatriculaEventoSupabase(admin as unknown as { from: (table: string) => any }, {
      matricula_id: matriculaId,
      tipo_evento: "CRIADA",
      created_by: userId,
      dados: {
        tipo_matricula: tipoMatricula,
        metodo_liquidacao: metodoLiquidacao,
        itens_criados: itensCriados.length,
        vinculos_turma_aluno: vinculosTurmaAluno.length,
      },
    });
  } catch (matriculaEventoError) {
    console.error("[api/matriculas/novo] falha ao registrar evento CRIADA:", matriculaEventoError);
  }

  return NextResponse.json(
    {
      ok: true,
      matricula: matriculaCriada,
      itens_criados: itensCriados,
      vinculos_turma_aluno: vinculosTurmaAluno,
      resumo_financeiro: liquidacaoAto.payload,
      bolsa_aplicacoes: bolsasAplicadas,
      resumo_custeio: resumoCusteio,
      liquidacao_ato: liquidacaoAto.payload,
    },
    { status: 201 },
  );
  } catch (e: unknown) {
    return jsonError("UNHANDLED_EXCEPTION", e, 500);
  }
}





