export type BolsaTipoModo = "INTEGRAL" | "PERCENTUAL" | "VALOR_FINAL_FAMILIA";
export type BolsaConcessaoStatus = "ATIVA" | "SUSPENSA" | "ENCERRADA";
export type BolsaLedgerOrigemContratado = "MANUAL" | "TABELA_PRECOS";

export function isBolsaTipoModo(value: unknown): value is BolsaTipoModo {
  return value === "INTEGRAL" || value === "PERCENTUAL" || value === "VALOR_FINAL_FAMILIA";
}

export function isBolsaConcessaoStatus(value: unknown): value is BolsaConcessaoStatus {
  return value === "ATIVA" || value === "SUSPENSA" || value === "ENCERRADA";
}

export function isBolsaLedgerOrigemContratado(value: unknown): value is BolsaLedgerOrigemContratado {
  return value === "MANUAL" || value === "TABELA_PRECOS";
}

export function calcularValorFamiliaCentavos(params: {
  modo: BolsaTipoModo;
  valorContratadoCentavos: number;
  percentualDesconto?: number | null;
  valorFinalFamiliaCentavos?: number | null;
}): number {
  const { modo, valorContratadoCentavos, percentualDesconto, valorFinalFamiliaCentavos } = params;

  if (!Number.isFinite(valorContratadoCentavos) || valorContratadoCentavos < 0) return 0;

  if (modo === "INTEGRAL") return 0;

  if (modo === "PERCENTUAL") {
    const p = typeof percentualDesconto === "number" && Number.isFinite(percentualDesconto) ? percentualDesconto : 0;
    const pClamped = Math.max(0, Math.min(100, p));
    const familia = Math.round(valorContratadoCentavos * (1 - pClamped / 100));
    return Math.max(0, familia);
  }

  const v =
    typeof valorFinalFamiliaCentavos === "number" && Number.isFinite(valorFinalFamiliaCentavos)
      ? valorFinalFamiliaCentavos
      : 0;
  return Math.max(0, Math.round(v));
}
