import { NextResponse, type NextRequest } from "next/server";
import { getUserOrThrow, isAdminUser } from "../../diario-de-classe/_lib/auth";
import { fetchProfessorAgendaHoje, loadProfessorAppUserContext } from "../../_lib/operacional";

export async function GET(request: NextRequest) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  const { supabase, user } = auth;
  const scope = String(new URL(request.url).searchParams.get("scope") ?? "own").toLowerCase();

  let isAdmin = false;
  try {
    isAdmin = await isAdminUser(supabase, user.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_PERMISSAO_ADMIN";
    return NextResponse.json({ error: "Falha ao validar acesso.", details: msg }, { status: 500 });
  }

  const ctx = await loadProfessorAppUserContext({
    supabase,
    userId: user.id,
    email: user.email,
    isAdmin,
  });

  const scopeAll = scope === "all" && ctx.podeVerOutrasTurmas;

  try {
    const aulas = await fetchProfessorAgendaHoje({
      supabase,
      colaboradorId: ctx.colaboradorId,
      scopeAll,
    });

    return NextResponse.json(
      {
        aulas,
        podeVerOutrasTurmas: ctx.podeVerOutrasTurmas,
        scope: scopeAll ? "all" : "own",
      },
      { status: 200 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ERRO_AGENDA_HOJE";
    return NextResponse.json({ error: "Falha ao carregar agenda.", details: msg }, { status: 500 });
  }
}
