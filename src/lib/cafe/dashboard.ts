import { getSupabaseServiceClient } from "@/lib/supabase/service";

export type CafeDashboardPeriodo = "7d" | "15d" | "30d" | "hoje" | "mes";

export type CafeDashboardResumo = {
  faturamento_total_centavos: number;
  total_vendas: number;
  ticket_medio_centavos: number;
  itens_vendidos: number;
  clientes_identificados_percentual: number;
};

export type CafeDashboardHorarioFaixa = {
  hora: number;
  vendas: number;
  faturamento_centavos: number;
  itens: number;
};

export type CafeDashboardTopProduto = {
  produto_id: number | null;
  produto_nome: string;
  quantidade: number;
  faturamento_centavos: number;
};

export type CafeDashboardPerfil = {
  perfil: "COLABORADOR" | "ALUNO" | "CLIENTE_EXTERNO" | "NAO_IDENTIFICADO";
  faturamento_centavos: number;
  itens: number;
  ticket_medio_centavos: number;
  top_produtos: CafeDashboardTopProduto[];
};

export type CafeDashboardEstoqueAlerta = {
  insumo_id: number;
  nome: string;
  estoque_atual: number;
  estoque_minimo: number | null;
  status_reposicao: string;
  custo_medio_centavos: number | null;
};

export type CafeDashboardMeioPagamento = {
  codigo: string;
  label: string;
  vendas: number;
  faturamento_centavos: number;
};

export type CafeDashboardContaDistribuicao = {
  conta_financeira_id: number | null;
  conta_financeira_nome: string;
  total_centavos: number;
};

export type CafeDashboardData = {
  resumo: CafeDashboardResumo;
  horarios: {
    faixas: CafeDashboardHorarioFaixa[];
    faixa_pico: {
      hora: number | null;
      vendas: number;
      faturamento_centavos: number;
    };
  };
  consumo_por_perfil: CafeDashboardPerfil[];
  alunos: {
    top_produtos: CafeDashboardTopProduto[];
    horarios_preferidos: Array<{
      hora: number;
      vendas: number;
      faturamento_centavos: number;
    }>;
  };
  produtos: {
    mais_vendidos: CafeDashboardTopProduto[];
    maior_receita: Array<{
      produto_id: number | null;
      produto_nome: string;
      faturamento_centavos: number;
    }>;
  };
  estoque: {
    alertas: CafeDashboardEstoqueAlerta[];
    quantidade_alertas: number;
    quantidade_repor_agora: number;
    quantidade_zerado: number;
  };
  financeiro: {
    total_imediato_recebido_centavos: number;
    total_recebivel_cartao_centavos: number;
    total_conta_interna_aluno_centavos: number;
    total_conta_interna_colaborador_centavos: number;
    total_pendente_liquidacao_centavos: number;
    distribuicao_contas: CafeDashboardContaDistribuicao[];
  };
  meios_pagamento: CafeDashboardMeioPagamento[];
  explicacao: {
    texto_curto: string;
  };
};

export type CafeDashboardFilters = {
  periodo?: CafeDashboardPeriodo | null;
  dataInicio?: string | null;
  dataFim?: string | null;
};

type CafeAnalyticsRow = {
  venda_id: number | string | null;
  dia_referencia: string | null;
  hora_referencia: number | string | null;
  cliente_pessoa_id: number | string | null;
  beneficiario_pessoa_id: number | string | null;
  perfil_consumidor: string | null;
  produto_id: number | string | null;
  produto_nome: string | null;
  produto_categoria: string | null;
  quantidade: number | string | null;
  preco_unitario_centavos: number | string | null;
  total_centavos: number | string | null;
  forma_pagamento: string | null;
  status_pagamento: string | null;
};

type CafeInsumoAlertaRow = {
  insumo_id: number | string | null;
  nome: string | null;
  estoque_atual: number | string | null;
  estoque_minimo: number | string | null;
  status_reposicao: string | null;
  custo_medio_centavos: number | string | null;
};

type CafeFinanceiroRow = {
  valor_total_centavos: number | string | null;
  valor_pago_centavos: number | string | null;
  valor_em_aberto_centavos: number | string | null;
  forma_pagamento: string | null;
  tipo_quitacao?: string | null;
  colaborador_pessoa_id?: number | string | null;
  status_pagamento?: string | null;
};

