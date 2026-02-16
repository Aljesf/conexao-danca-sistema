export type VencimentoParams = {
  competenciaAnoMes: string; // YYYY-MM
  diaPreferido: number; // 1..28
  forcarUltimoVencimentoDia12?: boolean; // default true
};

function toInt(n: unknown, fallback: number): number {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? x : fallback;
}

function clampDiaPreferido(dia: number): number {
  if (dia < 1) return 1;
  if (dia > 28) return 28;
  return dia;
}

export function calcularDataVencimento(params: VencimentoParams): string {
  const { competenciaAnoMes } = params;
  const forcarUltimo = params.forcarUltimoVencimentoDia12 !== false;

  const [anoStr, mesStr] = competenciaAnoMes.split("-");
  const ano = toInt(anoStr, 0);
  const mes = toInt(mesStr, 0);

  if (!ano || !mes || mes < 1 || mes > 12) {
    throw new Error(`competenciaAnoMes_invalida:${competenciaAnoMes}`);
  }

  // Regra de negocio: ultimo vencimento do exercicio sempre 12/12.
  if (forcarUltimo && mes === 12) {
    return `${String(ano).padStart(4, "0")}-12-12`;
  }

  const dia = clampDiaPreferido(params.diaPreferido);
  return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
