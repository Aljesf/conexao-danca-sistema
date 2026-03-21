import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { canAccessTurma } from "@/app/api/professor/diario-de-classe/_lib/auth";
import { abrirAula } from "@/lib/academico/execucao-aula";

type RouteContext = {
  params: Promise<{ id: string; aulaId: string }>;
};

export async function POST(request: NextRequest, ctx: RouteContext) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { id, aulaId } = await ctx.params;
  const turmaId = Number(id);
  const diarioAulaId = Number(aulaId);

  if (!Number.isFinite(turmaId) || turmaId <= 0 || !Number.isFinite(diarioAulaId) || diarioAulaId <= 0) {
    return NextResponse.json({ ok: false, code: "PARAMETROS_INVALIDOS" }, { status: 400 });
  }

  const acesso = await canAccessTurma({
    supabase: auth.supabase,
    userId: auth.userId,
    turmaId,
  });
  if (!acesso.ok) {
    return NextResponse.json(acesso, { status: acesso.status });
  }

  const { data: aulaBase, error: aulaError } = await auth.supabase
    .from("turma_aulas")
    .select("id,turma_id,hora_inicio,hora_fim")
    .eq("id", diarioAulaId)
    .eq("turma_id", turmaId)
    .single();

  if (aulaError || !aulaBase) {
    return NextResponse.json({ ok: false, code: "AULA_NAO_ENCONTRADA" }, { status: 404 });
  }

  try {
    const aula = await abrirAula({
      supabase: auth.supabase,
      aulaId: diarioAulaId,
      userId: auth.userId,
      horaInicio: aulaBase.hora_inicio,
      horaFim: aulaBase.hora_fim,
    });
    return NextResponse.json({ ok: true, aula });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_ABRIR_AULA";
    return NextResponse.json({ ok: false, code: "ERRO_ABRIR_AULA", message }, { status: 500 });
  }
}
