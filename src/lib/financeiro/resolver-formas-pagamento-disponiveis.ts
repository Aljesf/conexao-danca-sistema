import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolverContaInternaDoAlunoOuResponsavel,
  resolverContaInternaDoColaborador,
  type ContaInternaResolvida,
} from "@/lib/financeiro/conta-interna";

type SupabaseLike = Pick<SupabaseClient, "from">;

export type ContextoPagamento = "CAFE" | "LOJA" | "ESCOLA" | "FINANCEIRO" | "ADMINISTRACAO";
export type CompradorTipoPagamento =
  | "NAO_IDENTIFICADO"
  | "ALUNO"
  | "COLABORADOR"
  | "PESSOA_AVULSA";

export type TipoFluxoPagamento =
  | "DINHEIRO"
  | "PIX"
  | "CARTAO"
  | "CREDIARIO"
  | "CONTA_INTERNA_ALUNO"
  | "CONTA_INTERNA_COLABORADOR";

export type FormaPagamentoDisponivel = {
  id: number | null;
  codigo: string;
  nome: string;
  descricao_exibicao: string;
  tipo_fluxo: TipoFluxoPagamento;
  exige_troco: boolean;
  exige_maquininha: boolean;
  exige_bandeira: boolean;
  exige_conta_interna: boolean;
  ativo: boolean;
  habilitado: boolean;
  motivo_bloqueio: string | null;
  conta_financeira_id: number | null;
  cartao_maquina_id: number | null;
  carteira_tipo: string | null;
  origem: "SAAS" | "LEGADO";
};

