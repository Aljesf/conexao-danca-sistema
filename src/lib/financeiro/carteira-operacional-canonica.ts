import type { SupabaseClient } from "@supabase/supabase-js";
import { formatarCompetenciaLabel, montarPessoaLabel } from "@/lib/financeiro/creditoConexao/cobrancas";
import type { Database } from "@/types/supabase.generated";

type SupabaseDbClient = SupabaseClient<Database>;
type ContextoCarteiraCanonica = "ESCOLA" | "CAFE" | "LOJA" | "OUTRO";
type StatusOperacionalCanonico = "PAGO" | "PENDENTE" | "VENCIDO";
type SituacaoNeoFinCanonica = "SEM_FATURA" | "FATURA_SEM_NEOFIN" | "EM_COBRANCA_NEOFIN";

type CobrancaBaseRow = {
  id: number;
  pessoa_id: number | null;
  competencia_ano_mes: string | null;
  centro_custo_id: number | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  status: string | null;
  valor_centavos: number | null;
  vencimento: string | null;
  data_pagamento: string | null;
  pessoas?: {
    id: number | null;
    nome: string | null;
  } | null;
};

type RecebimentoRow = {
  cobranca_id: number | null;
  valor_centavos: number | null;
  data_pagamento: string | null;
};

type LancamentoRow = {
  id: number;
  cobranca_id: number | null;
  centro_custo_id: number | null;
  conta_conexao_id: number | null;
  competencia: string | null;
};

type FaturaLancamentoRow = {
  fatura_id: number | null;
  lancamento_id: number | null;
};

type FaturaRow = {
  id: number;
  cobranca_id: number | null;
  periodo_referencia: string | null;
  status: string | null;
  data_vencimento: string | null;
  neofin_invoice_id: string | null;
};

type CentroCustoRow = Database["public"]["Tables"]["centros_custo"]["Row"];

type FaturaMeta = {
  faturaId: number | null;
  faturaCompetencia: string | null;
  faturaStatus: string | null;
  faturaCobrancaId: number | null;
  neofinInvoiceId: string | null;
};

export type FiltrosCarteiraCanonica = {
  busca?: string;
  competencia?: string | null;
  competenciaInicio?: string | null;
  competenciaFim?: string | null;
  vencimentoInicio?: string | null;
  vencimentoFim?: string | null;
  centroCustoIds?: number[];
  statusOperacional?: string | null;
  situacaoNeoFin?: string | null;
  pessoaId?: number | null;
  contexto?: ContextoCarteiraCanonica | null;
};

export type LinhaCarteiraCanonica = {
  cobrancaId: number;
  cobrancaFonte: "COBRANCA";
  pessoaId: number | null;
  pessoaNome: string;
  pessoaLabel: string;
  competenciaAnoMes: string | null;
  competenciaLabel: string;
  centroCustoId: number | null;
  centroCustoCodigo: string | null;
  centroCustoNome: string | null;
  contextoPrincipal: ContextoCarteiraCanonica;
  origemTipo: string | null;
  origemSubtipo: string | null;
  origemLabel: string;
  statusCobranca: string | null;
  valorCentavos: number;
  valorPagoCentavos: number;
  saldoCentavos: number;
  dataVencimento: string | null;
  dataPagamento: string | null;
  diasAtraso: number;
  statusOperacional: StatusOperacionalCanonico;
  lancamentoId: number | null;
  contaConexaoId: number | null;
  faturaId: number | null;
  faturaCompetencia: string | null;
  faturaStatus: string | null;
  faturaCobrancaId: number | null;
  neofinInvoiceId: string | null;
  possuiVinculoFatura: boolean;
  situacaoNeoFin: SituacaoNeoFinCanonica;
  cobrancaUrl: string;
  faturaUrl: string | null;
  permiteVinculoManual: boolean;
};

export type ResumoCarteiraOperacionalCanonica = {
  previstoCentavos: number;
  pagoCentavos: number;
  pendenteCentavos: number;
  vencidoCentavos: number;
  emCobrancaNeoFinCentavos: number;
};

export type GrupoCarteiraPorCompetencia = {
  competencia: string;
  competenciaLabel: string;
  itens: LinhaCarteiraCanonica[];
  resumo: ResumoCarteiraOperacionalCanonica;
};

