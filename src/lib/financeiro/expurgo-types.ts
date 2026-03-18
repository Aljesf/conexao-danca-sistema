export const EXPURGO_TIPOS = ["ERRO_TECNICO", "DUPLICIDADE", "GERACAO_INDEVIDA"] as const;

export type ExpurgoTipo = (typeof EXPURGO_TIPOS)[number];

export const EXPURGO_TIPO_LABELS: Record<ExpurgoTipo, string> = {
  ERRO_TECNICO: "Erro tecnico",
  DUPLICIDADE: "Duplicidade",
  GERACAO_INDEVIDA: "Geracao indevida",
};

export function isExpurgoTipo(value: unknown): value is ExpurgoTipo {
  return typeof value === "string" && EXPURGO_TIPOS.includes(value as ExpurgoTipo);
}

export function formatExpurgoMotivo(tipo: ExpurgoTipo, motivo: string): string {
  return `[${tipo}] ${motivo.trim()}`;
}