export type ContaInternaElegibilidade = {
  elegivel: boolean;
  tipo: "ALUNO" | "COLABORADOR" | null;
  conta_id: number | null;
  titular_pessoa_id: number | null;
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

export type ResolverFormasPagamentoResult = {
  ok: boolean;
  erro_controlado: string | null;
  detalhe: string | null;
  centro_custo_id: number | null;
  comprador: {
    pessoa_id: number | null;
    tipo: CompradorTipoPagamento;
  };
  conta_interna: ContaInternaElegibilidade;
  opcoes: FormaPagamentoDisponivel[];
};

type CentroCustoRow = Record<string, unknown>;
type FormaPagamentoContextoRow = Record<string, unknown>;
type FormaPagamentoLegadoRow = Record<string, unknown>;
type CartaoMaquinaRow = Record<string, unknown>;
type CartaoRegraRow = Record<string, unknown>;

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

function normalizarCompradorTipo(value: string | null | undefined): CompradorTipoPagamento {
  const normalized = upper(value);
  if (normalized === "ALUNO") return "ALUNO";
  if (normalized === "COLABORADOR") return "COLABORADOR";
  if (normalized === "PESSOA_AVULSA" || normalized === "PESSOA") return "PESSOA_AVULSA";
  return "NAO_IDENTIFICADO";
}

function contextFallbacks(contexto: ContextoPagamento) {
  switch (contexto) {
    case "CAFE":
      return ["CAFE", "BALLET CAFE"];
    case "LOJA":
      return ["LOJA"];
    case "ESCOLA":
      return ["ESCOLA"];
    case "FINANCEIRO":
      return ["FINANCEIRO", "FIN"];
    default:
      return [contexto];
  }
}

async function resolverCentroCustoPorContexto(
  supabase: SupabaseLike,
  contexto: ContextoPagamento,
  centroCustoId?: number | null,
): Promise<number | null> {
  if (centroCustoId && centroCustoId > 0) return centroCustoId;

  const { data, error } = await supabase
    .from("centros_custo")
    .select("id,codigo,nome,contextos_aplicaveis,ativo")
    .eq("ativo", true);

  if (error) {
    console.error("[FORMAS_PAGAMENTO][CENTRO_CUSTO][ERRO]", error);
    return null;
  }

  const fallbacks = contextFallbacks(contexto);
  const centros = ((data ?? []) as CentroCustoRow[]).map((item) => ({
    id: asInt(item.id),
    codigo: upper(item.codigo),
    nome: upper(item.nome),
    contextos: asStringArray(item.contextos_aplicaveis),
  }));

  const found =
    centros.find((item) => item.contextos.includes(contexto)) ??
    centros.find((item) => item.codigo && fallbacks.includes(item.codigo)) ??
    centros.find((item) => item.nome && fallbacks.some((fallback) => item.nome.includes(fallback))) ??
    null;

  return found?.id ?? null;
}

function inferTipoFluxo(
  forma: FormaPagamentoLegadoRow,
  contexto: FormaPagamentoContextoRow,
  explicit?: string | null,
): TipoFluxoPagamento {
  const fluxoExplicito = upper(explicit);
  if (
    fluxoExplicito === "DINHEIRO" ||
    fluxoExplicito === "PIX" ||
    fluxoExplicito === "CARTAO" ||
    fluxoExplicito === "CREDIARIO" ||
    fluxoExplicito === "CONTA_INTERNA_ALUNO" ||
    fluxoExplicito === "CONTA_INTERNA_COLABORADOR"
  ) {
    return fluxoExplicito;
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
  if (tipoBase === "CARTAO" || codigo.includes("CREDITO") || codigo.includes("DEBITO") || codigo.includes("CARTAO")) {
    return "CARTAO";
  }
  return "PIX";
}

function resolveDisplayName(
  forma: FormaPagamentoLegadoRow,
  contexto: FormaPagamentoContextoRow,
  tipoFluxo: TipoFluxoPagamento,
) {
  if (tipoFluxo === "CONTA_INTERNA_ALUNO") return "Conta interna do aluno";
  if (tipoFluxo === "CONTA_INTERNA_COLABORADOR") return "Conta interna do colaborador";
  return asString(contexto.descricao_exibicao) ?? asString(forma.nome) ?? asString(forma.codigo) ?? "Forma de pagamento";
}

function inferLogicalCode(codigo: string, tipoFluxo: TipoFluxoPagamento) {
  if (tipoFluxo === "CONTA_INTERNA_ALUNO") return "CONTA_INTERNA_ALUNO";
  if (tipoFluxo === "CONTA_INTERNA_COLABORADOR") return "CONTA_INTERNA_COLABORADOR";
  return upper(codigo);
}

async function carregarMaquininhasValidas(
  supabase: SupabaseLike,
  centroCustoId: number,
  maquinaIdsPreferidas: number[],
) {
  const filtrosIds = Array.from(new Set(maquinaIdsPreferidas.filter((item) => item > 0)));
  let maquinasQuery = supabase
    .from("cartao_maquinas")
    .select("id,centro_custo_id,ativo")
    .eq("ativo", true)
    .eq("centro_custo_id", centroCustoId);

  if (filtrosIds.length > 0) {
    maquinasQuery = maquinasQuery.in("id", filtrosIds);
  }

  const { data: maquinasData, error: maquinasError } = await maquinasQuery;
  if (maquinasError) {
    console.error("[FORMAS_PAGAMENTO][MAQUININHAS][ERRO]", maquinasError);
    return new Map<number, number>();
  }

  const maquinas = (maquinasData ?? []) as CartaoMaquinaRow[];
  const machineIds = maquinas
    .map((item) => asInt(item.id))
    .filter((item): item is number => Boolean(item));

  if (machineIds.length === 0) return new Map<number, number>();

  const { data: regrasData, error: regrasError } = await supabase
    .from("cartao_regras_operacao")
    .select("id,maquina_id,ativo")
    .in("maquina_id", machineIds)
    .eq("ativo", true);

  if (regrasError) {
    console.error("[FORMAS_PAGAMENTO][REGRAS_CARTAO][ERRO]", regrasError);
    return new Map<number, number>();
  }

  const regras = new Map<number, number>();
  for (const regra of (regrasData ?? []) as CartaoRegraRow[]) {
    const maquinaId = asInt(regra.maquina_id);
    const regraId = asInt(regra.id);
    if (maquinaId && regraId && !regras.has(maquinaId)) {
      regras.set(maquinaId, regraId);
    }
  }

  return regras;
}

type ResolverFormasBaseParams = {
  supabase: SupabaseLike;
  contexto: ContextoPagamento;
  centroCustoId?: number | null;
};

async function carregarContextoELegado(
  params: ResolverFormasBaseParams,
  selectFormas: string,
) {
  const centroCustoId = await resolverCentroCustoPorContexto(
    params.supabase,
    params.contexto,
    params.centroCustoId ?? null,
  );
  if (!centroCustoId) {
    return {
      centro_custo_id: null,
      opcoes: [] as FormaPagamentoDisponivel[],
      detalhe: "centro_custo_nao_configurado",
    };
  }

  const { data: contextoData, error: contextoError } = await params.supabase
    .from("formas_pagamento_contexto")
    .select(
      "id,centro_custo_id,forma_pagamento_codigo,descricao_exibicao,ativo,ordem_exibicao,conta_financeira_id,cartao_maquina_id,carteira_tipo",
    )
    .eq("centro_custo_id", centroCustoId)
    .eq("ativo", true)
    .order("ordem_exibicao", { ascending: true })
    .order("id", { ascending: true });

  if (contextoError) {
    throw contextoError;
  }

  const contextoRows = ((contextoData ?? []) as FormaPagamentoContextoRow[]).filter((item) =>
    Boolean(asString(item.forma_pagamento_codigo)),
  );
  const codigos = Array.from(
    new Set(
      contextoRows
        .map((item) => asString(item.forma_pagamento_codigo))
        .filter((item): item is string => Boolean(item))
        .map((item) => upper(item)),
    ),
  );

  if (codigos.length === 0) {
    return {
      centro_custo_id: centroCustoId,
      opcoes: [] as FormaPagamentoDisponivel[],
      detalhe: null,
    };
  }

  const { data: formasData, error: formasError } = await params.supabase
    .from("formas_pagamento")
    .select(selectFormas)
    .in("codigo", codigos);

  if (formasError) {
    throw formasError;
  }

  const formasMap = new Map<string, FormaPagamentoLegadoRow>();
  for (const item of ((formasData ?? []) as unknown as FormaPagamentoLegadoRow[])) {
    const codigo = upper(item.codigo);
    if (codigo) formasMap.set(codigo, item);
  }

  const regrasPorMaquina = await carregarMaquininhasValidas(
    params.supabase,
    centroCustoId,
    contextoRows.map((item) => asInt(item.cartao_maquina_id)).filter((item): item is number => Boolean(item)),
  );
  const primeiraMaquinaValida = Array.from(regrasPorMaquina.keys())[0] ?? null;

  const opcoes = contextoRows.map((item) => {
    const codigoOriginal = asString(item.forma_pagamento_codigo) ?? "";
    const forma = formasMap.get(upper(codigoOriginal)) ?? {};
    const tipoFluxo = inferTipoFluxo(
      forma,
      item,
      asString((forma as Record<string, unknown>).tipo_fluxo_saas),
    );
    const cartaoMaquinaId = asInt(item.cartao_maquina_id) ?? (tipoFluxo === "CARTAO" ? primeiraMaquinaValida : null);
    const exigeMaquininha =
      typeof (forma as Record<string, unknown>).exige_maquininha === "boolean"
        ? Boolean((forma as Record<string, unknown>).exige_maquininha)
        : tipoFluxo === "CARTAO";
    const exigeTroco =
      typeof (forma as Record<string, unknown>).exige_troco === "boolean"
        ? Boolean((forma as Record<string, unknown>).exige_troco)
        : tipoFluxo === "DINHEIRO";
    const exigeBandeira =
      typeof (forma as Record<string, unknown>).exige_bandeira === "boolean"
        ? Boolean((forma as Record<string, unknown>).exige_bandeira)
        : tipoFluxo === "CARTAO";
    const exigeContaInterna =
      typeof (forma as Record<string, unknown>).exige_conta_interna === "boolean"
        ? Boolean((forma as Record<string, unknown>).exige_conta_interna)
        : tipoFluxo === "CONTA_INTERNA_ALUNO" || tipoFluxo === "CONTA_INTERNA_COLABORADOR";

    return {
      id: asInt(forma.id),
      codigo: inferLogicalCode(codigoOriginal, tipoFluxo),
      nome: asString(forma.nome) ?? codigoOriginal,
      descricao_exibicao: resolveDisplayName(forma, item, tipoFluxo),
      tipo_fluxo: tipoFluxo,
      exige_troco: exigeTroco,
      exige_maquininha: exigeMaquininha,
      exige_bandeira: exigeBandeira,
      exige_conta_interna: exigeContaInterna,
      ativo:
        typeof item.ativo === "boolean"
          ? item.ativo
          : typeof forma.ativo === "boolean"
            ? Boolean(forma.ativo)
            : true,
      habilitado: true,
      motivo_bloqueio: null,
      conta_financeira_id: asInt(item.conta_financeira_id),
      cartao_maquina_id: cartaoMaquinaId,
      carteira_tipo: asString(item.carteira_tipo),
      origem: asString((forma as Record<string, unknown>).tipo_fluxo_saas) ? "SAAS" : "LEGADO",
    } satisfies FormaPagamentoDisponivel;
  });

  return {
    centro_custo_id: centroCustoId,
    opcoes,
    detalhe: null,
  };
}

export async function resolverFormasPagamentoSaas(params: ResolverFormasBaseParams) {
  try {
    return await carregarContextoELegado(
      params,
      "id,codigo,nome,tipo_base,tipo_fluxo_saas,exige_troco,exige_maquininha,exige_bandeira,exige_conta_interna,ativo",
    );
  } catch (error) {
    console.warn("[FORMAS_PAGAMENTO][SAAS][FALLBACK]", error);
    return {
      centro_custo_id: null,
      opcoes: [] as FormaPagamentoDisponivel[],
      detalhe: error instanceof Error ? error.message : "falha_formas_pagamento_saas",
    };
  }
}

export async function resolverFormasPagamentoLegado(params: ResolverFormasBaseParams) {
  try {
    return await carregarContextoELegado(params, "id,codigo,nome,tipo_base,ativo");
  } catch (error) {
    console.error("[FORMAS_PAGAMENTO][LEGADO][ERRO]", error);
    return {
      centro_custo_id: null,
      opcoes: [] as FormaPagamentoDisponivel[],
      detalhe: error instanceof Error ? error.message : "falha_formas_pagamento_legado",
    };
  }
}

export function mesclarFormasPagamento(params: {
  saas: FormaPagamentoDisponivel[];
  legado: FormaPagamentoDisponivel[];
}) {
  const map = new Map<string, FormaPagamentoDisponivel>();
  for (const item of [...params.legado, ...params.saas]) {
    const key = `${item.codigo}:${item.tipo_fluxo}`;
    const current = map.get(key);
    if (!current || current.origem === "LEGADO") {
      map.set(key, item);
    }
  }
  return Array.from(map.values());
}

function buildContaInternaResponse(params: {
  compradorTipo: CompradorTipoPagamento;
  compradorPessoaId: number | null;
  contexto: "CAFE" | "LOJA" | "ESCOLA";
  contaAluno: ContaInternaResolvida;
  contaColaborador: ContaInternaResolvida;
}): ContaInternaElegibilidade {
  const { compradorTipo, compradorPessoaId, contexto, contaAluno, contaColaborador } = params;

  if (compradorTipo === "ALUNO") {
    return {
      elegivel: contaAluno.elegivel,
      tipo: "ALUNO",
      conta_id: contaAluno.conta_id,
      titular_pessoa_id: contaAluno.titular_pessoa_id,
      motivo: contaAluno.motivo,
      suporte: {
        pode_solicitar: !contaAluno.elegivel && Boolean(compradorPessoaId),
        payload: compradorPessoaId ? { pessoa_id: compradorPessoaId, tipo_conta: "ALUNO", contexto_origem: contexto } : null,
      },
    };
  }

  if (compradorTipo === "COLABORADOR") {
    return {
      elegivel: contaColaborador.elegivel,
      tipo: "COLABORADOR",
      conta_id: contaColaborador.conta_id,
      titular_pessoa_id: contaColaborador.titular_pessoa_id,
      motivo: contaColaborador.motivo,
      suporte: {
        pode_solicitar: !contaColaborador.elegivel && Boolean(compradorPessoaId),
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
    motivo: "Conta interna disponivel apenas para aluno ou colaborador identificado.",
    suporte: {
      pode_solicitar: false,
      payload: null,
    },
  };
}

function aplicarElegibilidade(params: {
  compradorTipo: CompradorTipoPagamento;
  compradorPessoaId: number | null;
  contaInterna: ContaInternaElegibilidade;
  opcoes: FormaPagamentoDisponivel[];
}) {
  const { compradorTipo, compradorPessoaId, contaInterna } = params;

  return params.opcoes
    .filter((item) => {
      if (item.tipo_fluxo === "CONTA_INTERNA_ALUNO") {
        return compradorTipo === "ALUNO";
      }
      if (item.tipo_fluxo === "CONTA_INTERNA_COLABORADOR") {
        return compradorTipo === "COLABORADOR";
      }
      return true;
    })
    .map((item) => {
      let motivoBloqueio: string | null = null;

      if (item.tipo_fluxo === "CONTA_INTERNA_ALUNO") {
        if (!compradorPessoaId) {
          motivoBloqueio = "Selecione o aluno para usar a conta interna.";
        } else if (!contaInterna.elegivel) {
          motivoBloqueio = contaInterna.motivo ?? "Aluno ou responsavel sem conta interna ativa.";
        }
      }

      if (item.tipo_fluxo === "CONTA_INTERNA_COLABORADOR") {
        if (!compradorPessoaId) {
          motivoBloqueio = "Selecione o colaborador para usar a conta interna.";
        } else if (!contaInterna.elegivel) {
          motivoBloqueio = contaInterna.motivo ?? "Colaborador sem conta interna ativa.";
        }
      }

      if (item.exige_maquininha && !item.cartao_maquina_id) {
        motivoBloqueio = motivoBloqueio ?? "Nenhuma maquininha ativa foi configurada para esta forma.";
      }

      if (item.tipo_fluxo === "CREDIARIO") {
        motivoBloqueio = motivoBloqueio ?? "Crediario ainda nao esta operacional neste fluxo.";
      }

      return {
        ...item,
        habilitado: item.ativo && motivoBloqueio === null,
        motivo_bloqueio: motivoBloqueio,
      } satisfies FormaPagamentoDisponivel;
    });
}

export async function resolverFormasPagamentoDisponiveis(params: {
  supabase: SupabaseLike;
  contexto: "CAFE" | "LOJA" | "ESCOLA";
  compradorPessoaId: number | null;
  compradorTipo: string | null | undefined;
  centroCustoId?: number | null;
}): Promise<ResolverFormasPagamentoResult> {
  const compradorTipo = normalizarCompradorTipo(params.compradorTipo);
  console.log("[FORMAS_PAGAMENTO][RESOLVER]", {
    contexto: params.contexto,
    compradorPessoaId: params.compradorPessoaId,
    compradorTipo,
    centroCustoId: params.centroCustoId ?? null,
  });

  const [saas, legado, contaAluno, contaColaborador] = await Promise.all([
    resolverFormasPagamentoSaas({
      supabase: params.supabase,
      contexto: params.contexto,
      centroCustoId: params.centroCustoId ?? null,
    }),
    resolverFormasPagamentoLegado({
      supabase: params.supabase,
      contexto: params.contexto,
      centroCustoId: params.centroCustoId ?? null,
    }),
    compradorTipo === "ALUNO"
      ? resolverContaInternaDoAlunoOuResponsavel({
          supabase: params.supabase,
          alunoPessoaId: params.compradorPessoaId,
        })
      : Promise.resolve<ContaInternaResolvida>({
          elegivel: false,
          tipo: "ALUNO",
          conta_id: null,
          titular_pessoa_id: null,
          responsavel_financeiro_pessoa_id: null,
          dia_vencimento: null,
          tipo_liquidacao: "FATURA_MENSAL",
          motivo: "Nao se aplica.",
          descricao: null,
        }),
    compradorTipo === "COLABORADOR"
      ? resolverContaInternaDoColaborador({
          supabase: params.supabase,
          colaboradorPessoaId: params.compradorPessoaId,
        })
      : Promise.resolve<ContaInternaResolvida>({
          elegivel: false,
          tipo: "COLABORADOR",
          conta_id: null,
          titular_pessoa_id: null,
          responsavel_financeiro_pessoa_id: null,
          dia_vencimento: null,
          tipo_liquidacao: "FOLHA_PAGAMENTO",
          motivo: "Nao se aplica.",
          descricao: null,
        }),
  ]);

  const centroCustoId = saas.centro_custo_id ?? legado.centro_custo_id ?? null;
  const contaInterna = buildContaInternaResponse({
    compradorTipo,
    compradorPessoaId: params.compradorPessoaId,
    contexto: params.contexto,
    contaAluno,
    contaColaborador,
  });

  const merged = mesclarFormasPagamento({
    saas: saas.opcoes,
    legado: legado.opcoes,
  });

  const opcoes = aplicarElegibilidade({
    compradorTipo,
    compradorPessoaId: params.compradorPessoaId,
    contaInterna,
    opcoes: merged,
  });

  const erroControlado =
    opcoes.length === 0
      ? saas.detalhe ?? legado.detalhe ?? "nenhuma_forma_pagamento_disponivel"
      : saas.detalhe && legado.detalhe
        ? saas.detalhe
        : null;

  return {
    ok: erroControlado === null,
    erro_controlado: erroControlado,
    detalhe: erroControlado,
    centro_custo_id: centroCustoId,
    comprador: {
      pessoa_id: params.compradorPessoaId,
      tipo: compradorTipo,
    },
    conta_interna: contaInterna,
    opcoes,
  };
}
