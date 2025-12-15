export function formatDateISO(dateIso?: string | null): string {
  if (!dateIso) return "--";
  const d = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatDateTimeISO(dateIso?: string | null): string {
  if (!dateIso) return "--";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return dateIso;
  const date = d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  const time = d.toLocaleTimeString("pt-BR", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" });
  return `${date} ${time} UTC`;
}
