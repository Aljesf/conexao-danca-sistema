import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { getTurmaDetalheOperacional } from "@/lib/academico/turmas-operacional";

type RouteContext = {
  params: Promise<{ turmaId: string }>;
};

export async function GET(request: NextRequest, ctx: RouteContext) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { turmaId: turmaIdRaw } = await ctx.params;
  const turmaId = Number(turmaIdRaw);
  if (!Number.isInteger(turmaId) || turmaId <= 0) {
    return NextResponse.json({ ok: false, code: "TURMA_ID_INVALIDO" }, { status: 400 });
  }

  try {
    const detalhe = await getTurmaDetalheOperacional({
      supabase: auth.supabase,
      userId: auth.userId,
      turmaId,
    });

    return NextResponse.json({ ok: true, ...detalhe }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_CARREGAR_TURMA_ESCOLA";
    const status = message.includes("permissao") || message.includes("SEM_ACESSO") ? 403 : message.includes("NAO_ENCONTRADA") ? 404 : 500;
    return NextResponse.json({ ok: false, code: "ERRO_CARREGAR_TURMA_ESCOLA", message }, { status });
  }
}
