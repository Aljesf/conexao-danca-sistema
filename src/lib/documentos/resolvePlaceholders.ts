export type DocumentoVariavel = {
  codigo: string;
  path_origem: string | null;
  formato: string | null; // ex: BRL, CPF, DATA, etc (ajuste conforme seu schema)
  tipo: string | null;
};

function getByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".").map((p) => p.trim()).filter(Boolean);
  let cur: unknown = obj;
  for (const part of parts) {
    if (!cur || typeof cur !== "object") return undefined;
    const rec = cur as Record<string, unknown>;
    cur = rec[part];
  }
  return cur;
}

function formatValue(value: unknown, formato: string | null): string {
  if (value === null || value === undefined) return "";

  const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";

  if (!formato) return raw;

  const f = formato.toUpperCase();

  if (f === "CPF") {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    return raw;
  }

  if (f === "BRL") {
    const n = Number(raw);
    if (!Number.isFinite(n)) return raw;
    const reais = n >= 1000 && Number.isInteger(n) ? n / 100 : n;
    return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  return raw;
}

/**
 * Substitui {{CODIGO}} por valor resolvido via tabela documentos_variaveis.
 * Se nao encontrar variavel ou valor, substitui por string vazia (comportamento atual),
 * mas agora com contexto correto, deve preencher.
 */
export function resolvePlaceholdersHtml(params: {
  htmlTemplate: string;
  variaveisByCodigo: Map<string, DocumentoVariavel>;
  contexto: Record<string, unknown>;
}): string {
  const { htmlTemplate, variaveisByCodigo, contexto } = params;

  return htmlTemplate.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_match, codeRaw: string) => {
    const code = String(codeRaw || "").trim();
    const v = variaveisByCodigo.get(code);
    if (!v || !v.path_origem) {
      const manualVal = getByPath(contexto, `variaveis_manuais.${code}`);
      if (typeof manualVal === "undefined") return "";
      return formatValue(manualVal, v?.formato ?? null);
    }
    const val = getByPath(contexto, v.path_origem);
    return formatValue(val, v.formato);
  });
}
