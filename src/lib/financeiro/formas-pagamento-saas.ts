import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolverContaInternaDoAlunoOuResponsavel,
  resolverContaInternaDoColaborador,
  type ContaInternaResolvida,
} from "@/lib/financeiro/conta-interna";

type SupabaseLike = Pick<SupabaseClient, "from">;

export type ContextoSaas = "CAFE" | "LOJA" | "ESCOLA" | "FINANCEIRO" | "ADMINISTRACAO";
export type CompradorTipoSaas =
  | "NAO_IDENTIFICADO"
  | "ALUNO"
  | "COLABORADOR"
  | "PESSOA_AVULSA";

export type FormaPagamentoFluxoSaas =
  | "DINHEIRO"
  | "PIX"
  | "CARTAO"
  | "CREDIARIO"
  | "CONTA_INTERNA_ALUNO"
  | "CONTA_INTERNA_COLABORADOR";

export type FormaPagamentoSaas = {
  id: number;
  codigo: string;
  nome: string;
  tipo_fluxo: FormaPagamentoFluxoSaas;
  exige_troco: boolean;
  exige_maquininha: boolean;
  exige_bandeira: boolean;
  exige_conta_interna: boolean;
  ativo: boolean;
  descricao_exibicao: string;
  centro_custo_id: number;
  ordem_exibicao: number;
  conta_financeira_id: number | null;
  conta_financeira_codigo: string | null;
  conta_financeira_nome: string | null;
  cartao_maquina_id: number | null;
  cartao_maquina_nome: string | null;
  carteira_tipo: string | null;
};

export type FormaPagamentoSaasElegivel = FormaPagamentoSaas & {
  habilitado: boolean;
  motivo_bloqueio: string | null;
};

export type FormaPagamentoSaasCentralVinculo = {
  centro_custo_id: number;
  contextos: string[];
  conta_financeira_id: number | null;
  conta_financeira_codigo: string | null;
  conta_financeira_nome: string | null;
  cartao_maquina_id: number | null;
  cartao_maquina_nome: string | null;
  carteira_tipo: string | null;
  ordem_exibicao: number;
  ativo: boolean;
};

export type FormaPagamentoSaasCentral = {
  id: number;
  codigo: string;
  nome: string;
  tipo_fluxo: FormaPagamentoFluxoSaas;
  exige_troco: boolean;
  exige_maquininha: boolean;
  exige_bandeira: boolean;
  exige_conta_interna: boolean;
  ativo: boolean;
  contextos: string[];
  centros_custo_ids: number[];
  vinculacoes: FormaPagamentoSaasCentralVinculo[];
};

export type ContaInternaElegibilidadeResponse = {
  elegivel: boolean;
  tipo: "ALUNO" | "COLABORADOR" | null;
  conta_id: number | null;
  titular_pessoa_id: number | null;
  tipo_fatura: "MENSAL" | null;
  destino_liquidacao_fatura:
    | "NEOFIN"
    | "PAGAMENTO_DIRETO_ESCOLA"
    | "INTEGRACAO_FOLHA_MES_SEGUINTE"
    | null;
  permite_parcelamento: boolean;
  motivo: string | null;
  suporte: {
    pode_solicitar: boolean;
    payload: {
      pessoa_id: number | null;
      tipo_conta: "ALUNO" | "COLABORADOR" | null;
      contexto_origem: "CAFE" | "LOJA" | "ESCOLA";
    } | null;
  };
};

const CONTEXTOS: ContextoSaas[] = ["CAFE", "LOJA", "ESCOLA", "FINANCEIRO", "ADMINISTRACAO"];

type CentroCustoRow = Record<string, unknown> & {
  id?: number | string | null;
  codigo?: string | null;
  nome?: string | null;
  contextos_aplicaveis?: unknown;
};

type FormaPagamentoRow = Record<string, unknown> & {
  id?: number | string | null;
  codigo?: string | null;
  nome?: string | null;
  tipo_base?: string | null;
  tipo_fluxo_saas?: string | null;
  exige_troco?: boolean | null;
  exige_maquininha?: boolean | null;
  exige_bandeira?: boolean | null;
  exige_conta_interna?: boolean | null;
  ativo?: boolean | null;
};

type FormaPagamentoContextoRow = Record<string, unknown> & {
  id?: number | string | null;
  centro_custo_id?: number | string | null;
  forma_pagamento_codigo?: string | null;
  descricao_exibicao?: string | null;
  ativo?: boolean | null;
  ordem_exibicao?: number | string | null;
  conta_financeira_id?: number | string | null;
  cartao_maquina_id?: number | string | null;
  carteira_tipo?: string | null;
};

type ContaFinanceiraRow = Record<string, unknown> & {
  id?: number | string | null;
  codigo?: string | null;
  nome?: string | null;
};

