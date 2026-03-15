import { NextResponse, type NextRequest } from "next/server";
import { getUserOrThrow, isAdminUser } from "../diario-de-classe/_lib/auth";
import {
  fetchProfessorAgendaHoje,
  fetchProfessorAniversariantesDia,
  fetchProfessorAniversariantesSemana,
  loadProfessorAppUserContext,
} from "../_lib/operacional";

export async function GET(request: NextRequest) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { supabase, user } = auth;

  let isAdmin = false;
  try {
    isAdmin = await isAdminUser(supabase, user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_PERMISSAO_ADMIN";
    return NextResponse.json({ error: "Falha ao validar acesso.", details: msg }, { status: 500 });
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
      }),
      fetchProfessorAniversariantesDia(supabase),
      fetchProfessorAniversariantesSemana(supabase),
    ]);

    return NextResponse.json({
      usuario: {
        id: ctx.userId,
        nome: ctx.nome,
        email: ctx.email,
        perfil: ctx.perfil,
      },
      agendaHoje,
      aniversariantesDia,
      aniversariantesSemana,
      podeVerOutrasTurmas: ctx.podeVerOutrasTurmas,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_DASHBOARD_PROFESSOR";
    return NextResponse.json({ error: "Falha ao carregar dashboard.", details: msg }, { status: 500 });
  }
}
