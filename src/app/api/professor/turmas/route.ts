import { NextResponse, type NextRequest } from "next/server";
import { getUserOrThrow, isAdminUser } from "../diario-de-classe/_lib/auth";
import {
  fetchProfessorAgendaHoje,
  getProfessorTodayISO,
  loadProfessorAppUserContext,
  normalizeProfessorDate,
} from "../_lib/operacional";

function jsonError(status: number, error: string, details?: string) {
  return NextResponse.json(
    { ok: false, error, ...(details ? { details } : {}) },
    { status },
  );
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getUserOrThrow(request);
    if (!auth.ok) {
      return jsonError(401, "Nao autenticado.");
    }

    const { supabase, user } = auth;
    const url = new URL(request.url);
    const scopeParam = String(url.searchParams.get("scope") ?? "own").toLowerCase();
    const rawDate = url.searchParams.get("data");
    const normalizedDate = normalizeProfessorDate(rawDate);

    if (rawDate && !normalizedDate) {
      return jsonError(400, "Parametro data invalido.", "Use o formato YYYY-MM-DD.");
    }

    const dataReferencia = normalizedDate ?? getProfessorTodayISO();

    let isAdmin = false;
    try {
      isAdmin = await isAdminUser(supabase, user.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ERRO_PERMISSAO_ADMIN";
      return jsonError(500, "Falha ao validar acesso.", msg);
    }

    try {
      const ctx = await loadProfessorAppUserContext({
        supabase,
        userId: user.id,
        email: user.email,
        isAdmin,
      });

      const scopeAll = scopeParam === "all" && ctx.podeVerOutrasTurmas;
      const turmas = await fetchProfessorAgendaHoje({
        supabase,
        colaboradorId: ctx.colaboradorId,
        scopeAll,
        dataReferencia,
      });

      return NextResponse.json({
        ok: true,
        turmas,
        dataReferencia,
        scope: scopeAll ? "all" : "own",
        podeVerOutrasTurmas: ctx.podeVerOutrasTurmas,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ERRO_TURMAS_PROFESSOR";
      return jsonError(500, "Falha ao carregar turmas.", msg);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_INTERNO_TURMAS";
    return jsonError(500, "Falha interna ao montar resposta JSON.", msg);
  }
}
