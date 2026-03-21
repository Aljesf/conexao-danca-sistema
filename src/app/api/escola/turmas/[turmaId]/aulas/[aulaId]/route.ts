import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { getAulaDetalheOperacional } from "@/lib/academico/turmas-operacional";

type RouteContext = {
  params: Promise<{ turmaId: string; aulaId: string }>;
};

export async function GET(request: NextRequest, ctx: RouteContext) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { turmaId: turmaIdRaw, aulaId: aulaIdRaw } = await ctx.params;
  const turmaId = Number(turmaIdRaw);
  const aulaId = Number(aulaIdRaw);

  if (!Number.isInteger(turmaId) || turmaId <= 0 || !Number.isInteger(aulaId) || aulaId <= 0) {
    return NextResponse.json({ ok: false, code: "PARAMETROS_INVALIDOS" }, { status: 400 });
  }

  try {
    const detalhe = await getAulaDetalheOperacional({
      supabase: auth.supabase,
      userId: auth.userId,
      turmaId,
      aulaId,
    });

    return NextResponse.json({ ok: true, ...detalhe }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_CARREGAR_AULA_ESCOLA";
    const status =
      message === "AULA_FORA_DA_TURMA"
        ? 404
        : message.includes("permissao") || message.includes("SEM_ACESSO")
          ? 403
          : message.includes("NAO_ENCONTRADA")
            ? 404
            : 500;
    return NextResponse.json({ ok: false, code: "ERRO_CARREGAR_AULA_ESCOLA", message }, { status });
  }
}