const STATUS_EXCLUIDOS = new Set(["CANCELADA", "EXPURGADA", "SUBSTITUIDA"]);

function normalizarTexto(valor: unknown): string {
  return String(valor ?? "").trim();
}

function textoOuNull(valor: unknown): string | null {
  const texto = normalizarTexto(valor);
  return texto ? texto : null;
}

function numeroSeguro(valor: unknown): number {
  const numero = typeof valor === "number" ? valor : Number(valor ?? 0);
  return Number.isFinite(numero) ? Math.trunc(numero) : 0;
}

function dataValida(valor: string | null | undefined): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

function competenciaValida(valor: string | null | undefined): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}$/.test(valor);
}

function localIsoDate(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function diferencaDias(hojeIso: string, vencimento: string | null): number {
  if (!dataValida(vencimento)) return 0;
  const diffMs =
    new Date(`${hojeIso}T12:00:00`).getTime() - new Date(`${vencimento}T12:00:00`).getTime();
  return diffMs > 0 ? Math.floor(diffMs / 86_400_000) : 0;
}

function calcularStatusOperacional(params: {
  valorCentavos: number;
  valorPagoCentavos: number;
  dataVencimento: string | null;
  todayIso: string;
}): StatusOperacionalCanonico {
  const saldo = Math.max(params.valorCentavos - params.valorPagoCentavos, 0);
  if (saldo <= 0) return "PAGO";
  if (dataValida(params.dataVencimento) && params.dataVencimento < params.todayIso) {
    return "VENCIDO";
  }
  return "PENDENTE";
}

function calcularSituacaoNeoFin(params: {
  faturaId: number | null;
  neofinInvoiceId: string | null;
}): SituacaoNeoFinCanonica {
  if (!params.faturaId) return "SEM_FATURA";
  if (!params.neofinInvoiceId) return "FATURA_SEM_NEOFIN";
  return "EM_COBRANCA_NEOFIN";
}

function prioridadeFaturaStatus(status: string | null): number {
  switch (textoOuNull(status)?.toUpperCase()) {
    case "ABERTA":
      return 0;
    case "EM_ATRASO":
      return 1;
    case "FECHADA":
      return 2;
    case "PAGA":
      return 3;
    case "CANCELADA":
      return 4;
    default:
      return 9;
  }
}

function inferirContextoPrincipal(
  centroCusto: CentroCustoRow | undefined,
  origemTipo: string | null,
): ContextoCarteiraCanonica {
  const contextos = centroCusto?.contextos_aplicaveis ?? [];
  if (contextos.includes("ESCOLA")) return "ESCOLA";
  if (contextos.includes("CAFE")) return "CAFE";
  if (contextos.includes("LOJA")) return "LOJA";

  const origem = textoOuNull(origemTipo)?.toUpperCase() ?? "";
  if (origem === "CAFE") return "CAFE";
  if (origem === "LOJA" || origem === "LOJA_VENDA") return "LOJA";
  if (
    origem.startsWith("MATRICULA") ||
    origem === "SERVICO_ESCOLA" ||
    origem === "FATURA_CREDITO_CONEXAO" ||
    origem === "CREDITO_CONEXAO_FATURA"
  ) {
    return "ESCOLA";
  }

  return "OUTRO";
}

function montarOrigemLabel(origemTipo: string | null, origemSubtipo: string | null): string {
  const partes = [textoOuNull(origemTipo), textoOuNull(origemSubtipo)].filter(
    (item): item is string => Boolean(item),
  );
  if (partes.length === 0) return "Origem: nao informada";
  return `Origem: ${partes.join(" / ")}`;
}

function matchesBusca(linha: LinhaCarteiraCanonica, busca: string | undefined): boolean {
  const termo = textoOuNull(busca)?.toLowerCase();
  if (!termo) return true;

  const alvo = [
    linha.pessoaNome,
    linha.pessoaLabel,
    linha.origemLabel,
    linha.competenciaAnoMes ?? "",
    linha.centroCustoCodigo ?? "",
    linha.centroCustoNome ?? "",
    linha.origemTipo ?? "",
    linha.origemSubtipo ?? "",
    String(linha.cobrancaId),
    linha.faturaId ? String(linha.faturaId) : "",
    linha.faturaCobrancaId ? String(linha.faturaCobrancaId) : "",
  ]
    .join(" ")
    .toLowerCase();

  return alvo.includes(termo);
}

function filtrarPorCompetencia(linha: LinhaCarteiraCanonica, filtros: FiltrosCarteiraCanonica): boolean {
  if (filtros.competencia && linha.competenciaAnoMes !== filtros.competencia) return false;
  if (filtros.competenciaInicio && (linha.competenciaAnoMes ?? "") < filtros.competenciaInicio) return false;
  if (filtros.competenciaFim && (linha.competenciaAnoMes ?? "") > filtros.competenciaFim) return false;
  return true;
}

function filtrarPorVencimento(linha: LinhaCarteiraCanonica, filtros: FiltrosCarteiraCanonica): boolean {
  if (filtros.vencimentoInicio && dataValida(linha.dataVencimento) && linha.dataVencimento < filtros.vencimentoInicio) {
    return false;
  }
  if (filtros.vencimentoFim && dataValida(linha.dataVencimento) && linha.dataVencimento > filtros.vencimentoFim) {
    return false;
  }
  if (filtros.vencimentoInicio && !dataValida(linha.dataVencimento)) return false;
  return true;
}

function chunkNumbers(values: number[], chunkSize = 400): number[][] {
  const unique = Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)));
  if (unique.length === 0) return [];

  const chunks: number[][] = [];
  for (let index = 0; index < unique.length; index += chunkSize) {
    chunks.push(unique.slice(index, index + chunkSize));
  }
  return chunks;
}