type CartaoMaquinaRow = Record<string, unknown> & {
  id?: number | string | null;
  nome?: string | null;
  conta_financeira_id?: number | string | null;
};

type UpsertFormaPagamentoSaasPayload = {
  codigo: string;
  nome: string;
  tipo_fluxo: FormaPagamentoFluxoSaas;
  exige_troco: boolean;
  exige_maquininha: boolean;
  exige_bandeira: boolean;
  exige_conta_interna: boolean;
  contextos: string[];
  centros_custo_ids: number[];
  ativo: boolean;
};

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function upper(value: unknown): string {
  return typeof value === "string"
    ? value
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
    : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item))
    .filter((item): item is string => Boolean(item))
    .map((item) => upper(item));
}

function contextMatchesCentro(contexto: string, centro: CentroCustoRow) {
  const normalized = upper(contexto);
  const contextos = asStringArray(centro.contextos_aplicaveis);
  if (contextos.includes(normalized)) return true;

  const codigo = upper(centro.codigo);
  const nome = upper(centro.nome);
  if (codigo === normalized) return true;
  if (normalized === "FINANCEIRO" && codigo === "FIN") return true;
  return Boolean(nome && nome.includes(normalized));
}

function normalizarCompradorTipo(value: string | null | undefined): CompradorTipoSaas {
  const normalized = upper(value);
  if (normalized === "ALUNO") return "ALUNO";
  if (normalized === "COLABORADOR") return "COLABORADOR";
  if (normalized === "PESSOA_AVULSA" || normalized === "PESSOA") return "PESSOA_AVULSA";
  return "NAO_IDENTIFICADO";
}

function inferTipoFluxoSaas(forma: FormaPagamentoRow, contexto: FormaPagamentoContextoRow): FormaPagamentoFluxoSaas {
  const explicit = upper(forma.tipo_fluxo_saas);
  if (
    explicit === "DINHEIRO" ||
    explicit === "PIX" ||
    explicit === "CARTAO" ||
    explicit === "CREDIARIO" ||
    explicit === "CONTA_INTERNA_ALUNO" ||
    explicit === "CONTA_INTERNA_COLABORADOR"
  ) {
    return explicit;
  }

  const codigo = upper(forma.codigo ?? contexto.forma_pagamento_codigo);
  const tipoBase = upper(forma.tipo_base);
  const carteiraTipo = upper(contexto.carteira_tipo);

  if (codigo === "DINHEIRO") return "DINHEIRO";
  if (codigo === "PIX") return "PIX";
  if (
    codigo === "CARTAO_CONEXAO_ALUNO" ||
    codigo === "CREDITO_ALUNO" ||
    codigo === "CONTA_INTERNA_ALUNO" ||
    carteiraTipo === "ALUNO"
  ) {
    return "CONTA_INTERNA_ALUNO";
  }
  if (
    codigo === "CARTAO_CONEXAO_COLAB" ||
    codigo === "CARTAO_CONEXAO_COLABORADOR" ||
    codigo === "CONTA_INTERNA" ||
    codigo === "CONTA_INTERNA_COLABORADOR" ||
    codigo === "CREDIARIO_COLAB" ||
    carteiraTipo === "COLABORADOR"
  ) {
    return "CONTA_INTERNA_COLABORADOR";
  }
  if (tipoBase === "CREDIARIO") return "CREDIARIO";
  if (tipoBase === "CARTAO" || codigo.includes("CARTAO") || codigo.includes("CREDITO") || codigo.includes("DEBITO")) {
    return "CARTAO";
  }
  return "PIX";
}

function inferExigeTroco(forma: FormaPagamentoRow, fluxo: FormaPagamentoFluxoSaas) {
  return typeof forma.exige_troco === "boolean" ? forma.exige_troco : fluxo === "DINHEIRO";
}

function inferExigeMaquininha(forma: FormaPagamentoRow, fluxo: FormaPagamentoFluxoSaas) {
  return typeof forma.exige_maquininha === "boolean" ? forma.exige_maquininha : fluxo === "CARTAO";
}

function inferExigeBandeira(forma: FormaPagamentoRow, fluxo: FormaPagamentoFluxoSaas) {
  return typeof forma.exige_bandeira === "boolean" ? forma.exige_bandeira : fluxo === "CARTAO";
}

function inferExigeContaInterna(forma: FormaPagamentoRow, fluxo: FormaPagamentoFluxoSaas) {
  return typeof forma.exige_conta_interna === "boolean"
    ? forma.exige_conta_interna
    : fluxo === "CONTA_INTERNA_ALUNO" || fluxo === "CONTA_INTERNA_COLABORADOR";
}

