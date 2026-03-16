import { NextResponse, type NextRequest } from "next/server";
import { getUserOrThrow, isAdminUser } from "../diario-de-classe/_lib/auth";
import {
  fetchProfessorAgendaHoje,
  fetchProfessorAniversariantesDia,
  fetchProfessorAniversariantesSemana,
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
    const rawDate = new URL(request.url).searchParams.get("data");
    const normalizedDate = normalizeProfessorDate(rawDate);

    if (rawDate && !normalizedDate) {
      return jsonError(400, "Parametro data invalido.", "Use o formato YYYY-MM-DD.");
    }

    const dataReferencia = normalizedDate ?? getProfessorTodayISO();

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

      const [agendaHoje, aniversariantesDia, aniversariantesSemana] = await Promise.all([
        fetchProfessorAgendaHoje({
          supabase,
          colaboradorId: ctx.colaboradorId,
          scopeAll: false,
          dataReferencia,
        }),
        fetchProfessorAniversariantesDia({
          supabase,
          dataReferencia,
        }),
        fetchProfessorAniversariantesSemana({
          supabase,
          dataReferencia,
        }),
      ]);

      return NextResponse.json({
        ok: true,
        usuario: {
          id: ctx.userId,
          nome: ctx.nome,
          email: ctx.email,
          perfil: ctx.perfil,
        },
        dataReferencia,
        agendaHoje,
        aniversariantesDia,
        aniversariantesSemana,
        podeVerOutrasTurmas: ctx.podeVerOutrasTurmas,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ERRO_DASHBOARD_PROFESSOR";
      return jsonError(500, "Falha ao carregar dashboard.", msg);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_INTERNO_DASHBOARD";
    return jsonError(500, "Falha interna ao montar resposta JSON.", msg);
  }
}
