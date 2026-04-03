import type { CoreografiaFormacao } from "@/lib/eventos/types";

export type EventoEdicaoRegraFinanceiraNormalized = {
  id: string | null;
  tipo_regra:
    | "TAXA_GERAL"
    | "POR_FORMACAO"
    | "POR_MODALIDADE"
    | "POR_PROGRESSAO"
    | "POR_QUANTIDADE"
    | "ITEM_ADICIONAL";
  modo_calculo:
    | "VALOR_FIXO"
    | "VALOR_TOTAL_FAIXA"
    | "VALOR_POR_PARTICIPANTE"
    | "VALOR_INCREMENTAL";
  descricao_regra: string | null;
  formacao_coreografia: CoreografiaFormacao | null;
  estilo_id: string | null;
  modalidade_nome: string | null;
  ordem_progressao: number | null;
  quantidade_minima: number | null;
  quantidade_maxima: number | null;
  valor_centavos: number;
  valor_por_participante_centavos: number | null;
  ativa: boolean;
  ordem_aplicacao: number;
};

export type EventoEdicaoConfiguracaoFinanceiraSource = {
  cobra_taxa_participacao_geral?: boolean;
  valor_taxa_participacao_centavos?: number;
  cobra_por_coreografia?: boolean;
  regrasFinanceiras?: unknown[];
  regras_financeiras?: unknown[];
};

export type EventoEdicaoItemConfiguravelPreco = {
  id: string;
  nome: string;
  valor_centavos: number;
};

export type EventoEdicaoCoreografiaPreco = {
  id: string;
  valor_participacao_coreografia_centavos?: number | null;
  coreografia: {
    nome: string;
    modalidade?: string | null;
    tipo_formacao: CoreografiaFormacao;
    estilo_id?: string | null;
    estilo?: {
      nome?: string | null;
    } | null;
  };
};

export type EventoEdicaoComposicaoFinanceiraLinha = {
  id: string;
  tipo: "EVENTO_GERAL" | "ITEM_EDICAO" | "COREOGRAFIA";
  label: string;
  valorCentavos: number;
  detalhePrincipal: string | null;
  explicacoes: string[];
  fonteCalculo: "REGRA_EDICAO" | "ITEM_CONFIGURADO" | "FALLBACK_LEGADO";
  itemConfiguracaoId: string | null;
  coreografiaVinculoId: string | null;
};

export type EventoEdicaoComposicaoFinanceira = {
  linhas: EventoEdicaoComposicaoFinanceiraLinha[];
  totalCentavos: number;
};

function normalizeInteger(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return fallback;
}

function normalizeNullableInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  return null;
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function sortRules(
  rules: EventoEdicaoRegraFinanceiraNormalized[],
): EventoEdicaoRegraFinanceiraNormalized[] {
  return [...rules].sort((left, right) => {
    if (left.ordem_aplicacao !== right.ordem_aplicacao) {
      return left.ordem_aplicacao - right.ordem_aplicacao;
    }
    return (left.id ?? "").localeCompare(right.id ?? "");
  });
}

export function normalizeEventoEdicaoRegrasFinanceiras(
  source: unknown,
): EventoEdicaoRegraFinanceiraNormalized[] {
  if (!Array.isArray(source)) return [];

  return sortRules(
    source.flatMap((item) => {
      if (typeof item !== "object" || item === null) return [];
      const record = item as Record<string, unknown>;

      const tipo = record.tipo_regra ?? record.tipoRegra;
      const modo = record.modo_calculo ?? record.modoCalculo;
      if (
        typeof tipo !== "string" ||
        typeof modo !== "string"
      ) {
        return [];
      }

      return [
        {
          id:
            typeof record.id === "string" && record.id.trim() ? record.id : null,
          tipo_regra:
            tipo as EventoEdicaoRegraFinanceiraNormalized["tipo_regra"],
          modo_calculo:
            modo as EventoEdicaoRegraFinanceiraNormalized["modo_calculo"],
          descricao_regra: normalizeNullableString(
            record.descricao_regra ?? record.descricaoRegra,
          ),
          formacao_coreografia:
            (normalizeNullableString(
              record.formacao_coreografia ?? record.formacaoCoreografia,
            ) as CoreografiaFormacao | null) ?? null,
          estilo_id: normalizeNullableString(record.estilo_id ?? record.estiloId),
          modalidade_nome: normalizeNullableString(
            record.modalidade_nome ?? record.modalidadeNome,
          ),
          ordem_progressao: normalizeNullableInteger(
            record.ordem_progressao ?? record.ordemProgressao,
          ),
          quantidade_minima: normalizeNullableInteger(
            record.quantidade_minima ?? record.quantidadeMinima,
          ),
          quantidade_maxima: normalizeNullableInteger(
            record.quantidade_maxima ?? record.quantidadeMaxima,
          ),
          valor_centavos: Math.max(
            0,
            normalizeInteger(record.valor_centavos ?? record.valorCentavos, 0),
          ),
          valor_por_participante_centavos: normalizeNullableInteger(
            record.valor_por_participante_centavos ??
              record.valorPorParticipanteCentavos,
          ),
          ativa: normalizeBoolean(record.ativa, true),
          ordem_aplicacao: normalizeInteger(
            record.ordem_aplicacao ?? record.ordemAplicacao,
            0,
          ),
        },
      ];
    }),
  );
}