function buildDisplayName(
  contexto: FormaPagamentoContextoRow,
  forma: FormaPagamentoRow,
  fluxo: FormaPagamentoFluxoSaas,
) {
  if (fluxo === "CONTA_INTERNA_ALUNO") return "Conta interna do aluno";
  if (fluxo === "CONTA_INTERNA_COLABORADOR") return "Conta interna do colaborador";
  return asString(contexto.descricao_exibicao) ?? asString(forma.nome) ?? asString(forma.codigo) ?? "Forma de pagamento";
}

function buildCentralName(forma: FormaPagamentoRow, fluxo: FormaPagamentoFluxoSaas) {
  if (fluxo === "CONTA_INTERNA_ALUNO") return "Conta interna do aluno";
  if (fluxo === "CONTA_INTERNA_COLABORADOR") return "Conta interna do colaborador";
  return asString(forma.nome) ?? asString(forma.codigo) ?? "Forma de pagamento";
}

async function resolverCentroCustoPorContexto(
  supabase: SupabaseLike,
  contexto: ContextoSaas,
  centroCustoId: number | null,
): Promise<number> {
  if (centroCustoId) return centroCustoId;

  const { data, error } = await supabase
    .from("centros_custo")
    .select("id,codigo,nome,contextos_aplicaveis,ativo")
    .eq("ativo", true);

  if (error) throw error;

  const centros = ((data ?? []) as CentroCustoRow[]).map((item) => ({
    id: asInt(item.id),
    codigo: upper(item.codigo),
    nome: upper(item.nome),
    contextos: asStringArray(item.contextos_aplicaveis),
  }));

  const found =
    centros.find((item) => item.contextos.includes(contexto)) ??
    centros.find((item) => item.codigo === contexto) ??
    centros.find((item) => item.nome.includes(contexto));

  if (!found?.id) {
    throw new Error(`centro_custo_${contexto.toLowerCase()}_nao_configurado`);
  }

  return found.id;
}

async function carregarMapaFormas(supabase: SupabaseLike, codigos: string[]) {
  if (codigos.length === 0) return new Map<string, FormaPagamentoRow>();
  const { data, error } = await supabase
    .from("formas_pagamento")
    .select("id,codigo,nome,tipo_base,tipo_fluxo_saas,exige_troco,exige_maquininha,exige_bandeira,exige_conta_interna,ativo")
    .in("codigo", codigos);

  if (error) throw error;

  const map = new Map<string, FormaPagamentoRow>();
  for (const item of (data ?? []) as FormaPagamentoRow[]) {
    const codigo = upper(item.codigo);
    if (codigo) map.set(codigo, item);
  }
  return map;
}

async function carregarMapaContasFinanceiras(supabase: SupabaseLike, ids: number[]) {
  const validIds = Array.from(new Set(ids.filter((item) => item > 0)));
  if (validIds.length === 0) return new Map<number, ContaFinanceiraRow>();

  const { data, error } = await supabase
    .from("contas_financeiras")
    .select("id,codigo,nome")
    .in("id", validIds);

  if (error) throw error;

  const map = new Map<number, ContaFinanceiraRow>();
  for (const item of (data ?? []) as ContaFinanceiraRow[]) {
    const id = asInt(item.id);
    if (id) map.set(id, item);
  }
  return map;
}

async function carregarMapaCartaoMaquinas(supabase: SupabaseLike, ids: number[]) {
  const validIds = Array.from(new Set(ids.filter((item) => item > 0)));
  if (validIds.length === 0) return new Map<number, CartaoMaquinaRow>();

  const { data, error } = await supabase
    .from("cartao_maquinas")
    .select("id,nome,conta_financeira_id")
    .in("id", validIds);

  if (error) throw error;

  const map = new Map<number, CartaoMaquinaRow>();
  for (const item of (data ?? []) as CartaoMaquinaRow[]) {
    const id = asInt(item.id);
    if (id) map.set(id, item);
  }
  return map;
}

