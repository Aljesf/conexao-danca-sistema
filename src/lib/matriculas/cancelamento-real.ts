export const CANCELAMENTO_TIPOS = [
  "DESISTENCIA_REAL",
  "AJUSTE_SISTEMA",
  "DUPLICIDADE",
  "TRANSFERENCIA",
  "TROCA_TURMA",
  "OUTRO",
] as const;

export type CancelamentoTipoReal = (typeof CANCELAMENTO_TIPOS)[number];

export type CancelamentoSemantico = {
  cancelamentoTipo: CancelamentoTipoReal;
  geraPerdaFinanceira: boolean;
  fonte: "EXPLICITO" | "LEGADO_MOTIVO" | "PADRAO";
};

function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeText(value: string | null): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function inferirPorMotivo(motivo: string | null): CancelamentoSemantico {
  const normalized = normalizeText(motivo);

  if (!normalized) {
    return {
      cancelamentoTipo: "OUTRO",
      geraPerdaFinanceira: false,
      fonte: "PADRAO",
    };
  }

  if (
    normalized.includes("DESIST") ||
    normalized.includes("DISTANCIA") ||
    normalized.includes("ABANDON") ||
    normalized.includes("SEM INTERESSE")
  ) {
    return {
      cancelamentoTipo: "DESISTENCIA_REAL",
      geraPerdaFinanceira: true,
      fonte: "LEGADO_MOTIVO",
    };
  }

  if (normalized.includes("DUPLIC")) {
    return {
      cancelamentoTipo: "DUPLICIDADE",
      geraPerdaFinanceira: false,
      fonte: "LEGADO_MOTIVO",
    };
  }

  if (
    normalized.includes("TRANSFER") ||
    normalized.includes("MUDANCA DE MODALIDADE") ||
    normalized.includes("MUDANCA DE MODULO")
  ) {
    return {
      cancelamentoTipo: "TRANSFERENCIA",
      geraPerdaFinanceira: false,
      fonte: "LEGADO_MOTIVO",
    };
  }

  if (
    normalized.includes("TROCA TURMA") ||
    normalized.includes("MUDANCA DE HORARIO") ||
    normalized.includes("HORARIO")
  ) {
    return {
      cancelamentoTipo: "TROCA_TURMA",
      geraPerdaFinanceira: false,
      fonte: "LEGADO_MOTIVO",
    };
  }

  if (
    normalized.includes("ERRO") ||
    normalized.includes("AJUSTE") ||
    normalized.includes("SISTEMA") ||
    normalized.includes("LANCAMENTO")
  ) {
    return {
      cancelamentoTipo: "AJUSTE_SISTEMA",
      geraPerdaFinanceira: false,
      fonte: "LEGADO_MOTIVO",
    };
  }

  return {
    cancelamentoTipo: "OUTRO",
    geraPerdaFinanceira: false,
    fonte: "LEGADO_MOTIVO",
  };
}

export function resolveCancelamentoSemantico(params: {
  cancelamentoTipo?: string | null;
  geraPerdaFinanceira?: boolean | null;
  motivo?: string | null;
}): CancelamentoSemantico {
  const cancelamentoTipo = textOrNull(params.cancelamentoTipo);
  const normalizedType = normalizeText(cancelamentoTipo) as CancelamentoTipoReal | "";

  if (normalizedType && CANCELAMENTO_TIPOS.includes(normalizedType)) {
    return {
      cancelamentoTipo: normalizedType,
      geraPerdaFinanceira:
        typeof params.geraPerdaFinanceira === "boolean"
          ? params.geraPerdaFinanceira
          : normalizedType === "DESISTENCIA_REAL",
      fonte: "EXPLICITO",
    };
  }

  return inferirPorMotivo(textOrNull(params.motivo));
}