async function carregarRecebimentosMap(
  supabase: SupabaseDbClient,
  cobrancaIds: number[],
): Promise<Map<number, { totalPagoCentavos: number; ultimaDataPagamento: string | null }>> {
  const mapa = new Map<number, { totalPagoCentavos: number; ultimaDataPagamento: string | null }>();

  for (const chunk of chunkNumbers(cobrancaIds)) {
    const { data, error } = await supabase
      .from("recebimentos")
      .select("cobranca_id,valor_centavos,data_pagamento")
      .in("cobranca_id", chunk);

    if (error) {
      throw new Error(`erro_buscar_recebimentos_canonicos:${error.message}`);
    }

    for (const raw of (data ?? []) as RecebimentoRow[]) {
      const cobrancaId = numeroSeguro(raw.cobranca_id);
      if (!cobrancaId) continue;

      const atual = mapa.get(cobrancaId) ?? {
        totalPagoCentavos: 0,
        ultimaDataPagamento: null,
      };

      atual.totalPagoCentavos += numeroSeguro(raw.valor_centavos);
      const dataPagamento = textoOuNull(raw.data_pagamento);
      if (dataPagamento && (!atual.ultimaDataPagamento || dataPagamento > atual.ultimaDataPagamento)) {
        atual.ultimaDataPagamento = dataPagamento;
      }

      mapa.set(cobrancaId, atual);
    }
  }

  return mapa;
}

async function carregarLancamentos(
  supabase: SupabaseDbClient,
  cobrancaIds: number[],
): Promise<LancamentoRow[]> {
  const rows: LancamentoRow[] = [];

  for (const chunk of chunkNumbers(cobrancaIds)) {
    const { data, error } = await supabase
      .from("credito_conexao_lancamentos")
      .select("id,cobranca_id,centro_custo_id,conta_conexao_id,competencia")
      .in("cobranca_id", chunk)
      .order("id", { ascending: true });

    if (error) {
      throw new Error(`erro_buscar_lancamentos_canonicos:${error.message}`);
    }

    rows.push(...((data ?? []) as LancamentoRow[]));
  }

  return rows;
}

async function carregarFaturaLinks(
  supabase: SupabaseDbClient,
  lancamentoIds: number[],
): Promise<FaturaLancamentoRow[]> {
  const rows: FaturaLancamentoRow[] = [];

  for (const chunk of chunkNumbers(lancamentoIds)) {
    const { data, error } = await supabase
      .from("credito_conexao_fatura_lancamentos")
      .select("fatura_id,lancamento_id")
      .in("lancamento_id", chunk);

    if (error) {
      throw new Error(`erro_buscar_fatura_lancamentos_canonicos:${error.message}`);
    }

    rows.push(...((data ?? []) as FaturaLancamentoRow[]));
  }

  return rows;
}

