export function formatBRLFromCents(value?: number | null): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "--";
  return (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
