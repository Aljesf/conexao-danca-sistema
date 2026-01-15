export function normalizeCnpj(value: string): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
  const v = normalizeCnpj(value);
  if (!v) return "";
  const p = v.slice(0, 14);
  const a = p.slice(0, 2);
  const b = p.slice(2, 5);
  const c = p.slice(5, 8);
  const d = p.slice(8, 12);
  const e = p.slice(12, 14);

  let out = a;
  if (b) out += "." + b;
  if (c) out += "." + c;
  if (d) out += "/" + d;
  if (e) out += "-" + e;
  return out;
}

export function validateCnpj(value: string): { ok: true } | { ok: false; reason: string } {
  const cnpj = normalizeCnpj(value);

  if (!cnpj) return { ok: false, reason: "vazio" };
  if (cnpj.length !== 14) return { ok: false, reason: "tamanho invalido" };
  if (/^(\d)\1{13}$/.test(cnpj)) return { ok: false, reason: "sequencia invalida" };

  const calcDig = (base: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i += 1) {
      sum += Number(base[i]) * weights[i];
    }
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const base12 = cnpj.slice(0, 12);
  const dig1 = calcDig(base12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const base13 = base12 + String(dig1);
  const dig2 = calcDig(base13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  const ok = cnpj === base12 + String(dig1) + String(dig2);
  return ok ? { ok: true } : { ok: false, reason: "digitos verificadores invalidos" };
}