async function carregarFaturasMap(
  supabase: SupabaseDbClient,
  faturaIds: number[],
): Promise<Map<number, FaturaRow>> {
  const rows: FaturaRow[] = [];

  for (const chunk of chunkNumbers(faturaIds)) {
    const { data, error } = await supabase
      .from("credito_conexao_faturas")
      .select("id,cobranca_id,periodo_referencia,status,data_vencimento,neofin_invoice_id")
      .in("id", chunk);

    if (error) {
      throw new Error(`erro_buscar_faturas_canonicas:${error.message}`);
    }

    rows.push(...((data ?? []) as FaturaRow[]));
  }

  return new Map(rows.map((row) => [row.id, row]));
}

async function carregarCentrosCustoMap(
  supabase: SupabaseDbClient,
  centroCustoIds: number[],
): Promise<Map<number, CentroCustoRow>> {
  const rows: CentroCustoRow[] = [];

  for (const chunk of chunkNumbers(centroCustoIds)) {
    const { data, error } = await supabase
      .from("centros_custo")
      .select("id,codigo,nome,ativo,contextos_aplicaveis")
      .in("id", chunk);

    if (error) {
      throw new Error(`erro_buscar_centros_custo_canonicos:${error.message}`);
    }

    rows.push(...((data ?? []) as CentroCustoRow[]));
  }

  return new Map(rows.map((row) => [row.id, row]));
}

function escolherFaturaPrincipal(
  lancamentos: LancamentoRow[],
  linksPorLancamento: Map<number, number[]>,
  faturasMap: Map<number, FaturaRow>,
  competencia: string | null,
): { lancamentoId: number | null; contaConexaoId: number | null; meta: FaturaMeta } {
  const candidatos = lancamentos
    .map((lancamento) => {
      const faturas = (linksPorLancamento.get(lancamento.id) ?? [])
        .map((faturaId) => faturasMap.get(faturaId))
        .filter((item): item is FaturaRow => Boolean(item))
        .sort((a, b) => {
          const mesmaCompetenciaA = a.periodo_referencia === competencia ? 0 : 1;
          const mesmaCompetenciaB = b.periodo_referencia === competencia ? 0 : 1;
          if (mesmaCompetenciaA !== mesmaCompetenciaB) return mesmaCompetenciaA - mesmaCompetenciaB;

          const byStatus = prioridadeFaturaStatus(a.status) - prioridadeFaturaStatus(b.status);
          if (byStatus !== 0) return byStatus;

          return b.id - a.id;
        });

      return {
        lancamentoId: lancamento.id,
        contaConexaoId: numeroSeguro(lancamento.conta_conexao_id) || null,
        fatura: faturas[0] ?? null,
      };
    })
    .sort((a, b) => {
      const aTemFatura = a.fatura ? 0 : 1;
      const bTemFatura = b.fatura ? 0 : 1;
      if (aTemFatura !== bTemFatura) return aTemFatura - bTemFatura;

      if (a.fatura && b.fatura) {
        const mesmaCompetenciaA = a.fatura.periodo_referencia === competencia ? 0 : 1;
        const mesmaCompetenciaB = b.fatura.periodo_referencia === competencia ? 0 : 1;
        if (mesmaCompetenciaA !== mesmaCompetenciaB) return mesmaCompetenciaA - mesmaCompetenciaB;

        const byStatus = prioridadeFaturaStatus(a.fatura.status) - prioridadeFaturaStatus(b.fatura.status);
        if (byStatus !== 0) return byStatus;
      }

      return a.lancamentoId - b.lancamentoId;
    });

  const principal = candidatos[0];
  if (!principal) {
    return {
      lancamentoId: null,
      contaConexaoId: null,
      meta: {
        faturaId: null,
        faturaCompetencia: null,
        faturaStatus: null,
        faturaCobrancaId: null,
        neofinInvoiceId: null,
      },
    };
  }

  return {
    lancamentoId: principal.lancamentoId,
    contaConexaoId: principal.contaConexaoId,
    meta: {
      faturaId: principal.fatura?.id ?? null,
      faturaCompetencia: textoOuNull(principal.fatura?.periodo_referencia),
      faturaStatus: textoOuNull(principal.fatura?.status),
      faturaCobrancaId: numeroSeguro(principal.fatura?.cobranca_id) || null,
      neofinInvoiceId: textoOuNull(principal.fatura?.neofin_invoice_id),
    },
  };
}