export async function listarFormasPagamentoPorContexto(params: {
  supabase: SupabaseLike;
  contexto: ContextoSaas;
  centroCustoId?: number | null;
  incluirInativas?: boolean;
}): Promise<{ centro_custo_id: number; itens: FormaPagamentoSaas[] }> {
  const { supabase, contexto, incluirInativas = false } = params;
  const centroCustoId = await resolverCentroCustoPorContexto(supabase, contexto, params.centroCustoId ?? null);

  let query = supabase
    .from("formas_pagamento_contexto")
    .select(
      "id,centro_custo_id,forma_pagamento_codigo,descricao_exibicao,ativo,ordem_exibicao,conta_financeira_id,cartao_maquina_id,carteira_tipo",
    )
    .eq("centro_custo_id", centroCustoId)
    .order("ordem_exibicao", { ascending: true })
    .order("id", { ascending: true });

  if (!incluirInativas) {
    query = query.eq("ativo", true);
  }

  const { data, error } = await query;
  if (error) throw error;

  const contextoRows = (data ?? []) as FormaPagamentoContextoRow[];
  const formasMap = await carregarMapaFormas(
    supabase,
    contextoRows
      .map((item) => asString(item.forma_pagamento_codigo))
      .filter((item): item is string => Boolean(item))
      .map((item) => upper(item)),
  );
  const maquinasMap = await carregarMapaCartaoMaquinas(
    supabase,
    contextoRows
      .map((item) => asInt(item.cartao_maquina_id))
      .filter((item): item is number => Boolean(item)),
  );
  const contasMap = await carregarMapaContasFinanceiras(
    supabase,
    contextoRows
      .flatMap((item) => {
        const maquina = asInt(item.cartao_maquina_id);
        const maquinaContaId = maquina ? asInt(maquinasMap.get(maquina)?.conta_financeira_id) : null;
        return [asInt(item.conta_financeira_id), maquinaContaId];
      })
      .filter((item): item is number => Boolean(item)),
  );

  const itens = contextoRows
    .map((item) => {
      const codigo = upper(item.forma_pagamento_codigo);
      const forma = formasMap.get(codigo) ?? {};
      const tipoFluxo = inferTipoFluxoSaas(forma, item);
      const ordemExibicao = asInt(item.ordem_exibicao) ?? 0;
      const cartaoMaquinaId = asInt(item.cartao_maquina_id);
      const cartaoMaquina = cartaoMaquinaId ? maquinasMap.get(cartaoMaquinaId) ?? null : null;
      const contaFinanceiraId = asInt(item.conta_financeira_id) ?? asInt(cartaoMaquina?.conta_financeira_id);
      const contaFinanceira = contaFinanceiraId ? contasMap.get(contaFinanceiraId) ?? null : null;
      return {
        id: asInt(forma.id) ?? 0,
        codigo: asString(forma.codigo) ?? asString(item.forma_pagamento_codigo) ?? "",
        nome: asString(forma.nome) ?? asString(item.descricao_exibicao) ?? "Forma de pagamento",
        tipo_fluxo: tipoFluxo,
        exige_troco: inferExigeTroco(forma, tipoFluxo),
        exige_maquininha: inferExigeMaquininha(forma, tipoFluxo),
        exige_bandeira: inferExigeBandeira(forma, tipoFluxo),
        exige_conta_interna: inferExigeContaInterna(forma, tipoFluxo),
        ativo: typeof item.ativo === "boolean" ? item.ativo : Boolean(forma.ativo ?? true),
        descricao_exibicao: buildDisplayName(item, forma, tipoFluxo),
        centro_custo_id: asInt(item.centro_custo_id) ?? centroCustoId,
        ordem_exibicao: ordemExibicao,
        conta_financeira_id: contaFinanceiraId,
        conta_financeira_codigo: asString(contaFinanceira?.codigo),
        conta_financeira_nome: asString(contaFinanceira?.nome),
        cartao_maquina_id: cartaoMaquinaId,
        cartao_maquina_nome: asString(cartaoMaquina?.nome),
        carteira_tipo: asString(item.carteira_tipo),
      } satisfies FormaPagamentoSaas;
    })
    .filter((item) => Boolean(item.codigo));

  return { centro_custo_id: centroCustoId, itens };
}

export async function resolverElegibilidadeContaInternaAluno(params: {
  supabase: SupabaseLike;
  compradorPessoaId: number | null;
}) {
  return resolverContaInternaDoAlunoOuResponsavel({
    supabase: params.supabase,
    alunoPessoaId: params.compradorPessoaId,
  });
}

export async function resolverElegibilidadeContaInternaColaborador(params: {
  supabase: SupabaseLike;
  compradorPessoaId: number | null;
}) {
  return resolverContaInternaDoColaborador({
    supabase: params.supabase,
    colaboradorPessoaId: params.compradorPessoaId,
  });
}

