export type CpfValidationResult =
  | { ok: true; cpf: string }
  | { ok: false; reason: "VAZIO" | "TAMANHO_INVALIDO" | "SEQUENCIA_INVALIDA" | "DV_INVALIDO" };

export function normalizeCpf(raw: string): string {
  return (raw ?? "").replace(/\D/g, "");
}

function isRepeatedSequence(cpf: string): boolean {
  return /^(\d)\1{10}$/.test(cpf);
}

function calcDv(base: string, factorStart: number): number {
  let sum = 0;
  let factor = factorStart;

  for (let i = 0; i < base.length; i += 1) {
    sum += Number(base[i]) * factor;
    factor -= 1;
  }

  const mod = sum % 11;
  return mod < 2 ? 0 : 11 - mod;
}

export function validateCpf(raw: string): CpfValidationResult {
  const cpf = normalizeCpf(raw);

  if (!cpf) return { ok: false, reason: "VAZIO" };
  if (cpf.length !== 11) return { ok: false, reason: "TAMANHO_INVALIDO" };
  if (isRepeatedSequence(cpf)) return { ok: false, reason: "SEQUENCIA_INVALIDA" };

  const base9 = cpf.slice(0, 9);
  const dv1 = calcDv(base9, 10);

  const base10 = cpf.slice(0, 10);
  const dv2 = calcDv(base10, 11);

  const dvInformado1 = Number(cpf[9]);
  const dvInformado2 = Number(cpf[10]);

  if (dv1 !== dvInformado1 || dv2 !== dvInformado2) {
    return { ok: false, reason: "DV_INVALIDO" };
  }

  return { ok: true, cpf };
}

export function isValidCpfOrEmpty(raw: string | null | undefined): boolean {
  const cleaned = normalizeCpf(raw ?? "");
  if (!cleaned) return true;
  return validateCpf(cleaned).ok;
}

export function formatCpf(raw: string): string {
  const cpf = normalizeCpf(raw).slice(0, 11);
  const p1 = cpf.slice(0, 3);
  const p2 = cpf.slice(3, 6);
  const p3 = cpf.slice(6, 9);
  const p4 = cpf.slice(9, 11);

  if (cpf.length <= 3) return p1;
  if (cpf.length <= 6) return `${p1}.${p2}`;
  if (cpf.length <= 9) return `${p1}.${p2}.${p3}`;
  return `${p1}.${p2}.${p3}-${p4}`;
}