export async function listarCarteiraOperacionalCanonica(
  supabase: SupabaseDbClient,
  filtros: FiltrosCarteiraCanonica,
): Promise<LinhaCarteiraCanonica[]> {
  let query = supabase
    .from("cobrancas")
    .select(
      "id,pessoa_id,competencia_ano_mes,centro_custo_id,origem_tipo,origem_subtipo,status,valor_centavos,vencimento,data_pagamento,pessoas:pessoa_id(id,nome)",
    )
    .not("competencia_ano_mes", "is", null)
    .order("competencia_ano_mes", { ascending: false, nullsFirst: false })
    .order("vencimento", { ascending: true, nullsFirst: false })
    .order("id", { ascending: false });

  if (filtros.pessoaId) {
    query = query.eq("pessoa_id", filtros.pessoaId);
  }
  if (filtros.competencia) {
    query = query.eq("competencia_ano_mes", filtros.competencia);
  }
  if (filtros.competenciaInicio) {
    query = query.gte("competencia_ano_mes", filtros.competenciaInicio);
  }
  if (filtros.competenciaFim) {
    query = query.lte("competencia_ano_mes", filtros.competenciaFim);
  }
  if (filtros.vencimentoInicio) {
    query = query.gte("vencimento", filtros.vencimentoInicio);
  }
  if (filtros.vencimentoFim) {
    query = query.lte("vencimento", filtros.vencimentoFim);
  }
  if (filtros.centroCustoIds?.length) {
    query = query.in("centro_custo_id", filtros.centroCustoIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`erro_buscar_cobrancas_canonicas:${error.message}`);
  }

  const cobrancas = ((data ?? []) as CobrancaBaseRow[]).filter((item) => {
    const status = textoOuNull(item.status)?.toUpperCase() ?? "";
    return !STATUS_EXCLUIDOS.has(status);
  });

  if (cobrancas.length === 0) return [];

  const cobrancaIds = cobrancas.map((item) => item.id);
  const [recebimentosMap, lancamentos] = await Promise.all([
    carregarRecebimentosMap(supabase, cobrancaIds),
    carregarLancamentos(supabase, cobrancaIds),
  ]);

  const lancamentoIds = lancamentos.map((item) => item.id);
  const faturaLinks = lancamentoIds.length > 0 ? await carregarFaturaLinks(supabase, lancamentoIds) : [];
  const faturaIds = faturaLinks
    .map((item) => numeroSeguro(item.fatura_id))
    .filter((item) => item > 0);
  const faturasMap =
    faturaIds.length > 0 ? await carregarFaturasMap(supabase, faturaIds) : new Map<number, FaturaRow>();

  const linksPorLancamento = new Map<number, number[]>();
  for (const link of faturaLinks) {
    const lancamentoId = numeroSeguro(link.lancamento_id);
    const faturaId = numeroSeguro(link.fatura_id);
    if (!lancamentoId || !faturaId) continue;
    const atual = linksPorLancamento.get(lancamentoId) ?? [];
    atual.push(faturaId);
    linksPorLancamento.set(lancamentoId, atual);
  }

  const lancamentosPorCobranca = new Map<number, LancamentoRow[]>();
  for (const lancamento of lancamentos) {
    const cobrancaId = numeroSeguro(lancamento.cobranca_id);
    if (!cobrancaId) continue;
    const atual = lancamentosPorCobranca.get(cobrancaId) ?? [];
    atual.push(lancamento);
    lancamentosPorCobranca.set(cobrancaId, atual);
  }

  const centroCustoIds = Array.from(
    new Set(
      [
        ...cobrancas.map((item) => numeroSeguro(item.centro_custo_id)),
        ...lancamentos.map((item) => numeroSeguro(item.centro_custo_id)),
      ].filter((item) => item > 0),
    ),
  );
  const centrosCustoMap =
    centroCustoIds.length > 0 ? await carregarCentrosCustoMap(supabase, centroCustoIds) : new Map<number, CentroCustoRow>();

  const todayIso = localIsoDate(new Date());
  const linhas = cobrancas
    .map((item) => {
      const recebimentos = recebimentosMap.get(item.id);
      const valorCentavos = numeroSeguro(item.valor_centavos);
      const valorPagoCentavos = Math.max(0, recebimentos?.totalPagoCentavos ?? 0);
      const saldoCentavos = Math.max(valorCentavos - valorPagoCentavos, 0);
      const lancamentosRelacionados = lancamentosPorCobranca.get(item.id) ?? [];
      const centroCustoId =
        numeroSeguro(item.centro_custo_id) || numeroSeguro(lancamentosRelacionados[0]?.centro_custo_id) || null;
      const centroCusto = centroCustoId ? centrosCustoMap.get(centroCustoId) : undefined;
      const competenciaAnoMes = competenciaValida(item.competencia_ano_mes) ? item.competencia_ano_mes : null;
      const faturaPrincipal = escolherFaturaPrincipal(
        lancamentosRelacionados,
        linksPorLancamento,
        faturasMap,
        competenciaAnoMes,
      );
      const statusOperacional = calcularStatusOperacional({
        valorCentavos,
        valorPagoCentavos,
        dataVencimento: textoOuNull(item.vencimento),
        todayIso,
      });
      const situacaoNeoFin = calcularSituacaoNeoFin({
        faturaId: faturaPrincipal.meta.faturaId,
        neofinInvoiceId: faturaPrincipal.meta.neofinInvoiceId,
      });
      const pessoaId = numeroSeguro(item.pessoa_id) || null;
      const pessoaNome =
        textoOuNull(item.pessoas?.nome) ?? (pessoaId ? `Pessoa #${pessoaId}` : "Pessoa nao identificada");
      const pessoaLabel = montarPessoaLabel(pessoaNome, pessoaId);
      const dataVencimento = textoOuNull(item.vencimento);
      const diasAtraso = statusOperacional === "VENCIDO" ? diferencaDias(todayIso, dataVencimento) : 0;

      return {
        cobrancaId: item.id,
        cobrancaFonte: "COBRANCA",
        pessoaId,
        pessoaNome,
        pessoaLabel,
        competenciaAnoMes,
        competenciaLabel: formatarCompetenciaLabel(competenciaAnoMes),
        centroCustoId,
        centroCustoCodigo: textoOuNull(centroCusto?.codigo),
        centroCustoNome: textoOuNull(centroCusto?.nome),
        contextoPrincipal: inferirContextoPrincipal(centroCusto, textoOuNull(item.origem_tipo)),
        origemTipo: textoOuNull(item.origem_tipo),
        origemSubtipo: textoOuNull(item.origem_subtipo),
        origemLabel: montarOrigemLabel(textoOuNull(item.origem_tipo), textoOuNull(item.origem_subtipo)),
        statusCobranca: textoOuNull(item.status),
        valorCentavos,
        valorPagoCentavos,
        saldoCentavos,
        dataVencimento,
        dataPagamento: recebimentos?.ultimaDataPagamento ?? textoOuNull(item.data_pagamento),
        diasAtraso,
        statusOperacional,
        lancamentoId: faturaPrincipal.lancamentoId,
        contaConexaoId: faturaPrincipal.contaConexaoId,
        faturaId: faturaPrincipal.meta.faturaId,
        faturaCompetencia: faturaPrincipal.meta.faturaCompetencia,
        faturaStatus: faturaPrincipal.meta.faturaStatus,
        faturaCobrancaId: faturaPrincipal.meta.faturaCobrancaId,
        neofinInvoiceId: faturaPrincipal.meta.neofinInvoiceId,
        possuiVinculoFatura: Boolean(faturaPrincipal.meta.faturaId),
        situacaoNeoFin,
        cobrancaUrl: `/admin/governanca/cobrancas/${item.id}`,
        faturaUrl: faturaPrincipal.meta.faturaId
          ? `/admin/financeiro/credito-conexao/faturas/${faturaPrincipal.meta.faturaId}`
          : null,
        permiteVinculoManual: !faturaPrincipal.meta.faturaId,
      } satisfies LinhaCarteiraCanonica;
    })
    .filter((linha) => filtrarPorCompetencia(linha, filtros))
    .filter((linha) => filtrarPorVencimento(linha, filtros))
    .filter((linha) => matchesBusca(linha, filtros.busca))
    .filter((linha) => {
      if (filtros.statusOperacional && filtros.statusOperacional !== "todos" && filtros.statusOperacional !== "TODOS") {
        return linha.statusOperacional === filtros.statusOperacional;
      }
      return true;
    })
    .filter((linha) => {
      if (filtros.situacaoNeoFin && filtros.situacaoNeoFin !== "todos" && filtros.situacaoNeoFin !== "TODOS") {
        return linha.situacaoNeoFin === filtros.situacaoNeoFin;
      }
      return true;
    })
    .filter((linha) => {
      if (!filtros.contexto) return true;
      return linha.contextoPrincipal === filtros.contexto;
    });

  return linhas.sort((a, b) => {
    const competenciaA = a.competenciaAnoMes ?? "";
    const competenciaB = b.competenciaAnoMes ?? "";
    const byCompetencia = competenciaB.localeCompare(competenciaA);
    if (byCompetencia !== 0) return byCompetencia;

    const vencimentoA = a.dataVencimento ?? "9999-12-31";
    const vencimentoB = b.dataVencimento ?? "9999-12-31";
    const byVencimento = vencimentoA.localeCompare(vencimentoB);
    if (byVencimento !== 0) return byVencimento;

    return b.cobrancaId - a.cobrancaId;
  });
}