function buildContaInternaResponse(
  compradorTipo: CompradorTipoSaas,
  compradorPessoaId: number | null,
  aluno: ContaInternaResolvida,
  colaborador: ContaInternaResolvida,
  contexto: "CAFE" | "LOJA" | "ESCOLA",
): ContaInternaElegibilidadeResponse {
  if (compradorTipo === "ALUNO") {
    return {
      elegivel: aluno.elegivel,
      tipo: "ALUNO",
      conta_id: aluno.conta_id,
      titular_pessoa_id: aluno.titular_pessoa_id,
      tipo_fatura: aluno.tipo_fatura,
      destino_liquidacao_fatura: aluno.destino_liquidacao_fatura,
      permite_parcelamento: aluno.permite_parcelamento,
      motivo: aluno.motivo,
      suporte: {
        pode_solicitar: !aluno.elegivel && Boolean(compradorPessoaId),
        payload: compradorPessoaId
          ? { pessoa_id: compradorPessoaId, tipo_conta: "ALUNO", contexto_origem: contexto }
          : null,
      },
    };
  }

  if (compradorTipo === "COLABORADOR") {
    return {
      elegivel: colaborador.elegivel,
      tipo: "COLABORADOR",
      conta_id: colaborador.conta_id,
      titular_pessoa_id: colaborador.titular_pessoa_id,
      tipo_fatura: colaborador.tipo_fatura,
      destino_liquidacao_fatura: colaborador.destino_liquidacao_fatura,
      permite_parcelamento: colaborador.permite_parcelamento,
      motivo: colaborador.motivo,
      suporte: {
        pode_solicitar: !colaborador.elegivel && Boolean(compradorPessoaId),
        payload: compradorPessoaId
          ? { pessoa_id: compradorPessoaId, tipo_conta: "COLABORADOR", contexto_origem: contexto }
          : null,
      },
    };
  }

  return {
    elegivel: false,
    tipo: null,
    conta_id: null,
    titular_pessoa_id: null,
    tipo_fatura: null,
    destino_liquidacao_fatura: null,
    permite_parcelamento: false,
    motivo: "Conta interna disponivel apenas para aluno ou colaborador identificado.",
    suporte: {
      pode_solicitar: false,
      payload: null,
    },
  };
}

export async function listarFormasPagamentoElegiveis(params: {
  supabase: SupabaseLike;
  contexto: "CAFE" | "LOJA" | "ESCOLA";
  compradorPessoaId: number | null;
  compradorTipo: string | null | undefined;
  centroCustoId?: number | null;
}): Promise<{
  centro_custo_id: number;
  comprador: { pessoa_id: number | null; tipo: CompradorTipoSaas };
  conta_interna: ContaInternaElegibilidadeResponse;
  opcoes: FormaPagamentoSaasElegivel[];
}> {
  const compradorTipo = normalizarCompradorTipo(params.compradorTipo);
  const { centro_custo_id, itens } = await listarFormasPagamentoPorContexto({
    supabase: params.supabase,
    contexto: params.contexto,
    centroCustoId: params.centroCustoId ?? null,
  });

  const [contaAluno, contaColaborador] = await Promise.all([
    compradorTipo === "ALUNO"
      ? resolverElegibilidadeContaInternaAluno({
          supabase: params.supabase,
          compradorPessoaId: params.compradorPessoaId,
        })
      : Promise.resolve<ContaInternaResolvida>({
          elegivel: false,
          tipo: "ALUNO",
          tipo_titular: "ALUNO",
          conta_id: null,
          titular_pessoa_id: null,
          responsavel_financeiro_pessoa_id: null,
          dia_vencimento: null,
          tipo_fatura: "MENSAL",
          tipo_liquidacao: "FATURA_MENSAL",
          destino_liquidacao_fatura: "NEOFIN",
          permite_parcelamento: false,
          motivo: "Nao se aplica.",
          descricao: null,
        }),
    compradorTipo === "COLABORADOR"
      ? resolverElegibilidadeContaInternaColaborador({
          supabase: params.supabase,
          compradorPessoaId: params.compradorPessoaId,
        })
      : Promise.resolve<ContaInternaResolvida>({
          elegivel: false,
          tipo: "COLABORADOR",
          tipo_titular: "COLABORADOR",
          conta_id: null,
          titular_pessoa_id: null,
          responsavel_financeiro_pessoa_id: null,
          dia_vencimento: null,
          tipo_fatura: "MENSAL",
          tipo_liquidacao: "FATURA_MENSAL",
          destino_liquidacao_fatura: "INTEGRACAO_FOLHA_MES_SEGUINTE",
          permite_parcelamento: false,
          motivo: "Nao se aplica.",
          descricao: null,
        }),
  ]);

  const contaInterna = buildContaInternaResponse(
    compradorTipo,
    params.compradorPessoaId,
    contaAluno,
    contaColaborador,
    params.contexto,
  );

  const opcoes = itens.map((item) => {
    let motivoBloqueio: string | null = null;

    if (item.tipo_fluxo === "CONTA_INTERNA_ALUNO") {
      if (compradorTipo !== "ALUNO") {
        motivoBloqueio = "Disponivel apenas para aluno identificado.";
      } else if (!contaAluno.elegivel) {
        motivoBloqueio = contaAluno.motivo ?? "Aluno sem conta interna ativa.";
      }
    }

    if (item.tipo_fluxo === "CONTA_INTERNA_COLABORADOR") {
      if (compradorTipo !== "COLABORADOR") {
        motivoBloqueio = "Disponivel apenas para colaborador identificado.";
      } else if (!contaColaborador.elegivel) {
        motivoBloqueio = contaColaborador.motivo ?? "Colaborador sem conta interna ativa.";
      }
    }

    if (
      (item.tipo_fluxo === "CONTA_INTERNA_ALUNO" || item.tipo_fluxo === "CONTA_INTERNA_COLABORADOR") &&
      compradorTipo === "NAO_IDENTIFICADO"
    ) {
      motivoBloqueio = "Comprador nao identificado precisa pagar no ato.";
    }

    if (item.tipo_fluxo === "CREDIARIO" && params.contexto === "CAFE") {
      motivoBloqueio = motivoBloqueio ?? "Crediario ainda nao esta operacional no Cafe.";
    }

    return {
      ...item,
      habilitado: motivoBloqueio === null && item.ativo,
      motivo_bloqueio: motivoBloqueio,
    } satisfies FormaPagamentoSaasElegivel;
  });

  return {
    centro_custo_id,
    comprador: {
      pessoa_id: params.compradorPessoaId,
      tipo: compradorTipo,
    },
    conta_interna: contaInterna,
    opcoes,
  };
}

