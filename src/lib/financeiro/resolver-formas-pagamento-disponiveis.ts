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
  ordem_exibicao: number;
  exige_troco: boolean;
  exige_maquininha: boolean;
  exige_bandeira: boolean;
  exige_conta_interna: boolean;
  ativo: boolean;
  habilitado: boolean;
  motivo_bloqueio: string | null;
  conta_financeira_id: number | null;
  conta_financeira_codigo: string | null;
  conta_financeira_nome: string | null;
  cartao_maquina_id: number | null;
  cartao_maquina_nome: string | null;
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
type ContaFinanceiraRow = Record<string, unknown>;

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

async function resolverPerfilComprador(params: {
  supabase: SupabaseLike;
  compradorPessoaId: number | null;
  compradorTipoInformado: string | null | undefined;
}) {
  const tipoInformado = normalizarCompradorTipo(params.compradorTipoInformado);
  if (!params.compradorPessoaId) {
    return {
      tipo: tipoInformado,
      tipoInformado,
      colaboradorEncontrado: false,
      alunoEncontrado: false,
    };
  }

  const [colaboradorResult, alunoResult] = await Promise.all([
    params.supabase
      .from("colaboradores")
      .select("id,pessoa_id,ativo")
      .eq("pessoa_id", params.compradorPessoaId)
      .eq("ativo", true)
      .limit(1)
      .maybeSingle(),
    params.supabase
      .from("pessoas_roles")
      .select("pessoa_id,role")
      .eq("pessoa_id", params.compradorPessoaId)
      .eq("role", "ALUNO")
      .limit(1)
      .maybeSingle(),
  ]);

  if (colaboradorResult.error) {
    console.error("[FORMAS_PAGAMENTO][COMPRADOR][COLABORADOR][ERRO]", {
      compradorPessoaId: params.compradorPessoaId,
      error: colaboradorResult.error,
    });
    throw colaboradorResult.error;
  }

  if (alunoResult.error) {
    console.error("[FORMAS_PAGAMENTO][COMPRADOR][ALUNO][ERRO]", {
      compradorPessoaId: params.compradorPessoaId,
      error: alunoResult.error,
    });
    throw alunoResult.error;
  }

  const colaboradorEncontrado = Boolean(asInt((colaboradorResult.data as Record<string, unknown> | null)?.id));
  const alunoEncontrado = Boolean(asInt((alunoResult.data as Record<string, unknown> | null)?.pessoa_id));

  let tipoResolvido = tipoInformado;
  if (colaboradorEncontrado) {
    tipoResolvido = "COLABORADOR";
  } else if (alunoEncontrado) {
    tipoResolvido = "ALUNO";
  } else if (tipoInformado === "NAO_IDENTIFICADO") {
    tipoResolvido = "PESSOA_AVULSA";
  }

  console.log("[FORMAS_PAGAMENTO][COMPRADOR][RESOLVIDO]", {
    compradorPessoaId: params.compradorPessoaId,
    tipoInformado,
    colaboradorEncontrado,
    alunoEncontrado,
    tipoResolvido,
  });

  return {
    tipo: tipoResolvido,
    tipoInformado,
    colaboradorEncontrado,
    alunoEncontrado,
  };
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
  let maquinas: CartaoMaquinaRow[] = [];

  if (filtrosIds.length > 0) {
    const { data, error } = await supabase
      .from("cartao_maquinas")
      .select("id,nome,centro_custo_id,conta_financeira_id,ativo")
      .eq("ativo", true)
      .in("id", filtrosIds);
    if (error) {
      console.error("[FORMAS_PAGAMENTO][MAQUININHAS][ERRO_PREFERIDAS]", error);
      return new Map<number, CartaoMaquinaRow>();
    }
    maquinas = (data ?? []) as CartaoMaquinaRow[];
  }

  if (maquinas.length === 0) {
    const { data, error } = await supabase
      .from("cartao_maquinas")
      .select("id,nome,centro_custo_id,conta_financeira_id,ativo")
      .eq("ativo", true)
      .eq("centro_custo_id", centroCustoId);
    if (error) {
      console.error("[FORMAS_PAGAMENTO][MAQUININHAS][ERRO_CENTRO]", error);
      return new Map<number, CartaoMaquinaRow>();
    }
    maquinas = (data ?? []) as CartaoMaquinaRow[];
  }

  if (maquinas.length === 0) {
    const { data, error } = await supabase
      .from("cartao_maquinas")
      .select("id,nome,centro_custo_id,conta_financeira_id,ativo")
      .eq("ativo", true)
      .order("id", { ascending: true });
    if (error) {
      console.error("[FORMAS_PAGAMENTO][MAQUININHAS][ERRO_FALLBACK]", error);
      return new Map<number, CartaoMaquinaRow>();
    }
    maquinas = (data ?? []) as CartaoMaquinaRow[];
  }

  const machineIds = maquinas
    .map((item) => asInt(item.id))
    .filter((item): item is number => Boolean(item));

  if (machineIds.length === 0) return new Map<number, CartaoMaquinaRow>();

  const { data: regrasData, error: regrasError } = await supabase
    .from("cartao_regras_operacao")
    .select("id,maquina_id,ativo")
    .in("maquina_id", machineIds)
    .eq("ativo", true);

  if (regrasError) {
    console.error("[FORMAS_PAGAMENTO][REGRAS_CARTAO][ERRO]", regrasError);
    return new Map<number, CartaoMaquinaRow>();
  }

  const regras = new Set<number>();
  for (const regra of (regrasData ?? []) as CartaoRegraRow[]) {
    const maquinaId = asInt(regra.maquina_id);
    if (maquinaId) regras.add(maquinaId);
  }

  const maquinasValidas = new Map<number, CartaoMaquinaRow>();
  for (const maquina of maquinas) {
    const id = asInt(maquina.id);
    if (id && regras.has(id)) {
      maquinasValidas.set(id, maquina);
    }
  }

  return maquinasValidas;
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

  const maquinasValidas = await carregarMaquininhasValidas(
    params.supabase,
    centroCustoId,
    contextoRows.map((item) => asInt(item.cartao_maquina_id)).filter((item): item is number => Boolean(item)),
  );
  const primeiraMaquinaValida = Array.from(maquinasValidas.keys())[0] ?? null;
  const contaFinanceiraIds = Array.from(
    new Set(
      contextoRows
        .flatMap((item) => {
          const cartaoMaquinaId = asInt(item.cartao_maquina_id);
          const maquinaContaId = cartaoMaquinaId
            ? asInt(maquinasValidas.get(cartaoMaquinaId)?.conta_financeira_id)
            : null;
          return [asInt(item.conta_financeira_id), maquinaContaId];
        })
        .filter((item): item is number => Boolean(item)),
    ),
  );
  const contasMap = new Map<number, ContaFinanceiraRow>();
  if (contaFinanceiraIds.length > 0) {
    const { data: contasData, error: contasError } = await params.supabase
      .from("contas_financeiras")
      .select("id,codigo,nome")
      .in("id", contaFinanceiraIds);
    if (contasError) {
      throw contasError;
    }
    for (const item of (contasData ?? []) as ContaFinanceiraRow[]) {
      const id = asInt(item.id);
      if (id) contasMap.set(id, item);
    }
  }

  const opcoes = contextoRows.map((item) => {
    const codigoOriginal = asString(item.forma_pagamento_codigo) ?? "";
    const forma = formasMap.get(upper(codigoOriginal)) ?? {};
    const tipoFluxo = inferTipoFluxo(
      forma,
      item,
      asString((forma as Record<string, unknown>).tipo_fluxo_saas),
    );
    const ordemExibicao = asInt(item.ordem_exibicao) ?? 0;
    const cartaoMaquinaId = asInt(item.cartao_maquina_id) ?? (tipoFluxo === "CARTAO" ? primeiraMaquinaValida : null);
    const cartaoMaquina = cartaoMaquinaId ? maquinasValidas.get(cartaoMaquinaId) ?? null : null;
    const contaFinanceiraId = asInt(item.conta_financeira_id) ?? asInt(cartaoMaquina?.conta_financeira_id);
    const contaFinanceira = contaFinanceiraId ? contasMap.get(contaFinanceiraId) ?? null : null;
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
      ordem_exibicao: ordemExibicao,
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
      conta_financeira_id: contaFinanceiraId,
      conta_financeira_codigo: asString(contaFinanceira?.codigo),
      conta_financeira_nome: asString(contaFinanceira?.nome),
      cartao_maquina_id: cartaoMaquinaId,
      cartao_maquina_nome: asString(cartaoMaquina?.nome),
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
    })
    .sort((a, b) => {
      if (a.ordem_exibicao !== b.ordem_exibicao) return a.ordem_exibicao - b.ordem_exibicao;
      return a.descricao_exibicao.localeCompare(b.descricao_exibicao);
    });
}

