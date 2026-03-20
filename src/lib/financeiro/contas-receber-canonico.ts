import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listarCarteiraOperacionalCanonica,
  type FiltrosCarteiraCanonica,
  type ItemDetalheContaInterna,
  type LinhaCarteiraCanonica,
} from "@/lib/financeiro/carteira-operacional-canonica";
import {
  type CobrancaListaItem,
  type ComposicaoFaturaConexao,
  type ContasReceberAuditoriaInput,
  type ContasReceberAuditoriaPayload,
  type ContextoPrincipal,
  type ContextoVisaoItem,
  type DevedorAuditoriaItem,
  type DetalheCobrancaAuditoria,
  type KpiVisaoCard,
  type OrigemDetalhada,
  type RankingResumoItem,
} from "@/lib/financeiro/contas-receber-auditoria";
import {
  getContextoLabel,
  normalizeContasReceberOrdenacao,
  normalizeContasReceberTipoPeriodo,
  normalizeContasReceberVisao,
  type ContasReceberOrdenacao,
} from "@/lib/financeiro/contas-receber-view-config";
import type { Database } from "@/types/supabase.generated";

type SupabaseDbClient = SupabaseClient<Database>;

type BadgeCanonico = {
  label: string;
  tone: "success" | "warning" | "neutral";
};

function textOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function isAnoMes(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function isDateLike(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function upper(value: string | null | undefined): string {
  return textOrNull(value)?.toUpperCase() ?? "";
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => textOrNull(value)).filter((value): value is string => Boolean(value))));
}

function compareNullableDateAsc(left: string | null, right: string | null): number {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right);
}

function mapOrigemDetalhada(linha: LinhaCarteiraCanonica): OrigemDetalhada {
  if (linha.contextoPrincipal === "CAFE") return "CONSUMO_CAFE";
  if (linha.contextoPrincipal === "LOJA") return "VENDA_LOJA";
  return "CONTA_INTERNA_ALUNO";
}

function buildBucket(linha: LinhaCarteiraCanonica): string {
  if (linha.statusOperacional === "VENCIDO") return "VENCIDA";
  if (linha.statusOperacional === "PENDENTE") return "A_VENCER_30";
  return "QUITADA_OU_ZERO";
}

function itemTipoToken(item: ItemDetalheContaInterna | undefined): string | null {
  const tipo = upper(item?.tipoItem);
  if (!tipo) return "LANCAMENTO_CONTA_INTERNA";
  if (tipo.includes("MATRICULA")) return "MATRICULA";
  if (tipo.includes("CAFE")) return "CAFE";
  if (tipo.includes("LOJA")) return "LOJA";
  if (tipo.includes("AJUSTE")) return "AJUSTE";
  if (tipo.includes("COLABORADOR")) return "CONTA_INTERNA_COLABORADOR";
  return "LANCAMENTO_CONTA_INTERNA";
}

function resumoComposicao(linha: LinhaCarteiraCanonica): string {
  const tipos = uniqueStrings(linha.itens.map((item) => item.tipoItem ?? item.descricao));
  if (tipos.length === 0) return "lancamentos e ajustes da conta interna";
  if (tipos.length === 1) return tipos[0].toLowerCase();
  if (tipos.length === 2) return `${tipos[0].toLowerCase()} e ${tipos[1].toLowerCase()}`;
  return `${tipos[0].toLowerCase()}, ${tipos[1].toLowerCase()} e outros itens da conta interna`;
}

function coletarAlunoNomes(linha: LinhaCarteiraCanonica): string[] {
  return uniqueStrings(linha.itens.flatMap((item) => item.alunoNomes));
}

function alunoResumo(linha: LinhaCarteiraCanonica): string | null {
  const alunos = coletarAlunoNomes(linha);
  if (alunos.length === 0) return null;
  if (alunos.length === 1) return alunos[0];
  return `${alunos[0]} + ${alunos.length - 1} aluno(s)`;
}

function buildOrigemLabel(linha: LinhaCarteiraCanonica): string {
  return linha.contaInternaLabel;
}

