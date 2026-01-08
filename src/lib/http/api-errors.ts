import { NextResponse } from "next/server";

export function jsonError(err: unknown) {
  const msg = err instanceof Error ? err.message : "ERRO_INESPERADO";

  const status =
    msg === "NAO_AUTENTICADO" ? 401 :
    msg === "SEM_PERMISSAO_MOVIMENTO_ADMIN" ? 403 :
    msg === "SERVICE_ROLE_NAO_CONFIGURADO" ? 500 :
    msg === "SUPABASE_ENV_NAO_CONFIGURADO" ? 500 :
    msg === "BENEFICIARIO_NAO_ENCONTRADO" ? 404 :
    msg === "BENEFICIARIO_NAO_APROVADO" ? 409 :
    msg === "LOTE_SEM_SALDO" ? 409 :
    msg === "VALIDACAO_INVALIDA" ? 400 : 500;

  return NextResponse.json({ ok: false, codigo: msg }, { status });
}

export function zodToValidationError(err: unknown): Error {
  const zodName = (err as { name?: unknown } | null)?.name;
  if (zodName === "ZodError") return new Error("VALIDACAO_INVALIDA");
  return err instanceof Error ? err : new Error("ERRO_INESPERADO");
}
