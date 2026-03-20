import type { SupabaseClient } from "@supabase/supabase-js";
import { formatarCompetenciaLabel, montarPessoaLabel } from "@/lib/financeiro/creditoConexao/cobrancas";
import type { Database } from "@/types/supabase.generated";

type SupabaseDbClient = SupabaseClient<Database>;
type JsonObject = Record<string, unknown>;
type ContextoCarteiraCanonica = "ESCOLA" | "CAFE" | "LOJA" | "OUTRO";
type StatusOperacionalCanonico = "PAGO" | "PENDENTE" | "VENCIDO";

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
  aluno_id: number | null;
  centro_custo_id: number | null;
  cobranca_id: number | null;
  competencia: string | null;
  composicao_json: Database["public"]["Tables"]["credito_conexao_lancamentos"]["Row"]["composicao_json"];
  conta_conexao_id: number;
  descricao: string | null;
  matricula_id: number | null;
  origem_id: number | null;
  origem_sistema: string;
  referencia_item: string | null;
  valor_centavos: number;
};

type FaturaLancamentoRow = {
  fatura_id: number | null;
  lancamento_id: number | null;
};

type FaturaRow = {
  id: number;
  cobranca_id: number | null;
  conta_conexao_id: number;
  data_vencimento: string | null;
  neofin_invoice_id: string | null;
  periodo_referencia: string;
  status: string;
};

type CentroCustoRow = Database["public"]["Tables"]["centros_custo"]["Row"];
type ContaInternaRow = Database["public"]["Tables"]["credito_conexao_contas"]["Row"];
type MatriculaRow = Pick<Database["public"]["Tables"]["matriculas"]["Row"], "id" | "pessoa_id" | "responsavel_financeiro_id">;
type PessoaRow = Pick<Database["public"]["Tables"]["pessoas"]["Row"], "id" | "nome">;
type TurmaAlunoRow = Pick<
  Database["public"]["Tables"]["turma_aluno"]["Row"],
  "matricula_id" | "aluno_pessoa_id" | "turma_id"
>;