export function resumirCarteiraOperacional(
  linhas: LinhaCarteiraCanonica[],
): ResumoCarteiraOperacionalCanonica {
  return linhas.reduce<ResumoCarteiraOperacionalCanonica>(
    (acc, linha) => {
      acc.previstoCentavos += linha.valorCentavos;
      acc.pagoCentavos += linha.valorPagoCentavos;
      acc.pendenteCentavos += linha.saldoCentavos;

      if (linha.statusOperacional === "VENCIDO") {
        acc.vencidoCentavos += linha.saldoCentavos;
      }

      if (linha.situacaoNeoFin === "EM_COBRANCA_NEOFIN") {
        acc.emCobrancaNeoFinCentavos += linha.saldoCentavos;
      }

      return acc;
    },
    {
      previstoCentavos: 0,
      pagoCentavos: 0,
      pendenteCentavos: 0,
      vencidoCentavos: 0,
      emCobrancaNeoFinCentavos: 0,
    },
  );
}

export function agruparCarteiraPorCompetencia(
  linhas: LinhaCarteiraCanonica[],
): GrupoCarteiraPorCompetencia[] {
  const mapa = new Map<string, LinhaCarteiraCanonica[]>();

  for (const linha of linhas) {
    const chave = linha.competenciaAnoMes ?? "SEM_COMPETENCIA";
    const atual = mapa.get(chave) ?? [];
    atual.push(linha);
    mapa.set(chave, atual);
  }

  return Array.from(mapa.entries())
    .map(([competencia, itens]) => ({
      competencia,
      competenciaLabel: formatarCompetenciaLabel(competencia),
      itens: itens.sort((a, b) => {
        const prioridadeStatus = (status: StatusOperacionalCanonico) => {
          if (status === "VENCIDO") return 0;
          if (status === "PENDENTE") return 1;
          return 2;
        };

        const byStatus = prioridadeStatus(a.statusOperacional) - prioridadeStatus(b.statusOperacional);
        if (byStatus !== 0) return byStatus;

        const byVencimento = (a.dataVencimento ?? "9999-12-31").localeCompare(b.dataVencimento ?? "9999-12-31");
        if (byVencimento !== 0) return byVencimento;

        return a.pessoaLabel.localeCompare(b.pessoaLabel, "pt-BR");
      }),
      resumo: resumirCarteiraOperacional(itens),
    }))
    .sort((a, b) => b.competencia.localeCompare(a.competencia));
}
