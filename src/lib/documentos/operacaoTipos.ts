export const OPERACAO_TIPOS = {
  MATRICULA: "MATRICULA",
} as const;

export type OperacaoTipo = (typeof OPERACAO_TIPOS)[keyof typeof OPERACAO_TIPOS];

export function normalizeOperacaoTipo(input: string): OperacaoTipo | string {
  const t = (input ?? "").trim().toUpperCase();
  if (t === "MATRICULA" || t === "MATRICULAS" || t === "MATRICULA_ID" || t === "MATRICULA_REGULAR") {
    return OPERACAO_TIPOS.MATRICULA;
  }
  return t;
}