type MetaFaturaPrincipal = {
  contaInternaId: number | null;
  cobrancaFaturaId: number | null;
  dataVencimento: string | null;
  faturaContaInternaId: number | null;
  neofinInvoiceId: string | null;
  status: string | null;
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

export type ItemDetalheContaInterna = {
  lancamentoId: number | null;
  referenciaItem: string | null;
  descricao: string | null;
  valorCentavos: number;
  alunoIds: number[];
  alunoNomes: string[];
  matriculaIds: number[];
  contaInternaId: number | null;
  faturaInternaId: number | null;
  tipoItem: string | null;
};

export type LinhaCarteiraContaInterna = {
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
  statusCobranca: string | null;
  valorCentavos: number;
  valorPagoCentavos: number;
  saldoCentavos: number;
  dataVencimento: string | null;
  dataPagamento: string | null;
  diasAtraso: number;
  statusOperacional: StatusOperacionalCanonico;
  contaInternaId: number | null;
  contaInternaDescricao: string | null;
  contaInternaLabel: string;
  faturaContaInternaId: number | null;
  faturaInternaId: number | null;
  faturaContaInternaStatus: string | null;
  cobrancaFaturaId: number | null;
  neofinInvoiceId: string | null;
  houveGeracaoNeoFin: boolean;
  possuiFaturaInterna: boolean;
  itens: ItemDetalheContaInterna[];
  totalItens: number;
  totalAlunosRelacionados: number;
  possuiMultiplosItens: boolean;
  possuiMultiplosAlunos: boolean;
  chaveConsolidacao: string;
  totalTitulosMesmaConsolidacao: number;
  cobrancaUrl: string;
  faturaUrl: string | null;
  permiteVinculoManual: boolean;
};

export type LinhaCarteiraCanonica = LinhaCarteiraContaInterna;

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
  itens: LinhaCarteiraContaInterna[];
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

function inteiroPositivoOuNull(valor: unknown): number | null {
  const numero = numeroSeguro(valor);
  return numero > 0 ? numero : null;
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

function asJsonObject(valor: unknown): JsonObject | null {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
  return valor as JsonObject;
}

function asJsonObjectArray(valor: unknown): JsonObject[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .map((item) => asJsonObject(item))
    .filter((item): item is JsonObject => Boolean(item));
}

function dedupePositiveInts(values: Array<number | null | undefined>): number[] {
  return Array.from(
    new Set(
      values
        .map((value) => inteiroPositivoOuNull(value))
        .filter((value): value is number => typeof value === "number" && value > 0),
    ),
  );
}

function addPositiveInt(target: Set<number>, value: unknown) {
  const numero = inteiroPositivoOuNull(value);
  if (numero) target.add(numero);
}

function addPositiveIntArray(target: Set<number>, value: unknown) {
  if (!Array.isArray(value)) return;

  for (const item of value) {
    if (typeof item === "object" && item && !Array.isArray(item)) {
      const registro = item as JsonObject;
      addPositiveInt(target, registro.id);
      addPositiveInt(target, registro.pessoa_id);
      addPositiveInt(target, registro.aluno_id);
      addPositiveInt(target, registro.aluno_pessoa_id);
      addPositiveInt(target, registro.matricula_id);
      continue;
    }

    addPositiveInt(target, item);
  }
}

function extrairIdsPorReferencia(referencia: string | null | undefined, tokens: string[]): number[] {
  const texto = textoOuNull(referencia);
  if (!texto) return [];

  const ids = new Set<number>();
  for (const token of tokens) {
    const regex = new RegExp(`${token}(?:_id)?[:#](\\d+)`, "gi");
    for (const match of texto.matchAll(regex)) {
      addPositiveInt(ids, Number(match[1]));
    }
  }

  return Array.from(ids);
}

function extrairMatriculaIdsDeReferencia(referencia: string | null | undefined): number[] {
  return extrairIdsPorReferencia(referencia, ["matricula"]);
}

function extrairAlunoIdsDeReferencia(referencia: string | null | undefined): number[] {
  return extrairIdsPorReferencia(referencia, ["aluno", "pessoa"]);
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
  origemSistema: string | null,
): ContextoCarteiraCanonica {
  const contextos = centroCusto?.contextos_aplicaveis ?? [];
  if (contextos.includes("ESCOLA")) return "ESCOLA";
  if (contextos.includes("CAFE")) return "CAFE";
  if (contextos.includes("LOJA")) return "LOJA";

  const origem = textoOuNull(origemSistema)?.toUpperCase() ?? "";
  if (origem === "CAFE" || origem.includes("CAFE")) return "CAFE";
  if (origem === "LOJA" || origem.includes("LOJA")) return "LOJA";
  if (origem.startsWith("MATRICULA") || origem.includes("FATURA")) return "ESCOLA";
  return "OUTRO";
}

function humanizarToken(valor: string | null | undefined): string | null {
  const texto = textoOuNull(valor);
  if (!texto) return null;

  return texto
    .toLowerCase()
    .split(/[_\s/:-]+/)
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

function descreverContaInterna(conta: ContaInternaRow | undefined): string | null {
  const tipoConta = textoOuNull(conta?.tipo_conta)?.toUpperCase();
  if (tipoConta === "ALUNO") return "Conta interna do aluno";
  if (tipoConta === "COLABORADOR") return "Conta interna do colaborador";

  const descricao = textoOuNull(conta?.descricao_exibicao);
  if (!descricao) return "Conta interna";
  return descricao.replace(/cart(?:a|\u00E3)o\s+conex(?:a|\u00E3)o/gi, "Conta interna");
}

function contaInternaLabel(contaInternaId: number | null): string {
  return contaInternaId ? `Conta interna #${contaInternaId}` : "Conta interna nao vinculada";
}

function resolverTipoItem(lancamento: LancamentoRow, item: JsonObject | null): string | null {
  if (inteiroPositivoOuNull(item?.turma_id)) return "Matricula";

  if (inteiroPositivoOuNull(item?.produto_id)) {
    const origem = textoOuNull(lancamento.origem_sistema)?.toUpperCase() ?? "";
    if (origem.includes("LOJA")) return "Venda loja";
    return "Consumo cafe";
  }

  const origemSistema = textoOuNull(lancamento.origem_sistema)?.toUpperCase() ?? "";
  if (origemSistema.startsWith("MATRICULA")) return "Matricula";
  if (origemSistema.includes("CAFE")) return "Consumo cafe";
  if (origemSistema.includes("LOJA")) return "Venda loja";
  if (origemSistema.includes("AJUSTE")) return "Ajuste";
  if (origemSistema.includes("FATURA")) return "Lancamento da conta interna";
  return humanizarToken(origemSistema);
}

function resolverValorItem(item: JsonObject | null, fallback: number): number {
  const candidatos = [
    inteiroPositivoOuNull(item?.valor_centavos),
    inteiroPositivoOuNull(item?.valor_total_centavos),
    inteiroPositivoOuNull(item?.total_centavos),
  ].filter((valor): valor is number => typeof valor === "number" && valor >= 0);

  if (candidatos.length > 0) return candidatos[0];
  return Math.max(fallback, 0);
}

function resolverDescricaoItem(lancamento: LancamentoRow, item: JsonObject | null, index: number): string | null {
  return (
    textoOuNull(item?.descricao) ??
    textoOuNull(item?.label) ??
    textoOuNull(lancamento.descricao) ??
    `Item ${index + 1}`
  );
}

function extrairMatriculaIdsDeRegistro(registro: JsonObject | null): number[] {
  if (!registro) return [];

  const ids = new Set<number>();
  addPositiveInt(ids, registro.matricula_id);
  addPositiveInt(ids, registro.id_matricula);
  addPositiveIntArray(ids, registro.matricula_ids);
  addPositiveIntArray(ids, registro.matriculas);

  const matricula = asJsonObject(registro.matricula);
  addPositiveInt(ids, matricula?.id);

  return Array.from(ids);
}

function extrairAlunoIdsDeRegistro(registro: JsonObject | null): number[] {
  if (!registro) return [];

  const ids = new Set<number>();
  addPositiveInt(ids, registro.aluno_id);
  addPositiveInt(ids, registro.aluno_pessoa_id);
  addPositiveIntArray(ids, registro.aluno_ids);
  addPositiveIntArray(ids, registro.alunos);
  return Array.from(ids);
}

function coletarMatriculaIdsDeLancamentoBruto(lancamento: LancamentoRow): number[] {
  const ids = new Set<number>();
  addPositiveInt(ids, lancamento.matricula_id);

  const origemSistema = textoOuNull(lancamento.origem_sistema)?.toUpperCase() ?? "";
  if (origemSistema.startsWith("MATRICULA")) {
    addPositiveInt(ids, lancamento.origem_id);
  }

  for (const matriculaId of extrairMatriculaIdsDeReferencia(lancamento.referencia_item)) {
    ids.add(matriculaId);
  }

  const composicao = asJsonObject(lancamento.composicao_json);
  for (const matriculaId of extrairMatriculaIdsDeRegistro(composicao)) {
    ids.add(matriculaId);
  }

  const itens = asJsonObjectArray(composicao?.itens);
  for (const item of itens) {
    for (const matriculaId of extrairMatriculaIdsDeRegistro(item)) {
      ids.add(matriculaId);
    }
  }

  return Array.from(ids);
}

function coletarPessoaIdsDeLancamento(lancamento: LancamentoRow): number[] {
  const ids = new Set<number>();
  addPositiveInt(ids, lancamento.aluno_id);
  for (const alunoId of extrairAlunoIdsDeReferencia(lancamento.referencia_item)) {
    ids.add(alunoId);
  }

  const composicao = asJsonObject(lancamento.composicao_json);
  addPositiveInt(ids, composicao?.aluno_id);
  addPositiveInt(ids, composicao?.aluno_pessoa_id);
  addPositiveIntArray(ids, composicao?.aluno_ids);
  addPositiveIntArray(ids, composicao?.alunos);

  const itens = asJsonObjectArray(composicao?.itens);
  for (const item of itens) {
    addPositiveInt(ids, item.aluno_id);
    addPositiveInt(ids, item.aluno_pessoa_id);
    addPositiveIntArray(ids, item.aluno_ids);
    addPositiveIntArray(ids, item.alunos);
  }

  return Array.from(ids);
}

function nomesDosAlunos(alunoIds: number[], pessoasMap: Map<number, PessoaRow>): string[] {
  return alunoIds.map((id) => textoOuNull(pessoasMap.get(id)?.nome) ?? `Aluno #${id}`);
}

function resolverAlunoIdsPorContaInterna(contaInterna: ContaInternaRow | undefined): number[] {
  const tipoConta = textoOuNull(contaInterna?.tipo_conta)?.toUpperCase();
  if (tipoConta !== "ALUNO") return [];

  return dedupePositiveInts([inteiroPositivoOuNull(contaInterna?.pessoa_titular_id)]);
}

function resolverDetalheItemContaInterna(params: {
  lancamento: LancamentoRow;
  item: JsonObject | null;
  index: number;
  linksPorLancamento: Map<number, number[]>;
  matriculasMap: Map<number, MatriculaRow>;
  turmaAlunoMap: Map<number, TurmaAlunoRow>;
  pessoasMap: Map<number, PessoaRow>;
  contasInternasMap: Map<number, ContaInternaRow>;
}): ItemDetalheContaInterna {
  const { item, lancamento } = params;
  const composicao = asJsonObject(lancamento.composicao_json);
  const possuiItensNaComposicao = asJsonObjectArray(composicao?.itens).length > 0;
  const origemSistema = textoOuNull(lancamento.origem_sistema)?.toUpperCase() ?? "";
  const matriculaIds = new Set<number>([
    ...dedupePositiveInts([lancamento.matricula_id]),
    ...(origemSistema.startsWith("MATRICULA") ? dedupePositiveInts([lancamento.origem_id]) : []),
    ...extrairMatriculaIdsDeReferencia(lancamento.referencia_item),
    ...(!possuiItensNaComposicao || !item ? extrairMatriculaIdsDeRegistro(composicao) : []),
    ...extrairMatriculaIdsDeRegistro(item),
  ]);

  const alunoIds = new Set<number>([
    ...dedupePositiveInts([lancamento.aluno_id]),
    ...extrairAlunoIdsDeReferencia(lancamento.referencia_item),
    ...(!possuiItensNaComposicao || !item ? extrairAlunoIdsDeRegistro(composicao) : []),
    ...extrairAlunoIdsDeRegistro(item),
  ]);

  for (const matriculaId of matriculaIds) {
    const matricula = params.matriculasMap.get(matriculaId);
    addPositiveInt(alunoIds, matricula?.pessoa_id);
    addPositiveInt(alunoIds, params.turmaAlunoMap.get(matriculaId)?.aluno_pessoa_id);
  }

  if (alunoIds.size === 0) {
    const contaInterna = params.contasInternasMap.get(lancamento.conta_conexao_id);
    for (const alunoId of resolverAlunoIdsPorContaInterna(contaInterna)) {
      alunoIds.add(alunoId);
    }
  }

  const alunoIdsOrdenados = Array.from(alunoIds).sort((a, b) => a - b);
  const matriculaIdsOrdenados = Array.from(matriculaIds).sort((a, b) => a - b);
  const faturaInternaId = inteiroPositivoOuNull(params.linksPorLancamento.get(lancamento.id)?.[0]) ?? null;

  return {
    lancamentoId: lancamento.id,
    referenciaItem: textoOuNull(lancamento.referencia_item),
    descricao: resolverDescricaoItem(lancamento, item, params.index),
    valorCentavos: resolverValorItem(item, Math.max(numeroSeguro(lancamento.valor_centavos), 0)),
    alunoIds: alunoIdsOrdenados,
    alunoNomes: nomesDosAlunos(alunoIdsOrdenados, params.pessoasMap),
    matriculaIds: matriculaIdsOrdenados,
    contaInternaId: inteiroPositivoOuNull(lancamento.conta_conexao_id),
    faturaInternaId,
    tipoItem: resolverTipoItem(lancamento, item) ?? (matriculaIdsOrdenados.length > 0 ? "Matricula" : "Lancamento da conta interna"),
  };
}

function montarItensContaInterna(params: {
  lancamentos: LancamentoRow[];
  linksPorLancamento: Map<number, number[]>;
  matriculasMap: Map<number, MatriculaRow>;
  turmaAlunoMap: Map<number, TurmaAlunoRow>;
  pessoasMap: Map<number, PessoaRow>;
  contasInternasMap: Map<number, ContaInternaRow>;
  valorFallbackCentavos: number;
}): ItemDetalheContaInterna[] {
  const itensConsolidados: ItemDetalheContaInterna[] = [];

  for (const lancamento of params.lancamentos) {
    const composicao = asJsonObject(lancamento.composicao_json);
    const itensJson = asJsonObjectArray(composicao?.itens);

    if (itensJson.length > 0) {
      itensJson.forEach((item, index) => {
        itensConsolidados.push({
          ...resolverDetalheItemContaInterna({
            lancamento,
            item,
            index,
            linksPorLancamento: params.linksPorLancamento,
            matriculasMap: params.matriculasMap,
            turmaAlunoMap: params.turmaAlunoMap,
            pessoasMap: params.pessoasMap,
            contasInternasMap: params.contasInternasMap,
          }),
          valorCentavos: resolverValorItem(item, itensJson.length === 1 ? lancamento.valor_centavos : 0),
        });
      });
      continue;
    }

    itensConsolidados.push({
      ...resolverDetalheItemContaInterna({
        lancamento,
        item: null,
        index: 0,
        linksPorLancamento: params.linksPorLancamento,
        matriculasMap: params.matriculasMap,
        turmaAlunoMap: params.turmaAlunoMap,
        pessoasMap: params.pessoasMap,
        contasInternasMap: params.contasInternasMap,
      }),
      descricao: textoOuNull(lancamento.descricao) ?? "Lancamento da conta interna",
      valorCentavos: Math.max(numeroSeguro(lancamento.valor_centavos), 0),
    });
  }

  if (itensConsolidados.length > 0) {
    return itensConsolidados;
  }

  return [
    {
      lancamentoId: null,
      referenciaItem: null,
      descricao: "Composicao da cobranca nao detalhada",
      valorCentavos: Math.max(params.valorFallbackCentavos, 0),
      alunoIds: [],
      alunoNomes: [],
      matriculaIds: [],
      contaInternaId: null,
      faturaInternaId: null,
      tipoItem: "Lancamento da conta interna",
    },
  ];
}

function matchesBusca(linha: LinhaCarteiraContaInterna, busca: string | undefined): boolean {
  const termo = textoOuNull(busca)?.toLowerCase();
  if (!termo) return true;

  const alvo = [
    linha.pessoaNome,
    linha.pessoaLabel,
    linha.contaInternaDescricao ?? "",
    linha.contaInternaLabel,
    linha.competenciaAnoMes ?? "",
    linha.centroCustoCodigo ?? "",
    linha.centroCustoNome ?? "",
    linha.neofinInvoiceId ?? "",
    String(linha.cobrancaId),
    linha.contaInternaId ? String(linha.contaInternaId) : "",
    linha.faturaContaInternaId ? String(linha.faturaContaInternaId) : "",
    linha.cobrancaFaturaId ? String(linha.cobrancaFaturaId) : "",
    ...linha.itens.flatMap((item) => [
      item.descricao ?? "",
      item.referenciaItem ?? "",
      item.tipoItem ?? "",
      ...item.matriculaIds.map((matriculaId) => String(matriculaId)),
      ...item.alunoNomes,
    ]),
  ]
    .join(" ")
    .toLowerCase();

  return alvo.includes(termo);
}

function filtrarPorCompetencia(linha: LinhaCarteiraContaInterna, filtros: FiltrosCarteiraCanonica): boolean {
  if (filtros.competencia && linha.competenciaAnoMes !== filtros.competencia) return false;
  if (filtros.competenciaInicio && (linha.competenciaAnoMes ?? "") < filtros.competenciaInicio) return false;
  if (filtros.competenciaFim && (linha.competenciaAnoMes ?? "") > filtros.competenciaFim) return false;
  return true;
}

function filtrarPorVencimento(linha: LinhaCarteiraContaInterna, filtros: FiltrosCarteiraCanonica): boolean {
  if (filtros.vencimentoInicio && dataValida(linha.dataVencimento) && linha.dataVencimento < filtros.vencimentoInicio) {
    return false;
  }
  if (filtros.vencimentoFim && dataValida(linha.dataVencimento) && linha.dataVencimento > filtros.vencimentoFim) {
    return false;
  }
  if (filtros.vencimentoInicio && !dataValida(linha.dataVencimento)) return false;
  return true;
}

function matchesStatusOperacional(linha: LinhaCarteiraContaInterna, filtro: string | null | undefined): boolean {
  const status = textoOuNull(filtro)?.toUpperCase();
  if (!status || status === "TODOS") return true;
  return linha.statusOperacional === status;
}

function matchesSituacaoNeoFin(linha: LinhaCarteiraContaInterna, filtro: string | null | undefined): boolean {
  const situacao = textoOuNull(filtro)?.toUpperCase();
  if (!situacao || situacao === "TODOS") return true;

  if (situacao === "SEM_FATURA_INTERNA" || situacao === "SEM_FATURA") {
    return !linha.possuiFaturaInterna;
  }

  if (
    situacao === "SEM_COBRANCA_NEOFIN" ||
    situacao === "NEOFIN_NAO_GERADA" ||
    situacao === "FATURA_SEM_NEOFIN"
  ) {
    return linha.possuiFaturaInterna && !linha.houveGeracaoNeoFin;
  }

  if (
    situacao === "COM_COBRANCA_NEOFIN" ||
    situacao === "NEOFIN_GERADA" ||
    situacao === "EM_COBRANCA_NEOFIN"
  ) {
    return linha.houveGeracaoNeoFin;
  }

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
      .select(
        "id,aluno_id,centro_custo_id,cobranca_id,competencia,composicao_json,conta_conexao_id,descricao,matricula_id,origem_id,origem_sistema,referencia_item,valor_centavos",
      )
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
      .select("id,cobranca_id,conta_conexao_id,data_vencimento,neofin_invoice_id,periodo_referencia,status")
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

async function carregarContasInternasMap(
  supabase: SupabaseDbClient,
  contaIds: number[],
): Promise<Map<number, ContaInternaRow>> {
  const rows: ContaInternaRow[] = [];

  for (const chunk of chunkNumbers(contaIds)) {
    const { data, error } = await supabase
      .from("credito_conexao_contas")
      .select("id,descricao_exibicao,pessoa_titular_id,responsavel_financeiro_pessoa_id,tipo_conta")
      .in("id", chunk);

    if (error) {
      throw new Error(`erro_buscar_contas_internas_canonicas:${error.message}`);
    }

    rows.push(...((data ?? []) as ContaInternaRow[]));
  }

  return new Map(rows.map((row) => [row.id, row]));
}

async function carregarMatriculasMap(
  supabase: SupabaseDbClient,
  matriculaIds: number[],
): Promise<Map<number, MatriculaRow>> {
  const rows: MatriculaRow[] = [];

  for (const chunk of chunkNumbers(matriculaIds)) {
    const { data, error } = await supabase
      .from("matriculas")
      .select("id,pessoa_id,responsavel_financeiro_id")
      .in("id", chunk);

    if (error) {
      throw new Error(`erro_buscar_matriculas_canonicas:${error.message}`);
    }

    rows.push(...((data ?? []) as MatriculaRow[]));
  }

  return new Map(rows.map((row) => [row.id, row]));
}

async function carregarTurmaAlunoMap(
  supabase: SupabaseDbClient,
  matriculaIds: number[],
): Promise<Map<number, TurmaAlunoRow>> {
  const rows: TurmaAlunoRow[] = [];

  for (const chunk of chunkNumbers(matriculaIds)) {
    const { data, error } = await supabase
      .from("turma_aluno")
      .select("matricula_id,aluno_pessoa_id,turma_id")
      .in("matricula_id", chunk)
      .order("turma_aluno_id", { ascending: false });

    if (error) {
      throw new Error(`erro_buscar_turma_aluno_canonicos:${error.message}`);
    }

    rows.push(...((data ?? []) as TurmaAlunoRow[]));
  }

  const mapa = new Map<number, TurmaAlunoRow>();
  for (const row of rows) {
    const matriculaId = inteiroPositivoOuNull(row.matricula_id);
    if (!matriculaId || mapa.has(matriculaId)) continue;
    mapa.set(matriculaId, row);
  }

  return mapa;
}

async function carregarPessoasMap(
  supabase: SupabaseDbClient,
  pessoaIds: number[],
): Promise<Map<number, PessoaRow>> {
  const rows: PessoaRow[] = [];

  for (const chunk of chunkNumbers(pessoaIds)) {
    const { data, error } = await supabase
      .from("pessoas")
      .select("id,nome")
      .in("id", chunk);

    if (error) {
      throw new Error(`erro_buscar_pessoas_canonicas:${error.message}`);
    }

    rows.push(...((data ?? []) as PessoaRow[]));
  }

  return new Map(rows.map((row) => [row.id, row]));
}

function escolherFaturaPrincipal(
  lancamentos: LancamentoRow[],
  linksPorLancamento: Map<number, number[]>,
  faturasMap: Map<number, FaturaRow>,
  competencia: string | null,
): MetaFaturaPrincipal {
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
        contaInternaId: numeroSeguro(lancamento.conta_conexao_id) || null,
        fatura: faturas[0] ?? null,
        lancamentoId: lancamento.id,
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
      contaInternaId: null,
      cobrancaFaturaId: null,
      dataVencimento: null,
      faturaContaInternaId: null,
      neofinInvoiceId: null,
      status: null,
    };
  }

  return {
    contaInternaId: principal.fatura?.conta_conexao_id ?? principal.contaInternaId,
    cobrancaFaturaId: inteiroPositivoOuNull(principal.fatura?.cobranca_id),
    dataVencimento: textoOuNull(principal.fatura?.data_vencimento),
    faturaContaInternaId: principal.fatura?.id ?? null,
    neofinInvoiceId: textoOuNull(principal.fatura?.neofin_invoice_id),
    status: textoOuNull(principal.fatura?.status),
  };
}

export async function listarCarteiraOperacionalCanonica(
  supabase: SupabaseDbClient,
  filtros: FiltrosCarteiraCanonica,
): Promise<LinhaCarteiraContaInterna[]> {
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
    .map((item) => inteiroPositivoOuNull(item.fatura_id))
    .filter((item): item is number => typeof item === "number");
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
        ...cobrancas.map((item) => inteiroPositivoOuNull(item.centro_custo_id)),
        ...lancamentos.map((item) => inteiroPositivoOuNull(item.centro_custo_id)),
      ].filter((item): item is number => typeof item === "number"),
    ),
  );
  const contaIds = Array.from(
    new Set(
      [
        ...lancamentos.map((item) => inteiroPositivoOuNull(item.conta_conexao_id)),
        ...Array.from(faturasMap.values()).map((item) => inteiroPositivoOuNull(item.conta_conexao_id)),
      ].filter((item): item is number => typeof item === "number"),
    ),
  );
  const matriculaIds = Array.from(
    new Set(
      lancamentos.flatMap((item) => coletarMatriculaIdsDeLancamentoBruto(item)),
    ),
  );

  const [centrosCustoMap, contasInternasMap, matriculasMap, turmaAlunoMap] = await Promise.all([
    centroCustoIds.length > 0
      ? carregarCentrosCustoMap(supabase, centroCustoIds)
      : Promise.resolve(new Map<number, CentroCustoRow>()),
    contaIds.length > 0
      ? carregarContasInternasMap(supabase, contaIds)
      : Promise.resolve(new Map<number, ContaInternaRow>()),
    matriculaIds.length > 0
      ? carregarMatriculasMap(supabase, matriculaIds)
      : Promise.resolve(new Map<number, MatriculaRow>()),
    matriculaIds.length > 0
      ? carregarTurmaAlunoMap(supabase, matriculaIds)
      : Promise.resolve(new Map<number, TurmaAlunoRow>()),
  ]);

  const pessoaIds = new Set<number>();
  for (const cobranca of cobrancas) {
    addPositiveInt(pessoaIds, cobranca.pessoa_id);
  }
  for (const conta of contasInternasMap.values()) {
    addPositiveInt(pessoaIds, conta.pessoa_titular_id);
    addPositiveInt(pessoaIds, conta.responsavel_financeiro_pessoa_id);
  }
  for (const matricula of matriculasMap.values()) {
    addPositiveInt(pessoaIds, matricula.pessoa_id);
    addPositiveInt(pessoaIds, matricula.responsavel_financeiro_id);
  }
  for (const turmaAluno of turmaAlunoMap.values()) {
    addPositiveInt(pessoaIds, turmaAluno.aluno_pessoa_id);
  }
  for (const lancamento of lancamentos) {
    for (const pessoaId of coletarPessoaIdsDeLancamento(lancamento)) {
      pessoaIds.add(pessoaId);
    }
  }

  const pessoasMap =
    pessoaIds.size > 0
      ? await carregarPessoasMap(supabase, Array.from(pessoaIds))
      : new Map<number, PessoaRow>();

  const todayIso = localIsoDate(new Date());

  const linhas = cobrancas
    .map((cobranca) => {
      const recebimentos = recebimentosMap.get(cobranca.id);
      const valorCentavos = numeroSeguro(cobranca.valor_centavos);
      const valorPagoCentavos = Math.max(0, recebimentos?.totalPagoCentavos ?? 0);
      const saldoCentavos = Math.max(valorCentavos - valorPagoCentavos, 0);
      const lancamentosRelacionados = lancamentosPorCobranca.get(cobranca.id) ?? [];
      const competenciaAnoMes = competenciaValida(cobranca.competencia_ano_mes) ? cobranca.competencia_ano_mes : null;
      const faturaPrincipal = escolherFaturaPrincipal(
        lancamentosRelacionados,
        linksPorLancamento,
        faturasMap,
        competenciaAnoMes,
      );
      const contaInternaId =
        faturaPrincipal.contaInternaId ??
        inteiroPositivoOuNull(lancamentosRelacionados[0]?.conta_conexao_id) ??
        null;
      const contaInterna = contaInternaId ? contasInternasMap.get(contaInternaId) : undefined;
      const centroCustoId =
        inteiroPositivoOuNull(cobranca.centro_custo_id) ??
        inteiroPositivoOuNull(lancamentosRelacionados[0]?.centro_custo_id) ??
        null;
      const centroCusto = centroCustoId ? centrosCustoMap.get(centroCustoId) : undefined;
      const statusOperacional = calcularStatusOperacional({
        valorCentavos,
        valorPagoCentavos,
        dataVencimento: textoOuNull(cobranca.vencimento),
        todayIso,
      });
      const dataVencimento = textoOuNull(cobranca.vencimento);
      const diasAtraso = statusOperacional === "VENCIDO" ? diferencaDias(todayIso, dataVencimento) : 0;
      const responsavelContaId = inteiroPositivoOuNull(contaInterna?.responsavel_financeiro_pessoa_id);
      const titularContaId = inteiroPositivoOuNull(contaInterna?.pessoa_titular_id);
      const pessoaIdCobranca = inteiroPositivoOuNull(cobranca.pessoa_id);
      const pessoaId = responsavelContaId ?? pessoaIdCobranca ?? titularContaId ?? null;
      const pessoaNome =
        textoOuNull(pessoasMap.get(pessoaId ?? -1)?.nome) ??
        textoOuNull(cobranca.pessoas?.nome) ??
        (pessoaId ? `Pessoa #${pessoaId}` : "Pessoa nao identificada");
      const itens = montarItensContaInterna({
        lancamentos: lancamentosRelacionados,
        linksPorLancamento,
        matriculasMap,
        turmaAlunoMap,
        pessoasMap,
        contasInternasMap,
        valorFallbackCentavos: valorCentavos,
      });
      const totalAlunosRelacionados = new Set(itens.flatMap((item) => item.alunoIds)).size;
      const chaveConsolidacao = [
        pessoaId ?? "SEM_PESSOA",
        competenciaAnoMes ?? "SEM_COMPETENCIA",
        contaInternaId ?? "SEM_CONTA_INTERNA",
        faturaPrincipal.faturaContaInternaId ?? "SEM_FATURA_INTERNA",
      ].join(":");

      return {
        cobrancaId: cobranca.id,
        cobrancaFonte: "COBRANCA",
        pessoaId,
        pessoaNome,
        pessoaLabel: montarPessoaLabel(pessoaNome, pessoaId),
        competenciaAnoMes,
        competenciaLabel: formatarCompetenciaLabel(competenciaAnoMes),
        centroCustoId,
        centroCustoCodigo: textoOuNull(centroCusto?.codigo),
        centroCustoNome: textoOuNull(centroCusto?.nome),
        contextoPrincipal: inferirContextoPrincipal(centroCusto, textoOuNull(lancamentosRelacionados[0]?.origem_sistema)),
        statusCobranca: textoOuNull(cobranca.status),
        valorCentavos,
        valorPagoCentavos,
        saldoCentavos,
        dataVencimento,
        dataPagamento: recebimentos?.ultimaDataPagamento ?? textoOuNull(cobranca.data_pagamento),
        diasAtraso,
        statusOperacional,
        contaInternaId,
        contaInternaDescricao: descreverContaInterna(contaInterna),
        contaInternaLabel: contaInternaLabel(contaInternaId),
        faturaContaInternaId: faturaPrincipal.faturaContaInternaId,
        faturaInternaId: faturaPrincipal.faturaContaInternaId,
        faturaContaInternaStatus: faturaPrincipal.status,
        cobrancaFaturaId: faturaPrincipal.cobrancaFaturaId,
        neofinInvoiceId: faturaPrincipal.neofinInvoiceId,
        houveGeracaoNeoFin: Boolean(faturaPrincipal.neofinInvoiceId),
        possuiFaturaInterna: Boolean(faturaPrincipal.faturaContaInternaId),
        itens,
        totalItens: itens.length,
        totalAlunosRelacionados,
        possuiMultiplosItens: itens.length > 1,
        possuiMultiplosAlunos: totalAlunosRelacionados > 1,
        chaveConsolidacao,
        totalTitulosMesmaConsolidacao: 1,
        cobrancaUrl: `/admin/governanca/cobrancas/${cobranca.id}`,
        faturaUrl: faturaPrincipal.faturaContaInternaId
          ? `/admin/financeiro/credito-conexao/faturas/${faturaPrincipal.faturaContaInternaId}`
          : null,
        permiteVinculoManual: !faturaPrincipal.faturaContaInternaId,
      } satisfies LinhaCarteiraContaInterna;
    })
    .filter((linha) => filtrarPorCompetencia(linha, filtros))
    .filter((linha) => filtrarPorVencimento(linha, filtros))
    .filter((linha) => matchesBusca(linha, filtros.busca))
    .filter((linha) => matchesStatusOperacional(linha, filtros.statusOperacional))
    .filter((linha) => matchesSituacaoNeoFin(linha, filtros.situacaoNeoFin))
    .filter((linha) => {
      if (!filtros.contexto) return true;
      return linha.contextoPrincipal === filtros.contexto;
    });

  const totalPorChaveConsolidacao = new Map<string, number>();
  for (const linha of linhas) {
    totalPorChaveConsolidacao.set(
      linha.chaveConsolidacao,
      (totalPorChaveConsolidacao.get(linha.chaveConsolidacao) ?? 0) + 1,
    );
  }

  return linhas
    .map((linha) => ({
      ...linha,
      totalTitulosMesmaConsolidacao: totalPorChaveConsolidacao.get(linha.chaveConsolidacao) ?? 1,
    }))
    .sort((a, b) => {
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
  linhas: LinhaCarteiraContaInterna[],
): ResumoCarteiraOperacionalCanonica {
  return linhas.reduce<ResumoCarteiraOperacionalCanonica>(
    (acc, linha) => {
      acc.previstoCentavos += linha.valorCentavos;
      acc.pagoCentavos += linha.valorPagoCentavos;
      acc.pendenteCentavos += linha.saldoCentavos;

      if (linha.statusOperacional === "VENCIDO") {
        acc.vencidoCentavos += linha.saldoCentavos;
      }

      if (linha.houveGeracaoNeoFin) {
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
  linhas: LinhaCarteiraContaInterna[],
): GrupoCarteiraPorCompetencia[] {
  const mapa = new Map<string, LinhaCarteiraContaInterna[]>();

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
