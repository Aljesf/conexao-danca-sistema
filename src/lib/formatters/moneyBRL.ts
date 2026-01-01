export function formatBRLFromCentavos(valueCentavos: number | null | undefined): string {
  const v = typeof valueCentavos === "number" && Number.isFinite(valueCentavos) ? valueCentavos : 0;
  const reais = v / 100;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
}

/**
 * Aceita:
 * - "R$ 1.234,56"
 * - "1234,56"
 * - "1234.56"
 * - "1234"
 * Retorna integer em centavos.
 * Se invalido, retorna null.
 */
export function parseBRLToCentavos(input: string): number | null {
  const raw = (input || "").trim();
  if (!raw) return null;

  const cleaned = raw.replace(/\s/g, "").replace(/^R\$/i, "").replace(/[^\d,.-]/g, "");

  if (!cleaned) return null;

  if (cleaned.includes(",")) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    if (!Number.isFinite(n)) return null;
    return Math.round(n * 100);
  }

  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