const PERFIS: CafeDashboardPerfil["perfil"][] = [
  "COLABORADOR",
  "ALUNO",
  "CLIENTE_EXTERNO",
  "NAO_IDENTIFICADO",
];

function toInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return 0;
}

function toNullableInt(value: unknown): number | null {
  const parsed = toInt(value);
  return parsed > 0 ? parsed : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toIsoDate(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function resolveCafeDashboardRange(filters: CafeDashboardFilters) {
  const hoje = new Date();
  const dataFim = filters.dataFim && /^\d{4}-\d{2}-\d{2}$/.test(filters.dataFim) ? filters.dataFim : toIsoDate(hoje);

  if (filters.dataInicio && /^\d{4}-\d{2}-\d{2}$/.test(filters.dataInicio)) {
    return { dataInicio: filters.dataInicio, dataFim };
  }

  const periodo = filters.periodo ?? "30d";
  if (periodo === "hoje") return { dataInicio: dataFim, dataFim };
  if (periodo === "mes") {
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return { dataInicio: toIsoDate(inicioMes), dataFim };
  }

  const dias = periodo === "7d" ? 7 : periodo === "15d" ? 15 : 30;
  return { dataInicio: toIsoDate(addDays(hoje, -(dias - 1))), dataFim };
}

function topProdutosFromMap(map: Map<number | null, CafeDashboardTopProduto>, limit = 5) {
  return Array.from(map.values())
    .sort((a, b) => {
      if (b.quantidade !== a.quantidade) return b.quantidade - a.quantidade;
      return b.faturamento_centavos - a.faturamento_centavos;
    })
    .slice(0, limit);
}

function topReceitaFromMap(map: Map<number | null, CafeDashboardTopProduto>, limit = 5) {
  return Array.from(map.values())
    .sort((a, b) => b.faturamento_centavos - a.faturamento_centavos)
    .slice(0, limit)
    .map((item) => ({
      produto_id: item.produto_id,
      produto_nome: item.produto_nome,
      faturamento_centavos: item.faturamento_centavos,
    }));
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

function formatFormaPagamentoLabel(value: string | null) {
  const codigo = upper(value);
  switch (codigo) {
    case "DINHEIRO":
      return "Dinheiro";
    case "PIX":
      return "PIX";
    case "CREDITO_AVISTA":
      return "Cartao externo";
    case "CREDIARIO_COLAB":
    case "CONTA_INTERNA":
    case "CONTA_INTERNA_COLABORADOR":
      return "Conta interna do colaborador";
    case "CARTAO_CONEXAO_ALUNO":
      return "Conta interna do aluno";
    case "CARTAO_CONEXAO_COLAB":
    case "CARTAO_CONEXAO_COLABORADOR":
      return "Conta interna do colaborador";
    case "CARTAO_CONEXAO":
      return "Conta interna";
    case "":
      return "Nao informado";
    default:
      return codigo.split("_").join(" ");
  }
}

function buildExplicacao(params: {
  range: { dataInicio: string; dataFim: string };
  resumo: CafeDashboardResumo;
  faixaPicoHora: number | null;
  produtoTop: CafeDashboardTopProduto | null;
  quantidadeAlertas: number;
}) {
  const { range, resumo, faixaPicoHora, produtoTop, quantidadeAlertas } = params;
  const partes = [
    `Periodo de ${range.dataInicio} ate ${range.dataFim}.`,
    resumo.total_vendas > 0
      ? `${resumo.total_vendas} venda(s) somaram ${(resumo.faturamento_total_centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
      : "Sem vendas registradas no periodo selecionado.",
  ];

  if (faixaPicoHora !== null) {
    partes.push(`O pico operacional ficou por volta das ${String(faixaPicoHora).padStart(2, "0")}h.`);
  }
  if (produtoTop) {
    partes.push(`${produtoTop.produto_nome} lidera o mix atual do cafe.`);
  }
  if (quantidadeAlertas > 0) {
    partes.push(`${quantidadeAlertas} alerta(s) de reposicao exigem atencao operacional.`);
  }

  return partes.join(" ");
}

function inferCategoriaFinanceira(row: CafeFinanceiroRow) {
  const forma = upper(row.forma_pagamento);
  const quitacao = upper(row.tipo_quitacao);
  const ehColaborador = toNullableInt(row.colaborador_pessoa_id) !== null;

  if (
    forma === "CARTAO_CONEXAO_ALUNO" ||
    forma === "CREDITO_ALUNO" ||
    (quitacao === "CARTAO_CONEXAO" && !ehColaborador)
  ) {
    return "CONTA_INTERNA_ALUNO" as const;
  }

  if (
    forma === "CONTA_INTERNA_COLABORADOR" ||
    forma === "CONTA_INTERNA" ||
    forma === "CREDIARIO_COLAB" ||
    forma === "CARTAO_CONEXAO_COLABORADOR" ||
    forma === "CARTAO_CONEXAO_COLAB" ||
    quitacao === "CONTA_INTERNA_COLABORADOR" ||
    (quitacao === "CARTAO_CONEXAO" && ehColaborador)
  ) {
    return "CONTA_INTERNA_COLABORADOR" as const;
  }

  if (
    forma === "CREDITO_AVISTA" ||
    forma === "CREDITO_PARCELADO" ||
    forma === "DEBITO" ||
    forma === "CARTAO"
  ) {
    return "CARTAO_EXTERNO" as const;
  }

  if (quitacao === "PARCIAL") {
    return "PARCIAL" as const;
  }

  return "IMEDIATO" as const;
}

export async function buildCafeDashboard(filters: CafeDashboardFilters): Promise<CafeDashboardData> {
  const supabase = getSupabaseServiceClient();
  const range = resolveCafeDashboardRange(filters);

  let analytics: CafeAnalyticsRow[] = [];
  let alertas: CafeInsumoAlertaRow[] = [];
  let financeiroRows: CafeFinanceiroRow[] = [];

  const analyticsResult = await supabase
    .from("vw_cafe_vendas_analytics")
    .select(
      "venda_id,dia_referencia,hora_referencia,cliente_pessoa_id,beneficiario_pessoa_id,perfil_consumidor,produto_id,produto_nome,produto_categoria,quantidade,preco_unitario_centavos,total_centavos,forma_pagamento,status_pagamento",
    )
    .gte("dia_referencia", range.dataInicio)
    .lte("dia_referencia", range.dataFim);
  if (analyticsResult.error) {
    console.error("[CAFE_DASHBOARD][ANALYTICS][ERRO]", analyticsResult.error);
  } else {
    analytics = (analyticsResult.data ?? []) as CafeAnalyticsRow[];
  }

  const alertasResult = await supabase
    .from("vw_cafe_insumos_alertas")
    .select("insumo_id,nome,estoque_atual,estoque_minimo,status_reposicao,custo_medio_centavos")
    .order("status_reposicao", { ascending: true })
    .order("nome", { ascending: true });

  if (alertasResult.error) {
    console.warn("[CAFE_DASHBOARD][ESTOQUE][VIEW_FALLBACK]", alertasResult.error);
    const fallbackAlertas = await supabase
      .from("cafe_insumos")
      .select("id,nome,estoque_atual,estoque_minimo,custo_medio_centavos")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (fallbackAlertas.error) {
      console.error("[CAFE_DASHBOARD][ESTOQUE][ERRO]", fallbackAlertas.error);
    } else {
      alertas = ((fallbackAlertas.data ?? []) as Array<Record<string, unknown>>).map((row) => {
        const estoqueAtual = Number(row.estoque_atual ?? 0);
        const estoqueMinimo = row.estoque_minimo === null ? null : Number(row.estoque_minimo ?? 0);
        let status = "OK";
        if (estoqueMinimo === null) status = "SEM_PARAMETRO";
        else if (estoqueAtual <= 0) status = "ZERADO";
        else if (estoqueAtual <= estoqueMinimo) status = "REPOR_AGORA";
        else if (estoqueAtual <= estoqueMinimo * 1.5) status = "ATENCAO";

        return {
          insumo_id: asInt(row.id) ?? 0,
          nome: asString(row.nome) ?? "Insumo sem nome",
          estoque_atual: estoqueAtual,
          estoque_minimo: estoqueMinimo,
          status_reposicao: status,
          custo_medio_centavos: toNullableInt(row.custo_medio_centavos),
        } satisfies CafeInsumoAlertaRow;
      });
    }
  } else {
    alertas = (alertasResult.data ?? []) as CafeInsumoAlertaRow[];
  }

  const financeiroResult = await supabase
    .from("cafe_vendas")
    .select(
      "valor_total_centavos,valor_pago_centavos,valor_em_aberto_centavos,forma_pagamento,tipo_quitacao,colaborador_pessoa_id,status_pagamento",
    )
    .gte("data_operacao", range.dataInicio)
    .lte("data_operacao", range.dataFim)
    .neq("status_pagamento", "CANCELADO");

  if (financeiroResult.error) {
    console.error("[CAFE_DASHBOARD][FINANCEIRO][ERRO]", financeiroResult.error);
  } else {
    financeiroRows = (financeiroResult.data ?? []) as CafeFinanceiroRow[];
  }

  const vendaIds = new Set<number>();
  const vendaIdsIdentificados = new Set<number>();
  const faturamentoTotal = analytics.reduce((acc, row) => acc + toInt(row.total_centavos), 0);
  const itensVendidos = analytics.reduce((acc, row) => acc + toInt(row.quantidade), 0);

  const horarioMap = new Map<number, CafeDashboardHorarioFaixa>();
  const perfilStats = new Map<
    CafeDashboardPerfil["perfil"],
    {
      faturamento_centavos: number;
      itens: number;
      vendaIds: Set<number>;
      produtos: Map<number | null, CafeDashboardTopProduto>;
    }
  >();
  const produtosGlobais = new Map<number | null, CafeDashboardTopProduto>();
  const horariosAlunos = new Map<number, { hora: number; vendas: Set<number>; faturamento_centavos: number }>();
  const produtosAlunos = new Map<number | null, CafeDashboardTopProduto>();
  const meiosPagamentoMap = new Map<string, CafeDashboardMeioPagamento>();
  const distribuicaoContasMap = new Map<string, CafeDashboardContaDistribuicao>();
  let totalImediatoRecebido = 0;
  let totalRecebivelCartao = 0;
  let totalContaInternaAluno = 0;
  let totalContaInternaColaborador = 0;
  let totalPendenteLiquidacao = 0;

  for (const perfil of PERFIS) {
    perfilStats.set(perfil, {
      faturamento_centavos: 0,
      itens: 0,
      vendaIds: new Set<number>(),
      produtos: new Map<number | null, CafeDashboardTopProduto>(),
    });
  }

  for (const row of analytics) {
    const vendaId = toInt(row.venda_id);
    const hora = toInt(row.hora_referencia);
    const quantidade = toInt(row.quantidade);
    const faturamento = toInt(row.total_centavos);
    const produtoId = toNullableInt(row.produto_id);
    const produtoNome = row.produto_nome?.trim() || "Produto nao identificado";
    const perfil = PERFIS.includes((row.perfil_consumidor ?? "") as CafeDashboardPerfil["perfil"])
      ? (row.perfil_consumidor as CafeDashboardPerfil["perfil"])
      : "NAO_IDENTIFICADO";

    vendaIds.add(vendaId);
    if (toNullableInt(row.cliente_pessoa_id) || toNullableInt(row.beneficiario_pessoa_id)) {
      vendaIdsIdentificados.add(vendaId);
    }

    const faixa = horarioMap.get(hora) ?? { hora, vendas: 0, faturamento_centavos: 0, itens: 0 };
    faixa.vendas += 1;
    faixa.faturamento_centavos += faturamento;
    faixa.itens += quantidade;
    horarioMap.set(hora, faixa);

    const produtoGlobal = produtosGlobais.get(produtoId) ?? {
      produto_id: produtoId,
      produto_nome: produtoNome,
      quantidade: 0,
      faturamento_centavos: 0,
    };
    produtoGlobal.quantidade += quantidade;
    produtoGlobal.faturamento_centavos += faturamento;
    produtosGlobais.set(produtoId, produtoGlobal);

    const perfilAtual = perfilStats.get(perfil)!;
    perfilAtual.faturamento_centavos += faturamento;
    perfilAtual.itens += quantidade;
    perfilAtual.vendaIds.add(vendaId);
    const produtoPerfil = perfilAtual.produtos.get(produtoId) ?? {
      produto_id: produtoId,
      produto_nome: produtoNome,
      quantidade: 0,
      faturamento_centavos: 0,
    };
    produtoPerfil.quantidade += quantidade;
    produtoPerfil.faturamento_centavos += faturamento;
    perfilAtual.produtos.set(produtoId, produtoPerfil);

    if (perfil === "ALUNO") {
      const horarioAluno = horariosAlunos.get(hora) ?? { hora, vendas: new Set<number>(), faturamento_centavos: 0 };
      horarioAluno.vendas.add(vendaId);
      horarioAluno.faturamento_centavos += faturamento;
      horariosAlunos.set(hora, horarioAluno);

      const produtoAluno = produtosAlunos.get(produtoId) ?? {
        produto_id: produtoId,
        produto_nome: produtoNome,
        quantidade: 0,
        faturamento_centavos: 0,
      };
      produtoAluno.quantidade += quantidade;
      produtoAluno.faturamento_centavos += faturamento;
      produtosAlunos.set(produtoId, produtoAluno);
    }
  }

  const totalVendas = vendaIds.size;
  const ticketMedio = totalVendas > 0 ? Math.round(faturamentoTotal / totalVendas) : 0;
  const percentualClientesIdentificados =
    totalVendas > 0 ? Math.round((vendaIdsIdentificados.size / totalVendas) * 10000) / 100 : 0;

  const faixas = Array.from(horarioMap.values()).sort((a, b) => a.hora - b.hora);
  const faixaPico = faixas.reduce(
    (best, item) => {
      if (!best || item.faturamento_centavos > best.faturamento_centavos) {
        return {
          hora: item.hora,
          vendas: item.vendas,
          faturamento_centavos: item.faturamento_centavos,
        };
      }
      return best;
    },
    null as CafeDashboardData["horarios"]["faixa_pico"] | null,
  ) ?? { hora: null, vendas: 0, faturamento_centavos: 0 };

  const consumoPorPerfil: CafeDashboardPerfil[] = PERFIS.map((perfil) => {
    const stats = perfilStats.get(perfil)!;
    return {
      perfil,
      faturamento_centavos: stats.faturamento_centavos,
      itens: stats.itens,
      ticket_medio_centavos:
        stats.vendaIds.size > 0 ? Math.round(stats.faturamento_centavos / stats.vendaIds.size) : 0,
      top_produtos: topProdutosFromMap(stats.produtos, 3),
    };
  });

  const alunosHorarios = Array.from(horariosAlunos.values())
    .map((item) => ({
      hora: item.hora,
      vendas: item.vendas.size,
      faturamento_centavos: item.faturamento_centavos,
    }))
    .sort((a, b) => {
      if (b.vendas !== a.vendas) return b.vendas - a.vendas;
      return b.faturamento_centavos - a.faturamento_centavos;
    })
    .slice(0, 5);

  const estoqueAlertas: CafeDashboardEstoqueAlerta[] = alertas.map((row) => ({
    insumo_id: toInt(row.insumo_id),
    nome: row.nome?.trim() || "Insumo sem nome",
    estoque_atual: toInt(row.estoque_atual),
    estoque_minimo: toNullableInt(row.estoque_minimo),
    status_reposicao: row.status_reposicao?.trim() || "SEM_PARAMETRO",
    custo_medio_centavos: toNullableInt(row.custo_medio_centavos),
  }));

  const quantidadeZerado = estoqueAlertas.filter((item) => item.status_reposicao === "ZERADO").length;
  const quantidadeReporAgora = estoqueAlertas.filter((item) => item.status_reposicao === "REPOR_AGORA").length;
  const quantidadeAlertas = estoqueAlertas.filter((item) =>
    item.status_reposicao === "ZERADO" || item.status_reposicao === "REPOR_AGORA" || item.status_reposicao === "ATENCAO"
  ).length;

  for (const row of financeiroRows) {
    const total = Math.max(toInt(row.valor_total_centavos), 0);
    const pago = Math.max(toInt(row.valor_pago_centavos), 0);
    const aberto = Math.max(toInt(row.valor_em_aberto_centavos), 0);
    const categoria = inferCategoriaFinanceira(row);
    const formaPagamentoCodigo = upper(row.forma_pagamento) || categoria || "NAO_INFORMADO";

    if (categoria === "IMEDIATO") {
      totalImediatoRecebido += pago;
    }
    if (categoria === "CARTAO_EXTERNO") {
      totalRecebivelCartao += total;
    }
    if (categoria === "CONTA_INTERNA_ALUNO") {
      totalContaInternaAluno += total;
    }
    if (categoria === "CONTA_INTERNA_COLABORADOR") {
      totalContaInternaColaborador += total;
    }
    if (categoria !== "CONTA_INTERNA_ALUNO" && categoria !== "CONTA_INTERNA_COLABORADOR") {
      totalPendenteLiquidacao += aberto;
    }

    const meioAtual = meiosPagamentoMap.get(formaPagamentoCodigo) ?? {
      codigo: formaPagamentoCodigo,
      label: formatFormaPagamentoLabel(formaPagamentoCodigo),
      vendas: 0,
      faturamento_centavos: 0,
    };
    meioAtual.vendas += 1;
    meioAtual.faturamento_centavos += total;
    meiosPagamentoMap.set(formaPagamentoCodigo, meioAtual);

    const distribuicaoAtual = distribuicaoContasMap.get(categoria) ?? {
      conta_financeira_id: null,
      conta_financeira_nome:
        categoria === "CONTA_INTERNA_ALUNO"
          ? "Conta interna do aluno"
          : categoria === "CONTA_INTERNA_COLABORADOR"
            ? "Conta interna do colaborador"
            : categoria === "CARTAO_EXTERNO"
              ? "Recebivel de cartao"
              : "Recebimento imediato",
      total_centavos: 0,
    };
    distribuicaoAtual.total_centavos += total;
    distribuicaoContasMap.set(categoria, distribuicaoAtual);
  }

  const resumo: CafeDashboardResumo = {
    faturamento_total_centavos: faturamentoTotal,
    total_vendas: totalVendas,
    ticket_medio_centavos: ticketMedio,
    itens_vendidos: itensVendidos,
    clientes_identificados_percentual: percentualClientesIdentificados,
  };

  return {
    resumo,
    horarios: {
      faixas,
      faixa_pico: faixaPico,
    },
    consumo_por_perfil: consumoPorPerfil,
    alunos: {
      top_produtos: topProdutosFromMap(produtosAlunos, 5),
      horarios_preferidos: alunosHorarios,
    },
    produtos: {
      mais_vendidos: topProdutosFromMap(produtosGlobais, 5),
      maior_receita: topReceitaFromMap(produtosGlobais, 5),
    },
    estoque: {
      alertas: estoqueAlertas,
      quantidade_alertas: quantidadeAlertas,
      quantidade_repor_agora: quantidadeReporAgora,
      quantidade_zerado: quantidadeZerado,
    },
    financeiro: {
      total_imediato_recebido_centavos: totalImediatoRecebido,
      total_recebivel_cartao_centavos: totalRecebivelCartao,
      total_conta_interna_aluno_centavos: totalContaInternaAluno,
      total_conta_interna_colaborador_centavos: totalContaInternaColaborador,
      total_pendente_liquidacao_centavos: totalPendenteLiquidacao,
      distribuicao_contas: Array.from(distribuicaoContasMap.values()).sort(
        (a, b) => b.total_centavos - a.total_centavos,
      ),
    },
    meios_pagamento: Array.from(meiosPagamentoMap.values()).sort(
      (a, b) => b.faturamento_centavos - a.faturamento_centavos,
    ),
    explicacao: {
      texto_curto: buildExplicacao({
        range,
        resumo,
        faixaPicoHora: faixaPico.hora,
        produtoTop: topProdutosFromMap(produtosGlobais, 1)[0] ?? null,
        quantidadeAlertas,
      }),
    },
  };
}
