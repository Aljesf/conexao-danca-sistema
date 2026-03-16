import { NextResponse, type NextRequest } from "next/server";
import { getUserOrThrow, isAdminUser } from "../../diario-de-classe/_lib/auth";
import {
  fetchProfessorAgendaHoje,
  getProfessorTodayISO,
  loadProfessorAppUserContext,
  normalizeProfessorDate,
} from "../../_lib/operacional";

function jsonError(status: number, error: string, details?: string) {
  return NextResponse.json(
    { ok: false, error, ...(details ? { details } : {}) },
    { status },
  );
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const rawDate = url.searchParams.get("data");
    const normalizedDate = normalizeProfessorDate(rawDate);

    if (rawDate && !normalizedDate) {
      return jsonError(400, "Parametro data invalido.", "Use o formato YYYY-MM-DD.");
    }

    const dataReferencia = normalizedDate ?? getProfessorTodayISO();
    const scope = String(url.searchParams.get("scope") ?? "own").toLowerCase();

    const auth = await getUserOrThrow(request);
    if (!auth.ok) {
      return jsonError(401, "Nao autenticado.");
    }

    const { supabase, user } = auth;

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

      const scopeAll = scope === "all" && ctx.podeVerOutrasTurmas;
      const aulas = await fetchProfessorAgendaHoje({
        supabase,
        colaboradorId: ctx.colaboradorId,
        scopeAll,
        dataReferencia,
      });

      return NextResponse.json(
        {
          ok: true,
          dataReferencia,
          aulas,
          podeVerOutrasTurmas: ctx.podeVerOutrasTurmas,
          scope: scopeAll ? "all" : "own",
        },
        { status: 200 },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ERRO_AGENDA_HOJE";
      return jsonError(500, "Falha ao carregar agenda.", msg);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_INTERNO_AGENDA";
    return jsonError(500, "Falha interna ao montar resposta JSON.", msg);
  }
}