export async function resolverFormasPagamentoDisponiveis(params: {
  supabase: SupabaseLike;
  contexto: "CAFE" | "LOJA" | "ESCOLA";
  compradorPessoaId: number | null;
  compradorTipo: string | null | undefined;
  centroCustoId?: number | null;
}): Promise<ResolverFormasPagamentoResult> {
  const comprador = await resolverPerfilComprador({
    supabase: params.supabase,
    compradorPessoaId: params.compradorPessoaId,
    compradorTipoInformado: params.compradorTipo,
  });

  console.log("[FORMAS_PAGAMENTO][RESOLVER]", {
    contexto: params.contexto,
    compradorPessoaId: params.compradorPessoaId,
    compradorTipoInformado: comprador.tipoInformado,
    compradorTipoResolvido: comprador.tipo,
    colaboradorEncontrado: comprador.colaboradorEncontrado,
    alunoEncontrado: comprador.alunoEncontrado,
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
    comprador.tipo === "ALUNO"
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
    comprador.tipo === "COLABORADOR"
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
    compradorTipo: comprador.tipo,
    compradorPessoaId: params.compradorPessoaId,
    contexto: params.contexto,
    contaAluno,
    contaColaborador,
  });

  const merged = mesclarFormasPagamento({
    saas: saas.opcoes,
    legado: legado.opcoes,
  });

  console.log("[FORMAS_PAGAMENTO][FORMAS][ANTES_FILTRO]", {
    compradorPessoaId: params.compradorPessoaId,
    compradorTipo: comprador.tipo,
    centroCustoId,
    formas: merged.map((item) => ({
      codigo: item.codigo,
      label: item.descricao_exibicao,
      tipo_fluxo: item.tipo_fluxo,
      ativo: item.ativo,
      carteira_tipo: item.carteira_tipo,
    })),
  });

  const opcoes = aplicarElegibilidade({
    compradorTipo: comprador.tipo,
    compradorPessoaId: params.compradorPessoaId,
    contaInterna,
    opcoes: merged,
  });

  console.log("[FORMAS_PAGAMENTO][FORMAS][FINAIS]", {
    compradorPessoaId: params.compradorPessoaId,
    compradorTipo: comprador.tipo,
    contaInternaElegivel: contaInterna.elegivel,
    contaInternaTipo: contaInterna.tipo,
    contaInternaId: contaInterna.conta_id,
    formas: opcoes.map((item) => ({
      codigo: item.codigo,
      label: item.descricao_exibicao,
      tipo_fluxo: item.tipo_fluxo,
      habilitado: item.habilitado,
      motivo_bloqueio: item.motivo_bloqueio,
    })),
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
      tipo: comprador.tipo,
    },
    conta_interna: contaInterna,
    opcoes,
  };
}