function buildOrigemSecundaria(linha: LinhaCarteiraCanonica): string {
  const partes = [
    `Cobranca oficial #${linha.cobrancaId}`,
    linha.faturaContaInternaId ? `Fatura interna #${linha.faturaContaInternaId}` : "Sem fatura interna vinculada",
    linha.cobrancaFaturaId ? `Cobranca da fatura #${linha.cobrancaFaturaId}` : null,
    linha.houveGeracaoNeoFin ? "Cobranca NeoFin gerada" : "Cobranca NeoFin nao gerada",
  ].filter((item): item is string => Boolean(item));

  return partes.join(" | ");
}

function buildOrigemTecnica(linha: LinhaCarteiraCanonica): string {
  return `Base da cobranca: conta interna | Composicao: ${resumoComposicao(linha)}`;
}

function buildBadgeCanonico(linha: LinhaCarteiraCanonica): BadgeCanonico {
  if (!linha.possuiFaturaInterna) {
    return { label: "Sem fatura interna vinculada", tone: "neutral" };
  }

  if (linha.houveGeracaoNeoFin) {
    return { label: "Cobranca NeoFin gerada", tone: "success" };
  }

  return { label: "Cobranca NeoFin nao gerada", tone: "warning" };
}

function buildMigracaoObservacao(linha: LinhaCarteiraCanonica): string {
  return [
    "Leitura canonica baseada na cobranca oficial da conta interna.",
    `Composicao resolvida por ${linha.itens.length} item(ns) e ${coletarAlunoNomes(linha).length || 0} aluno(s) relacionado(s).`,
  ].join(" ");
}

function buildDescricaoCobranca(linha: LinhaCarteiraCanonica): string {
  return `Cobranca oficial #${linha.cobrancaId}`;
}

function buildStatusInterno(linha: LinhaCarteiraCanonica): "QUITADA" | "VENCIDA" | "EM_ABERTO" {
  if (linha.statusOperacional === "PAGO") return "QUITADA";
  if (linha.statusOperacional === "VENCIDO") return "VENCIDA";
  return "EM_ABERTO";
}

function buildComposicaoDetalhada(linha: LinhaCarteiraCanonica): ComposicaoFaturaConexao | null {
  if (linha.itens.length === 0) return null;

  return {
    fatura_id: linha.faturaContaInternaId ?? linha.cobrancaId,
    conta_conexao_id: linha.contaInternaId,
    periodo_referencia: linha.competenciaAnoMes,
    data_vencimento: linha.dataVencimento,
    valor_total_centavos: linha.valorCentavos,
    itens: linha.itens.map((item, index) => ({
      lancamento_id: item.lancamentoId ?? 0,
      descricao: item.descricao ?? `Item ${index + 1}`,
      valor_centavos: item.valorCentavos,
      origem_sistema: item.tipoItem ?? "LANCAMENTO_CONTA_INTERNA",
      origem_id: item.lancamentoId,
      cobranca_id_relacionada: linha.cobrancaId,
      referencia_item: item.referenciaItem,
      composicao_json: {
        aluno_nomes: item.alunoNomes,
        aluno_ids: item.alunoIds,
        tipo_item: item.tipoItem,
      },
    })),
  };
}