export function calcularTrocoDinheiro(params: {
  totalCentavos: number;
  valorRecebidoCentavos: number | null;
}) {
  const total = Math.max(0, params.totalCentavos);
  const recebido = params.valorRecebidoCentavos ?? 0;
  if (recebido < total) {
    return {
      ok: false,
      troco_centavos: null,
      motivo: "valor_recebido_insuficiente",
    };
  }

  return {
    ok: true,
    troco_centavos: recebido - total,
    motivo: null,
  };
}

export function validarFormaPagamentoSaas(params: {
  forma: FormaPagamentoSaas | FormaPagamentoSaasElegivel;
  compradorTipo: CompradorTipoSaas;
  contaInterna: ContaInternaElegibilidadeResponse;
  maquininhaId?: number | null;
  valorRecebidoCentavos?: number | null;
  totalCentavos?: number;
}) {
  const erros: string[] = [];
  const totalCentavos = Math.max(0, params.totalCentavos ?? 0);

  if (params.forma.exige_maquininha && !params.maquininhaId) {
    erros.push("maquininha_obrigatoria");
  }

  if (params.forma.exige_conta_interna && !params.contaInterna.elegivel) {
    erros.push("conta_interna_nao_elegivel");
  }

  if (params.forma.tipo_fluxo === "CONTA_INTERNA_ALUNO" && params.compradorTipo !== "ALUNO") {
    erros.push("conta_interna_aluno_exige_aluno");
  }

  if (
    params.forma.tipo_fluxo === "CONTA_INTERNA_COLABORADOR" &&
    params.compradorTipo !== "COLABORADOR"
  ) {
    erros.push("conta_interna_colaborador_exige_colaborador");
  }

  const troco =
    params.forma.tipo_fluxo === "DINHEIRO"
      ? calcularTrocoDinheiro({
          totalCentavos,
          valorRecebidoCentavos: params.valorRecebidoCentavos ?? null,
        })
      : { ok: true, troco_centavos: null, motivo: null };

  if (!troco.ok && troco.motivo) {
    erros.push(troco.motivo);
  }

  return {
    ok: erros.length === 0,
    erros,
    troco_centavos: troco.troco_centavos,
  };
}

