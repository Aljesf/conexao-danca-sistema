export type DescricaoCobrancaParams = {
  contexto: "FATURA_CREDITO_CONEXAO";
  faturaId: number;
  periodo: string; // YYYY-MM
  itensDescricao?: string[];
  maxLen?: number; // default 140
};

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function trunc(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return `${s.slice(0, Math.max(0, maxLen - 1)).trimEnd()}...`;
}

export function buildDescricaoCobranca(p: DescricaoCobrancaParams): string {
  const maxLen = p.maxLen ?? 140;
  const base = clean(`Conta interna - ${p.periodo} - Fatura #${p.faturaId}`);

  const extras = (p.itensDescricao ?? [])
    .map(clean)
    .filter(Boolean)
    .filter((x) => !/mensalidade/i.test(x));

  if (extras.length === 0) return trunc(base, maxLen);

  const extrasShort = extras.slice(0, 3).join(" + ");
  return trunc(`${base} (+ ${extrasShort})`, maxLen);
}