function mapLinhaToCobrancaListaItem(linha: LinhaCarteiraCanonica): CobrancaListaItem {
  const badge = buildBadgeCanonico(linha);
  const primeiroItem = linha.itens[0];
  const origemItemTipo = itemTipoToken(primeiroItem);
  const alunoNome = alunoResumo(linha);

  return {
    cobranca_id: linha.cobrancaId,
    pessoa_id: linha.pessoaId,
    pessoa_nome: linha.pessoaNome,
    contexto_principal: linha.contextoPrincipal as ContextoPrincipal,
    origem_detalhada: mapOrigemDetalhada(linha),
    origem_label: buildOrigemLabel(linha),
    vencimento: linha.dataVencimento,
    competencia_ano_mes: linha.competenciaAnoMes,
    bucket: buildBucket(linha),
    valor_centavos: linha.valorCentavos,
    valor_aberto_centavos: linha.saldoCentavos,
    valor_recebido_centavos: linha.valorPagoCentavos,
    status_cobranca: linha.statusCobranca,
    status_interno: buildStatusInterno(linha),
    centro_custo_id: linha.centroCustoId,
    centro_custo_codigo: linha.centroCustoCodigo,
    centro_custo_nome: linha.centroCustoNome,
    centro_custo_agrupador_id: null,
    centro_custo_agrupador_codigo: null,
    centro_custo_agrupador_nome: null,
    centro_custo_lancamento_id: linha.centroCustoId,
    centro_custo_lancamento_codigo: linha.centroCustoCodigo,
    centro_custo_lancamento_nome: linha.centroCustoNome,
    atraso_dias: linha.diasAtraso,
    origem_tipo: "CONTA_INTERNA",
    origem_subtipo: linha.contextoPrincipal,
    origem_id: linha.contaInternaId,
    ultima_data_recebimento: linha.dataPagamento,
    quantidade_recebimentos: linha.valorPagoCentavos > 0 ? 1 : 0,
    tipo_inconsistencia: null,
    criticidade_inconsistencia: 0,
    origem_agrupador_tipo: "CONTA_INTERNA",
    origem_agrupador_id: linha.contaInternaId,
    origem_item_tipo: origemItemTipo,
    origem_item_id: primeiroItem?.lancamentoId ?? null,
    conta_interna_id: linha.contaInternaId,
    alunoNome,
    matriculaId: null,
    migracao_conta_interna_status: "OK",
    migracao_conta_interna_observacao: buildMigracaoObservacao(linha),
    origem_secundaria: buildOrigemSecundaria(linha),
    origem_tecnica: buildOrigemTecnica(linha),
    origem_badge_label: badge.label,
    origem_badge_tone: badge.tone,
    origemAgrupadorTipo: "CONTA_INTERNA",
    origemAgrupadorId: linha.contaInternaId,
    origemItemTipo: origemItemTipo,
    origemItemId: primeiroItem?.lancamentoId ?? null,
    contaInternaId: linha.contaInternaId,
    origemLabel: buildOrigemLabel(linha),
    migracaoContaInternaStatus: "OK",
    vencimento_original: linha.dataVencimento,
    vencimento_ajustado_em: null,
    vencimento_ajustado_por: null,
    vencimento_ajuste_motivo: null,
    cancelada_em: null,
    cancelada_por: null,
    cancelamento_motivo: null,
    cancelamento_tipo: null,
    vencimentoOriginal: linha.dataVencimento,
    vencimentoAjustadoEm: null,
    vencimentoAjustadoPor: null,
    vencimentoAjusteMotivo: null,
    canceladaEm: null,
    canceladaPor: null,
    cancelamentoMotivo: null,
    cancelamentoTipo: null,
    matriculaStatus: null,
    matriculaCancelamentoTipo: null,
  };
}

function filtrarPorPeriodo(
  linhas: LinhaCarteiraCanonica[],
  input: ContasReceberAuditoriaInput,
): LinhaCarteiraCanonica[] {
  const tipoPeriodo = normalizeContasReceberTipoPeriodo(input.tipoPeriodo);
  const competenciaMesAno =
    input.ano && input.mes && /^(0[1-9]|1[0-2])$/.test(input.mes) ? `${input.ano}-${input.mes}` : null;

  return linhas.filter((linha) => {
    if (tipoPeriodo === "MES_ANO" && competenciaMesAno) {
      return linha.competenciaAnoMes === competenciaMesAno;
    }

    if (tipoPeriodo === "ANO_INTEIRO" && input.ano) {
      return (linha.competenciaAnoMes ?? "").startsWith(`${input.ano}-`);
    }

    if (tipoPeriodo === "COMPETENCIA") {
      if (isAnoMes(input.competencia) && linha.competenciaAnoMes !== input.competencia) return false;
      if (isAnoMes(input.competenciaInicio) && (linha.competenciaAnoMes ?? "") < input.competenciaInicio) return false;
      if (isAnoMes(input.competenciaFim) && (linha.competenciaAnoMes ?? "") > input.competenciaFim) return false;
      return true;
    }

    if (tipoPeriodo === "ENTRE_DATAS") {
      if (isDateLike(input.vencimentoInicio) && (!linha.dataVencimento || linha.dataVencimento < input.vencimentoInicio)) {
        return false;
      }
      if (isDateLike(input.vencimentoFim) && (!linha.dataVencimento || linha.dataVencimento > input.vencimentoFim)) {
        return false;
      }
      return true;
    }

    if (isAnoMes(input.competencia) && linha.competenciaAnoMes !== input.competencia) return false;
    if (isAnoMes(input.competenciaInicio) && (linha.competenciaAnoMes ?? "") < input.competenciaInicio) return false;
    if (isAnoMes(input.competenciaFim) && (linha.competenciaAnoMes ?? "") > input.competenciaFim) return false;
    if (isDateLike(input.vencimentoInicio) && (!linha.dataVencimento || linha.dataVencimento < input.vencimentoInicio)) {
      return false;
    }
    if (isDateLike(input.vencimentoFim) && (!linha.dataVencimento || linha.dataVencimento > input.vencimentoFim)) {
      return false;
    }

    return true;
  });
}