export async function listarFormasPagamentoCentrais(
  supabase: SupabaseLike,
): Promise<FormaPagamentoSaasCentral[]> {
  const [
    formasResult,
    { data: contextoData, error: contextoError },
    { data: centrosData, error: centrosError },
    { data: contasData, error: contasError },
    { data: maquinasData, error: maquinasError },
  ] = await Promise.all([
    supabase
      .from("formas_pagamento")
      .select(
        "id,codigo,nome,tipo_base,tipo_fluxo_saas,exige_troco,exige_maquininha,exige_bandeira,exige_conta_interna,ativo",
      )
      .order("nome", { ascending: true }),
    supabase
      .from("formas_pagamento_contexto")
      .select("forma_pagamento_codigo,centro_custo_id,ativo")
      .eq("ativo", true),
    supabase
      .from("centros_custo")
      .select("id,codigo,nome,contextos_aplicaveis,ativo")
      .eq("ativo", true),
    supabase
      .from("contas_financeiras")
      .select("id,codigo,nome"),
    supabase
      .from("cartao_maquinas")
      .select("id,nome"),
  ]);

  let formasData = formasResult.data;
  let formasError = formasResult.error;
  if (formasError) {
    console.warn("[FORMAS_PAGAMENTO][CENTRAIS][FALLBACK_LEGADO]", formasError);
    const legacyResult = await supabase
      .from("formas_pagamento")
      .select("id,codigo,nome,tipo_base,ativo")
      .order("nome", { ascending: true });
    formasData = legacyResult.data;
    formasError = legacyResult.error;
  }

  if (formasError) throw formasError;
  if (contextoError) throw contextoError;
  if (centrosError) throw centrosError;
  if (contasError) throw contasError;
  if (maquinasError) throw maquinasError;

  const contasMap = new Map<number, ContaFinanceiraRow>();
  for (const item of (contasData ?? []) as ContaFinanceiraRow[]) {
    const id = asInt(item.id);
    if (id) contasMap.set(id, item);
  }

  const maquinasMap = new Map<number, CartaoMaquinaRow>();
  for (const item of (maquinasData ?? []) as CartaoMaquinaRow[]) {
    const id = asInt(item.id);
    if (id) maquinasMap.set(id, item);
  }

  const centrosMap = new Map<number, string[]>();
  for (const centro of (centrosData ?? []) as CentroCustoRow[]) {
    const id = asInt(centro.id);
    if (!id) continue;
    const contextos = CONTEXTOS.filter((contexto) => contextMatchesCentro(contexto, centro));
    centrosMap.set(id, contextos);
  }

  const contextoByCodigo = new Map<
    string,
    { centros: Set<number>; contextos: Set<string>; vinculacoes: FormaPagamentoSaasCentralVinculo[] }
  >();
  for (const item of (contextoData ?? []) as FormaPagamentoContextoRow[]) {
    const codigo = upper(item.forma_pagamento_codigo);
    const centroId = asInt(item.centro_custo_id);
    if (!codigo || !centroId) continue;
    const cartaoMaquinaId = asInt(item.cartao_maquina_id);
    const cartaoMaquina = cartaoMaquinaId ? maquinasMap.get(cartaoMaquinaId) ?? null : null;
    const contaFinanceiraId = asInt(item.conta_financeira_id);
    const contaFinanceira = contaFinanceiraId ? contasMap.get(contaFinanceiraId) ?? null : null;
    const current = contextoByCodigo.get(codigo) ?? {
      centros: new Set<number>(),
      contextos: new Set<string>(),
      vinculacoes: [],
    };
    current.centros.add(centroId);
    for (const contexto of centrosMap.get(centroId) ?? []) {
      current.contextos.add(contexto);
    }
    current.vinculacoes.push({
      centro_custo_id: centroId,
      contextos: (centrosMap.get(centroId) ?? []).slice().sort(),
      conta_financeira_id: contaFinanceiraId,
      conta_financeira_codigo: asString(contaFinanceira?.codigo),
      conta_financeira_nome: asString(contaFinanceira?.nome),
      cartao_maquina_id: cartaoMaquinaId,
      cartao_maquina_nome: asString(cartaoMaquina?.nome),
      carteira_tipo: asString(item.carteira_tipo),
      ordem_exibicao: asInt(item.ordem_exibicao) ?? 0,
      ativo: typeof item.ativo === "boolean" ? item.ativo : true,
    });
    contextoByCodigo.set(codigo, current);
  }

  return ((formasData ?? []) as FormaPagamentoRow[]).map((forma) => {
    const codigo = upper(forma.codigo);
    const meta = contextoByCodigo.get(codigo) ?? {
      centros: new Set<number>(),
      contextos: new Set<string>(),
      vinculacoes: [],
    };
    const tipoFluxo = inferTipoFluxoSaas(forma, {});
    return {
      id: asInt(forma.id) ?? 0,
      codigo: asString(forma.codigo) ?? "",
      nome: buildCentralName(forma, tipoFluxo),
      tipo_fluxo: tipoFluxo,
      exige_troco: inferExigeTroco(forma, tipoFluxo),
      exige_maquininha: inferExigeMaquininha(forma, tipoFluxo),
      exige_bandeira: inferExigeBandeira(forma, tipoFluxo),
      exige_conta_interna: inferExigeContaInterna(forma, tipoFluxo),
      ativo: typeof forma.ativo === "boolean" ? forma.ativo : true,
      contextos: Array.from(meta.contextos).sort(),
      centros_custo_ids: Array.from(meta.centros).sort((a, b) => a - b),
      vinculacoes: meta.vinculacoes.sort((a, b) => {
        if (a.centro_custo_id !== b.centro_custo_id) return a.centro_custo_id - b.centro_custo_id;
        return a.ordem_exibicao - b.ordem_exibicao;
      }),
    } satisfies FormaPagamentoSaasCentral;
  });
}

