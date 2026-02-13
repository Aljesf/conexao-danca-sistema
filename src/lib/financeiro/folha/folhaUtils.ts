import { toCompetenciaYYYYMM } from "@/lib/financeiro/competencia";

export type FolhaCompetenciaCalcInput = {
  data: Date;
  diaFechamento: number; // 1..31
};

/**
 * Regra:
 * - se dia(data) <= diaFechamento -> competencia do mes da data
 * - se dia(data) > diaFechamento -> competencia do mes seguinte
 */
export function calcularCompetenciaFolha({ data, diaFechamento }: FolhaCompetenciaCalcInput): string {
  const dia = data.getDate();
  const base = new Date(data.getFullYear(), data.getMonth(), 1);
  if (dia <= diaFechamento) return toCompetenciaYYYYMM(base);
  const prox = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return toCompetenciaYYYYMM(prox);
}

/**
 * Data prevista de pagamento.
 * Padrao: pagar no mes seguinte (ex.: competencia 2026-02 paga em 2026-03 dia_pagamento)
 */
export function calcularDataPagamentoPrevista(
  competenciaYYYYMM: string,
  diaPagamento: number,
  pagamentoNoMesSeguinte: boolean,
): Date {
  const [yStr, mStr] = competenciaYYYYMM.split("-");
  const y = Number(yStr);
  const m = Number(mStr); // 1..12
  const base = new Date(y, m - 1, 1);
  const alvo = pagamentoNoMesSeguinte ? new Date(base.getFullYear(), base.getMonth() + 1, 1) : base;
  return new Date(alvo.getFullYear(), alvo.getMonth(), diaPagamento);
}