function filtrarLinhasCanonicas(
  linhas: LinhaCarteiraCanonica[],
  input: ContasReceberAuditoriaInput,
): LinhaCarteiraCanonica[] {
  const contexto = upper(input.contexto);
  const query = textOrNull(input.q)?.toLowerCase();

  return filtrarPorPeriodo(linhas, input)
    .filter((linha) => linha.statusOperacional === "VENCIDO")
    .filter((linha) => {
      if (contexto && contexto !== "TODOS") {
        return linha.contextoPrincipal === contexto;
      }
      return true;
    })
    .filter((linha) => {
      if (!query) return true;
      const haystack = [
        linha.pessoaNome,
        linha.pessoaLabel,
        linha.contaInternaLabel,
        linha.contaInternaDescricao ?? "",
        linha.competenciaAnoMes ?? "",
        linha.centroCustoNome ?? "",
        linha.centroCustoCodigo ?? "",
        String(linha.cobrancaId),
        linha.contaInternaId ? String(linha.contaInternaId) : "",
        linha.faturaContaInternaId ? String(linha.faturaContaInternaId) : "",
        linha.cobrancaFaturaId ? String(linha.cobrancaFaturaId) : "",
        linha.neofinInvoiceId ?? "",
        ...linha.itens.flatMap((item) => [
          item.descricao ?? "",
          item.referenciaItem ?? "",
          item.tipoItem ?? "",
          ...item.alunoNomes,
        ]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    })
    .filter((linha) => {
      const status = textOrNull(input.status);
      if (!status || upper(status) === "TODOS") return true;
      return upper(linha.statusCobranca) === upper(status);
    })
    .filter(() => {
      const situacao = upper(input.situacao);
      if (!situacao || situacao === "TODAS" || situacao === "VENCIDA") return true;
      return false;
    })
    .filter(() => {
      const bucket = upper(input.bucket);
      if (!bucket || bucket === "VENCIDA") return true;
      return false;
    });
}

function buildDevedores(items: CobrancaListaItem[]): DevedorAuditoriaItem[] {
  const mapa = new Map<number, DevedorAuditoriaItem>();

  for (const item of items) {
    if (!item.pessoa_id || item.valor_aberto_centavos <= 0) continue;

    const atual = mapa.get(item.pessoa_id) ?? {
      pessoa_id: item.pessoa_id,
      pessoa_nome: item.pessoa_nome,
      total_vencido_centavos: 0,
      titulos_vencidos: 0,
      maior_atraso_dias: 0,
      vencimento_mais_antigo: item.vencimento,
    };

    atual.total_vencido_centavos += item.valor_aberto_centavos;
    atual.titulos_vencidos += 1;
    atual.maior_atraso_dias = Math.max(atual.maior_atraso_dias, item.atraso_dias);
    if (item.vencimento && (!atual.vencimento_mais_antigo || item.vencimento < atual.vencimento_mais_antigo)) {
      atual.vencimento_mais_antigo = item.vencimento;
    }

    mapa.set(item.pessoa_id, atual);
  }

  return Array.from(mapa.values()).sort((left, right) => {
    if (right.maior_atraso_dias !== left.maior_atraso_dias) {
      return right.maior_atraso_dias - left.maior_atraso_dias;
    }
    if (right.total_vencido_centavos !== left.total_vencido_centavos) {
      return right.total_vencido_centavos - left.total_vencido_centavos;
    }
    return left.pessoa_nome.localeCompare(right.pessoa_nome, "pt-BR");
  });
}

function buildMetricasVencidas(items: CobrancaListaItem[], devedores: DevedorAuditoriaItem[]): KpiVisaoCard[] {
  const totalVencido = items.reduce((acc, item) => acc + Math.max(item.valor_aberto_centavos, 0), 0);
  const maiorAtraso = items.reduce((acc, item) => Math.max(acc, item.atraso_dias), 0);
  const ticketMedio = items.length > 0 ? Math.round(totalVencido / items.length) : 0;

  return [
    {
      id: "total_vencido",
      label: "Total vencido",
      tipo: "currency",
      valor_centavos: totalVencido,
      valor_numero: null,
      valor_data: null,
      descricao: "Saldo vencido em aberto na carteira canonica por cobranca oficial.",
    },
    {
      id: "devedores_vencidos",
      label: "Devedores vencidos",
      tipo: "count",
      valor_centavos: null,
      valor_numero: devedores.length,
      valor_data: null,
      descricao: "Pessoas com pelo menos uma cobranca oficial vencida no filtro atual.",
    },
    {
      id: "maior_atraso",
      label: "Maior atraso",
      tipo: "days",
      valor_centavos: null,
      valor_numero: maiorAtraso,
      valor_data: null,
      descricao: "Maior atraso entre cobrancas oficiais vencidas.",
    },
    {
      id: "ticket_medio_vencido",
      label: "Ticket medio vencido",
      tipo: "currency",
      valor_centavos: ticketMedio,
      valor_numero: null,
      valor_data: null,
      descricao: "Media por cobranca oficial vencida.",
    },
  ];
}

function buildContextosVencidos(items: CobrancaListaItem[]): ContextoVisaoItem[] {
  const mapa = new Map<ContextoPrincipal, ContextoVisaoItem>();
  for (const contexto of ["ESCOLA", "CAFE", "LOJA", "OUTRO"] as const) {
    mapa.set(contexto, {
      contexto,
      label: getContextoLabel(contexto),
      valor_centavos: 0,
      quantidade_cobrancas: 0,
    });
  }

  for (const item of items) {
    const atual = mapa.get(item.contexto_principal);
    if (!atual) continue;
    atual.valor_centavos += Math.max(item.valor_aberto_centavos, 0);
    atual.quantidade_cobrancas += 1;
  }

  return Array.from(mapa.values());
}

function buildRankingVencidos(devedores: DevedorAuditoriaItem[]): RankingResumoItem[] {
  return devedores.map((item) => ({
    chave: `pessoa:${item.pessoa_id}`,
    pessoa_id: item.pessoa_id,
    pessoa_nome: item.pessoa_nome,
    total_centavos: item.total_vencido_centavos,
    quantidade_titulos: item.titulos_vencidos,
    maior_atraso_dias: item.maior_atraso_dias,
    vencimento_mais_antigo: item.vencimento_mais_antigo,
    vencimento_mais_proximo: item.vencimento_mais_antigo,
    data_mais_recente: null,
    maior_valor_centavos: item.total_vencido_centavos,
    criticidade: item.maior_atraso_dias,
    observacao: "Carteira canonica por cobranca oficial da conta interna",
  }));
}

function ordenarItems(items: CobrancaListaItem[], ordenacao: ContasReceberOrdenacao): CobrancaListaItem[] {
  return [...items].sort((left, right) => {
    if (ordenacao === "NOME_PESSOA") {
      return left.pessoa_nome.localeCompare(right.pessoa_nome, "pt-BR");
    }

    if (ordenacao === "MAIOR_VALOR") {
      const diff = right.valor_aberto_centavos - left.valor_aberto_centavos;
      if (diff !== 0) return diff;
      return compareNullableDateAsc(left.vencimento, right.vencimento);
    }

    if (ordenacao === "VENCIMENTO_MAIS_ANTIGO" || ordenacao === "VENCIMENTO_MAIS_PROXIMO") {
      const diff = compareNullableDateAsc(left.vencimento, right.vencimento);
      if (diff !== 0) return diff;
      return right.atraso_dias - left.atraso_dias;
    }

    if (right.atraso_dias !== left.atraso_dias) {
      return right.atraso_dias - left.atraso_dias;
    }

    if (right.valor_aberto_centavos !== left.valor_aberto_centavos) {
      return right.valor_aberto_centavos - left.valor_aberto_centavos;
    }

    return left.pessoa_nome.localeCompare(right.pessoa_nome, "pt-BR");
  });
}

function paginate<T>(
  items: T[],
  page: number,
  pageSize: number,
): { rows: T[]; total: number; totalPaginas: number; pageAjustada: number } {
  const total = items.length;
  const totalPaginas = total === 0 ? 1 : Math.ceil(total / pageSize);
  const pageAjustada = Math.min(Math.max(page, 1), totalPaginas);
  const inicio = (pageAjustada - 1) * pageSize;
  return {
    rows: items.slice(inicio, inicio + pageSize),
    total,
    totalPaginas,
    pageAjustada,
  };
}

function buildResumo(items: CobrancaListaItem[]) {
  const totalPorContexto = { escola: 0, cafe: 0, loja: 0, outro: 0 };
  let totalAbertoCentavos = 0;

  for (const item of items) {
    const aberto = Math.max(item.valor_aberto_centavos, 0);
    totalAbertoCentavos += aberto;
    if (item.contexto_principal === "ESCOLA") totalPorContexto.escola += aberto;
    if (item.contexto_principal === "CAFE") totalPorContexto.cafe += aberto;
    if (item.contexto_principal === "LOJA") totalPorContexto.loja += aberto;
    if (item.contexto_principal === "OUTRO") totalPorContexto.outro += aberto;
  }

  return {
    total_aberto_centavos: totalAbertoCentavos,
    total_vencido_centavos: totalAbertoCentavos,
    total_a_vencer_centavos: 0,
    total_por_contexto: totalPorContexto,
  };
}

function trilhaCanonica(linha: LinhaCarteiraCanonica): DetalheCobrancaAuditoria["trilha_auditavel"] {
  const alunos = coletarAlunoNomes(linha);
  return [
    { titulo: "Cobranca oficial", valor: `#${linha.cobrancaId}` },
    { titulo: "Responsavel", valor: linha.pessoaLabel },
    { titulo: "Base da cobranca", valor: linha.contaInternaLabel },
    {
      titulo: "Fatura interna",
      valor: linha.faturaContaInternaId ? `#${linha.faturaContaInternaId}` : "Sem fatura interna vinculada",
    },
    {
      titulo: "Cobranca da fatura",
      valor: linha.cobrancaFaturaId ? `#${linha.cobrancaFaturaId}` : "Sem cobranca da fatura",
    },
    {
      titulo: "Cobranca NeoFin",
      valor: linha.houveGeracaoNeoFin ? "Gerada" : "Nao gerada",
    },
    { titulo: "NeoFin invoice", valor: linha.neofinInvoiceId ?? "Sem invoice" },
    { titulo: "Competencia", valor: linha.competenciaLabel },
    { titulo: "Vencimento", valor: linha.dataVencimento ?? "Sem vencimento" },
    { titulo: "Centro de custo", valor: linha.centroCustoNome ? `${linha.centroCustoCodigo ?? "--"} | ${linha.centroCustoNome}` : "Sem centro de custo" },
    { titulo: "Composicao", valor: resumoComposicao(linha) },
    { titulo: "Alunos", valor: alunos.length > 0 ? alunos.join(", ") : "Sem alunos identificados" },
  ];
}

function buildDetalhe(linha: LinhaCarteiraCanonica | undefined): DetalheCobrancaAuditoria | null {
  if (!linha) return null;

  const badge = buildBadgeCanonico(linha);
  const primeiroItem = linha.itens[0];
  const origemItemTipo = itemTipoToken(primeiroItem);
  const alunoNome = alunoResumo(linha);

  return {
    pessoa: {
      id: linha.pessoaId,
      nome: linha.pessoaNome,
    },
    cobranca: {
      id: linha.cobrancaId,
      descricao: buildDescricaoCobranca(linha),
      valor_centavos: linha.valorCentavos,
      valor_aberto_centavos: linha.saldoCentavos,
      valor_recebido_centavos: linha.valorPagoCentavos,
      vencimento: linha.dataVencimento,
      competencia_ano_mes: linha.competenciaAnoMes,
      status_cobranca: linha.statusCobranca,
      status_interno: buildStatusInterno(linha),
      origem_tipo: "CONTA_INTERNA",
      origem_subtipo: linha.contextoPrincipal,
      origem_id: linha.contaInternaId,
      created_at: null,
      updated_at: null,
      origem_agrupador_tipo: "CONTA_INTERNA",
      origem_agrupador_id: linha.contaInternaId,
      origem_item_tipo: origemItemTipo,
      origem_item_id: primeiroItem?.lancamentoId ?? null,
      conta_interna_id: linha.contaInternaId,
      alunoNome,
      matriculaId: null,
      migracao_conta_interna_status: "OK",
      migracao_conta_interna_observacao: buildMigracaoObservacao(linha),
      origem_secundaria: buildOrigemSecundaria(linha),
      origem_tecnica: buildOrigemTecnica(linha),
      origem_badge_label: badge.label,
      origem_badge_tone: badge.tone,
      origemAgrupadorTipo: "CONTA_INTERNA",
      origemAgrupadorId: linha.contaInternaId,
      origemItemTipo: origemItemTipo,
      origemItemId: primeiroItem?.lancamentoId ?? null,
      contaInternaId: linha.contaInternaId,
      origemLabel: buildOrigemLabel(linha),
      migracaoContaInternaStatus: "OK",
      vencimento_original: linha.dataVencimento,
      vencimento_ajustado_em: null,
      vencimento_ajustado_por: null,
      vencimento_ajuste_motivo: null,
      cancelada_em: null,
      cancelada_por: null,
      cancelamento_motivo: null,
      cancelamento_tipo: null,
      vencimentoOriginal: linha.dataVencimento,
      vencimentoAjustadoEm: null,
      vencimentoAjustadoPor: null,
      vencimentoAjusteMotivo: null,
      canceladaEm: null,
      canceladaPor: null,
      cancelamentoMotivo: null,
      cancelamentoTipo: null,
      matriculaStatus: null,
      matriculaCancelamentoTipo: null,
    },
    contexto_principal: linha.contextoPrincipal as ContextoPrincipal,
    origem_detalhada: mapOrigemDetalhada(linha),
    origem_label: buildOrigemLabel(linha),
    centro_custo: {
      id: linha.centroCustoId,
      codigo: linha.centroCustoCodigo,
      nome: linha.centroCustoNome,
      agrupador: {
        id: null,
        codigo: null,
        nome: null,
      },
      lancamento: {
        id: linha.centroCustoId,
        codigo: linha.centroCustoCodigo,
        nome: linha.centroCustoNome,
      },
    },
    documento_vinculado: linha.faturaContaInternaId
      ? {
          tipo: "FATURA_INTERNA",
          id: linha.faturaContaInternaId,
          label: `Fatura interna #${linha.faturaContaInternaId}`,
        }
      : null,
    trilha_auditavel: trilhaCanonica(linha),
    composicao_fatura_conexao: buildComposicaoDetalhada(linha),
  };
}

function buildCanonicalFilters(input: ContasReceberAuditoriaInput): FiltrosCarteiraCanonica {
  const tipoPeriodo = normalizeContasReceberTipoPeriodo(input.tipoPeriodo);
  const competenciaMesAno =
    input.ano && input.mes && /^(0[1-9]|1[0-2])$/.test(input.mes) ? `${input.ano}-${input.mes}` : null;

  return {
    busca: input.q ?? undefined,
    competencia:
      tipoPeriodo === "MES_ANO"
        ? competenciaMesAno
        : isAnoMes(input.competencia)
          ? input.competencia
          : undefined,
    competenciaInicio: input.competenciaInicio,
    competenciaFim: input.competenciaFim,
    vencimentoInicio: tipoPeriodo === "ENTRE_DATAS" ? input.vencimentoInicio : undefined,
    vencimentoFim: tipoPeriodo === "ENTRE_DATAS" ? input.vencimentoFim : undefined,
    contexto:
      upper(input.contexto) === "ESCOLA" ||
      upper(input.contexto) === "CAFE" ||
      upper(input.contexto) === "LOJA" ||
      upper(input.contexto) === "OUTRO"
        ? (upper(input.contexto) as ContextoPrincipal)
        : null,
  };
}

export async function listarTitulosVencidosCanonicosPorPessoa(
  supabase: SupabaseDbClient,
  pessoaId: number,
  input: ContasReceberAuditoriaInput,
): Promise<CobrancaListaItem[]> {
  const linhas = await listarCarteiraOperacionalCanonica(supabase, {
    ...buildCanonicalFilters(input),
    pessoaId,
  });

  return filtrarLinhasCanonicas(linhas, input)
    .map((linha) => mapLinhaToCobrancaListaItem(linha))
    .sort((left, right) => {
      const byDate = compareNullableDateAsc(left.vencimento, right.vencimento);
      if (byDate !== 0) return byDate;
      if (right.atraso_dias !== left.atraso_dias) return right.atraso_dias - left.atraso_dias;
      return left.cobranca_id - right.cobranca_id;
    });
}

export async function montarPayloadContasReceberVencidasCanonico(
  supabase: SupabaseDbClient,
  input: ContasReceberAuditoriaInput,
  perdasCancelamento: ContasReceberAuditoriaPayload["perdas_cancelamento"] = [],
): Promise<ContasReceberAuditoriaPayload> {
  const visao = normalizeContasReceberVisao(input.visao);
  const tipoPeriodo = normalizeContasReceberTipoPeriodo(input.tipoPeriodo);
  const ordenacao = normalizeContasReceberOrdenacao(input.ordenacao, visao);
  const page = Math.max(input.page ?? 1, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? 50, 1), 200);

  const linhas = await listarCarteiraOperacionalCanonica(supabase, buildCanonicalFilters(input));
  const linhasFiltradas = filtrarLinhasCanonicas(linhas, input);
  const itemsBase = linhasFiltradas.map((linha) => mapLinhaToCobrancaListaItem(linha));
  const itemsOrdenados = ordenarItems(itemsBase, ordenacao);
  const devedores = buildDevedores(itemsBase);
  const paginacao = paginate(itemsOrdenados, page, pageSize);
  const detalheLinha =
    typeof input.detalheCobrancaId === "number"
      ? linhasFiltradas.find((linha) => linha.cobrancaId === input.detalheCobrancaId)
      : undefined;
  const detalhe = buildDetalhe(detalheLinha);

  return {
    resumo: buildResumo(itemsBase),
    top_devedores: devedores.slice(0, 10),
    devedores_lista: devedores,
    metricas_visao: buildMetricasVencidas(itemsBase, devedores),
    contextos_visao: buildContextosVencidos(itemsBase),
    ranking_principal: buildRankingVencidos(devedores),
    cobrancas_lista: paginacao.rows,
    detalhe_cobranca: detalhe,
    composicao_fatura_conexao: null,
    perdas_cancelamento: perdasCancelamento,
    paginacao: {
      page: paginacao.pageAjustada,
      page_size: pageSize,
      total: paginacao.total,
      total_paginas: paginacao.totalPaginas,
    },
    filtros_aplicados: {
      visao,
      tipo_periodo: tipoPeriodo,
      ordenacao,
      q: textOrNull(input.q) ?? "",
      contexto:
        upper(input.contexto) === "ESCOLA" ||
        upper(input.contexto) === "CAFE" ||
        upper(input.contexto) === "LOJA" ||
        upper(input.contexto) === "OUTRO"
          ? (upper(input.contexto) as ContextoPrincipal)
          : null,
      situacao: textOrNull(input.situacao),
      status: textOrNull(input.status),
      bucket: textOrNull(input.bucket),
      competencia: textOrNull(input.competencia),
      competencia_inicio: textOrNull(input.competenciaInicio),
      competencia_fim: textOrNull(input.competenciaFim),
      ano: textOrNull(input.ano),
      mes: textOrNull(input.mes),
      vencimento_inicio: isDateLike(input.vencimentoInicio ?? null) ? input.vencimentoInicio ?? null : null,
      vencimento_fim: isDateLike(input.vencimentoFim ?? null) ? input.vencimentoFim ?? null : null,
    },
  };
}