function resolveRuleAmount(params: {
  rule: EventoEdicaoRegraFinanceiraNormalized;
  progressaoIndex?: number;
  quantidadeTotalCoreografias?: number;
}) {
  const { rule } = params;
  const valorBase =
    rule.modo_calculo === "VALOR_POR_PARTICIPANTE"
      ? rule.valor_por_participante_centavos ?? rule.valor_centavos
      : rule.valor_centavos;

  if (rule.modo_calculo === "VALOR_INCREMENTAL") {
    if (rule.tipo_regra === "POR_PROGRESSAO") {
      return valorBase * Math.max(1, params.progressaoIndex ?? 1);
    }

    if (rule.tipo_regra === "POR_QUANTIDADE") {
      return valorBase * Math.max(1, params.quantidadeTotalCoreografias ?? 1);
    }
  }

  return valorBase;
}

function matchesModalidadeRule(
  rule: EventoEdicaoRegraFinanceiraNormalized,
  coreografia: EventoEdicaoCoreografiaPreco,
) {
  const byEstilo =
    rule.estilo_id && coreografia.coreografia.estilo_id
      ? rule.estilo_id === coreografia.coreografia.estilo_id
      : false;
  const byModalidade =
    rule.modalidade_nome && coreografia.coreografia.modalidade
      ? normalizeText(rule.modalidade_nome) ===
        normalizeText(coreografia.coreografia.modalidade)
      : false;
  return byEstilo || byModalidade;
}

function matchesFormationRule(
  rule: EventoEdicaoRegraFinanceiraNormalized,
  coreografia: EventoEdicaoCoreografiaPreco,
) {
  return (
    !!rule.formacao_coreografia &&
    rule.formacao_coreografia === coreografia.coreografia.tipo_formacao
  );
}

function matchesQuantityRule(
  rule: EventoEdicaoRegraFinanceiraNormalized,
  quantidadeSelecionada: number,
) {
  const min = rule.quantidade_minima ?? 1;
  const max = rule.quantidade_maxima ?? Number.MAX_SAFE_INTEGER;
  return quantidadeSelecionada >= min && quantidadeSelecionada <= max;
}

function findSpecificRule(
  rules: EventoEdicaoRegraFinanceiraNormalized[],
  coreografia: EventoEdicaoCoreografiaPreco,
) {
  const modalidadeRule = rules.find(
    (rule) => rule.tipo_regra === "POR_MODALIDADE" && matchesModalidadeRule(rule, coreografia),
  );
  if (modalidadeRule) return modalidadeRule;

  return (
    rules.find(
      (rule) => rule.tipo_regra === "POR_FORMACAO" && matchesFormationRule(rule, coreografia),
    ) ?? null
  );
}

function buildRuleExplanation(
  rule: EventoEdicaoRegraFinanceiraNormalized,
  suffix?: string | null,
) {
  const base =
    rule.descricao_regra?.trim() ||
    (rule.tipo_regra === "POR_MODALIDADE"
      ? "Regra por modalidade"
      : rule.tipo_regra === "POR_FORMACAO"
        ? "Regra por formacao"
        : rule.tipo_regra === "POR_PROGRESSAO"
          ? "Regra de progressao"
          : rule.tipo_regra === "POR_QUANTIDADE"
            ? "Regra por quantidade"
            : "Regra financeira");

  return suffix ? `${base} · ${suffix}` : base;
}

