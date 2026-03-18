type ErrorLike = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

const EXPURGO_COLUMN_HINTS = ["expurgada", "expurgada_em", "expurgada_por", "expurgo_motivo"];

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as ErrorLike).message;
    return typeof message === "string" ? message : JSON.stringify(error);
  }
  return String(error);
}

export function isMissingExpurgoColumnError(error: unknown): boolean {
  const message = extractErrorMessage(error).toLowerCase();
  if (!EXPURGO_COLUMN_HINTS.some((column) => message.includes(column))) {
    return false;
  }

  return (
    message.includes("schema cache") ||
    message.includes("could not find") ||
    message.includes("does not exist") ||
    message.includes("column") ||
    message.includes("42703")
  );
}

export function logExpurgoMigrationWarning(scope: string, error: unknown): void {
  console.error(
    `[${scope}] Ambiente inconsistente: colunas de expurgo ausentes em public.cobrancas. ` +
      "Aplicando fallback sem filtro de expurgo. Aplique a migration supabase/migrations/add_expurgo_cobrancas.sql.",
    error,
  );
}

