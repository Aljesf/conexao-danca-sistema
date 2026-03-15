import { NextResponse, type NextRequest } from "next/server";
import { getUserOrThrow, isAdminUser } from "../diario-de-classe/_lib/auth";
import { fetchProfessorAgendaHoje, loadProfessorAppUserContext } from "../_lib/operacional";

export async function GET(request: NextRequest) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { supabase, user } = auth;
  const scopeParam = String(new URL(request.url).searchParams.get("scope") ?? "own").toLowerCase();

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

    const scopeAll = scopeParam === "all" && ctx.podeVerOutrasTurmas;
    const turmas = await fetchProfessorAgendaHoje({
      supabase,
      colaboradorId: ctx.colaboradorId,
      scopeAll,
    });

    return NextResponse.json({
      turmas,
      scope: scopeAll ? "all" : "own",
      podeVerOutrasTurmas: ctx.podeVerOutrasTurmas,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_TURMAS_PROFESSOR";
    return NextResponse.json({ error: "Falha ao carregar turmas.", details: msg }, { status: 500 });
  }
}