export function calcularComposicaoFinanceiraEventoEdicao(params: {
  configuracao: EventoEdicaoConfiguracaoFinanceiraSource | null;
  incluirEventoGeral: boolean;
  itensConfiguracao: EventoEdicaoItemConfiguravelPreco[];
  coreografiasSelecionadas: EventoEdicaoCoreografiaPreco[];
}): EventoEdicaoComposicaoFinanceira {
  const regras = normalizeEventoEdicaoRegrasFinanceiras(
    params.configuracao?.regrasFinanceiras ??
      params.configuracao?.regras_financeiras ??
      [],
  ).filter((rule) => rule.ativa);

  const linhas: EventoEdicaoComposicaoFinanceiraLinha[] = [];
  const totalCoreografias = params.coreografiasSelecionadas.length;
  const aplicaRegrasPorCoreografia =
    params.configuracao?.cobra_por_coreografia === true;
  const hasDetailedRules = regras.length > 0;
  const regrasTaxaGeral = sortRules(
    regras.filter((rule) => rule.tipo_regra === "TAXA_GERAL"),
  );
  const usaFallbackLegado =
    regras.filter((rule) =>
      ["POR_FORMACAO", "POR_MODALIDADE", "POR_PROGRESSAO", "POR_QUANTIDADE"].includes(
        rule.tipo_regra,
      ),
    ).length === 0 &&
    aplicaRegrasPorCoreografia &&
    !hasDetailedRules;

  if (params.incluirEventoGeral) {
    const valorTaxaBase =
      params.configuracao?.cobra_taxa_participacao_geral === true &&
      regrasTaxaGeral.length === 0
        ? normalizeInteger(params.configuracao?.valor_taxa_participacao_centavos, 0)
        : 0;
    const valorTaxaRegras = regrasTaxaGeral.reduce(
      (acc, rule) => acc + resolveRuleAmount({ rule }),
      0,
    );
    const explicacoesTaxa = [
      ...(valorTaxaBase > 0 ? ["Taxa geral da edicao"] : []),
      ...regrasTaxaGeral.map((rule) => buildRuleExplanation(rule)),
    ];
    const valorTaxa = valorTaxaBase + valorTaxaRegras;

    linhas.push({
      id: "evento-geral",
      tipo: "EVENTO_GERAL",
      label: "Inscricao geral da edicao",
      valorCentavos: valorTaxa,
      detalhePrincipal: explicacoesTaxa.length > 0 ? explicacoesTaxa.join(" + ") : null,
      explicacoes: explicacoesTaxa,
      fonteCalculo:
        regrasTaxaGeral.length > 0 || valorTaxaBase > 0
          ? "REGRA_EDICAO"
          : "ITEM_CONFIGURADO",
      itemConfiguracaoId: null,
      coreografiaVinculoId: null,
    });
  }

  for (const item of params.itensConfiguracao) {
    linhas.push({
      id: item.id,
      tipo: "ITEM_EDICAO",
      label: item.nome,
      valorCentavos: normalizeInteger(item.valor_centavos, 0),
      detalhePrincipal: "Item configuravel adicional da edicao",
      explicacoes: ["Item adicional selecionado"],
      fonteCalculo: "ITEM_CONFIGURADO",
      itemConfiguracaoId: item.id,
      coreografiaVinculoId: null,
    });
  }

  const quantityRule = aplicaRegrasPorCoreografia
    ? sortRules(
        regras.filter((rule) => rule.tipo_regra === "POR_QUANTIDADE"),
      ).find((rule) => matchesQuantityRule(rule, totalCoreografias))
    : null;

  const quantityRuleAmount = quantityRule
    ? resolveRuleAmount({
        rule: quantityRule,
        quantidadeTotalCoreografias: totalCoreografias,
      })
    : 0;

  params.coreografiasSelecionadas.forEach((vinculo, index) => {
    const explicacoes: string[] = [];
    let valorCentavos = 0;
    let fonteCalculo: EventoEdicaoComposicaoFinanceiraLinha["fonteCalculo"] =
      "REGRA_EDICAO";

    if (aplicaRegrasPorCoreografia) {
      const specificRule = findSpecificRule(regras, vinculo);
      if (specificRule) {
        const specificAmount = resolveRuleAmount({ rule: specificRule });
        valorCentavos += specificAmount;
        explicacoes.push(buildRuleExplanation(specificRule));
      } else if (usaFallbackLegado) {
        const fallbackAmount = normalizeInteger(
          vinculo.valor_participacao_coreografia_centavos,
          0,
        );
        valorCentavos += fallbackAmount;
        fonteCalculo = "FALLBACK_LEGADO";
        explicacoes.push("Compatibilidade legada temporaria do vinculo artistico");
      }

      const progressionRule = sortRules(
        regras.filter((rule) => rule.tipo_regra === "POR_PROGRESSAO"),
      ).find((rule) => rule.ordem_progressao === index + 1);

      if (progressionRule) {
        const progressionAmount = resolveRuleAmount({
          rule: progressionRule,
          progressaoIndex: index + 1,
        });
        valorCentavos += progressionAmount;
        explicacoes.push(
          buildRuleExplanation(progressionRule, `${index + 1}a participacao`),
        );
      }

      if (quantityRule && index === 0 && quantityRuleAmount > 0) {
        valorCentavos += quantityRuleAmount;
        explicacoes.push(
          buildRuleExplanation(
            quantityRule,
            `${totalCoreografias} participacao(oes) na inscricao`,
          ),
        );
      }
    }

    linhas.push({
      id: vinculo.id,
      tipo: "COREOGRAFIA",
      label: `Coreografia: ${vinculo.coreografia.nome}`,
      valorCentavos,
      detalhePrincipal:
        explicacoes.length > 0 ? explicacoes.join(" + ") : "Sem regra financeira aplicada",
      explicacoes,
      fonteCalculo,
      itemConfiguracaoId: null,
      coreografiaVinculoId: vinculo.id,
    });
  });

  return {
    linhas,
    totalCentavos: linhas.reduce((acc, linha) => acc + linha.valorCentavos, 0),
  };
}