export async function upsertFormaPagamentoSaas(params: {
  supabase: SupabaseLike;
  payload: UpsertFormaPagamentoSaasPayload;
}) {
  const { supabase, payload } = params;
  const codigo = upper(payload.codigo);
  const tipoFluxo = upper(payload.tipo_fluxo) as FormaPagamentoFluxoSaas;

  const { data: formaAtual, error: formaAtualError } = await supabase
    .from("formas_pagamento")
    .select("id,codigo")
    .eq("codigo", codigo)
    .maybeSingle();

  if (formaAtualError) throw formaAtualError;

  const tipoBase =
    tipoFluxo === "DINHEIRO"
      ? "DINHEIRO"
      : tipoFluxo === "PIX"
        ? "PIX"
        : tipoFluxo === "CREDIARIO"
          ? "CREDIARIO"
          : tipoFluxo === "CARTAO"
            ? "CARTAO"
            : "CARTAO_CONEXAO";

  const formaPayload = {
    codigo,
    nome: payload.nome.trim(),
    tipo_base: tipoBase,
    tipo_fluxo_saas: tipoFluxo,
    exige_troco: payload.exige_troco,
    exige_maquininha: payload.exige_maquininha,
    exige_bandeira: payload.exige_bandeira,
    exige_conta_interna: payload.exige_conta_interna,
    ativo: payload.ativo,
    updated_at: new Date().toISOString(),
  };

  if (formaAtual?.id) {
    let { error } = await supabase.from("formas_pagamento").update(formaPayload).eq("id", formaAtual.id);
    if (error && /tipo_fluxo_saas|exige_troco|exige_maquininha|exige_bandeira|exige_conta_interna/i.test(error.message)) {
      console.warn("[FORMAS_PAGAMENTO][UPSERT][FALLBACK_LEGADO_UPDATE]", error);
      error = (
        await supabase.from("formas_pagamento").update({
          codigo,
          nome: payload.nome.trim(),
          tipo_base: tipoBase,
          ativo: payload.ativo,
          updated_at: new Date().toISOString(),
        }).eq("id", formaAtual.id)
      ).error;
    }
    if (error) throw error;
  } else {
    let { error } = await supabase.from("formas_pagamento").insert({
      ...formaPayload,
      created_at: new Date().toISOString(),
    });
    if (error && /tipo_fluxo_saas|exige_troco|exige_maquininha|exige_bandeira|exige_conta_interna/i.test(error.message)) {
      console.warn("[FORMAS_PAGAMENTO][UPSERT][FALLBACK_LEGADO_INSERT]", error);
      error = (
        await supabase.from("formas_pagamento").insert({
          codigo,
          nome: payload.nome.trim(),
          tipo_base: tipoBase,
          ativo: payload.ativo,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      ).error;
    }
    if (error) throw error;
  }

  const { data: centrosData, error: centrosError } = await supabase
    .from("centros_custo")
    .select("id,contextos_aplicaveis,ativo")
    .eq("ativo", true);

  if (centrosError) throw centrosError;

  const contextos = payload.contextos.map((item) => upper(item));
  const centroIdsContexto = ((centrosData ?? []) as CentroCustoRow[])
    .filter((item) => contextos.some((contexto) => contextMatchesCentro(contexto, item)))
    .map((item) => asInt(item.id))
    .filter((item): item is number => Boolean(item));

  const centroIds = Array.from(new Set([...payload.centros_custo_ids, ...centroIdsContexto]));

  const { data: contextoAtual, error: contextoAtualError } = await supabase
    .from("formas_pagamento_contexto")
    .select("id,centro_custo_id")
    .eq("forma_pagamento_codigo", codigo);

  if (contextoAtualError) throw contextoAtualError;

  const existentes = new Map<number, number>();
  for (const item of (contextoAtual ?? []) as FormaPagamentoContextoRow[]) {
    const id = asInt(item.id);
    const centroId = asInt(item.centro_custo_id);
    if (id && centroId) existentes.set(centroId, id);
  }

  for (const centroId of centroIds) {
    const rowPayload = {
      centro_custo_id: centroId,
      forma_pagamento_codigo: codigo,
      descricao_exibicao:
        tipoFluxo === "CONTA_INTERNA_ALUNO"
          ? "Conta interna do aluno"
          : tipoFluxo === "CONTA_INTERNA_COLABORADOR"
            ? "Conta interna do colaborador"
            : payload.nome.trim(),
      ativo: payload.ativo,
      ordem_exibicao: 0,
      carteira_tipo:
        tipoFluxo === "CONTA_INTERNA_ALUNO"
          ? "ALUNO"
          : tipoFluxo === "CONTA_INTERNA_COLABORADOR"
            ? "COLABORADOR"
            : null,
      updated_at: new Date().toISOString(),
    };

    const existingId = existentes.get(centroId);
    if (existingId) {
      const { error } = await supabase
        .from("formas_pagamento_contexto")
        .update(rowPayload)
        .eq("id", existingId);
      if (error) throw error;
      continue;
    }

    const { error } = await supabase.from("formas_pagamento_contexto").insert({
      ...rowPayload,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  const centrosParaDesativar = Array.from(existentes.keys()).filter((item) => !centroIds.includes(item));
  if (centrosParaDesativar.length > 0) {
    const { error } = await supabase
      .from("formas_pagamento_contexto")
      .update({
        ativo: false,
        updated_at: new Date().toISOString(),
      })
      .eq("forma_pagamento_codigo", codigo)
      .in("centro_custo_id", centrosParaDesativar);
    if (error) throw error;
  }

  return { codigo };
}
