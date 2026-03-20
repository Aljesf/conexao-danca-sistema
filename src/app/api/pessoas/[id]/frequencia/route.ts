import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { getHistoricoFrequenciaAluno } from "@/lib/academico/frequencia";

type RouteContext = {
  params: Promise<{ id?: string }>;
};

export async function GET(request: NextRequest, ctx: RouteContext) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const pessoaId = Number(id);
  if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
    return NextResponse.json({ ok: false, code: "PESSOA_ID_INVALIDO" }, { status: 400 });
  }

  try {
    const payload = await getHistoricoFrequenciaAluno({
      supabase: auth.supabase,
      alunoId: pessoaId,
    });

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_CARREGAR_FREQUENCIA_ALUNO";
    return NextResponse.json(
      { ok: false, code: "ERRO_CARREGAR_FREQUENCIA_ALUNO", message },
      { status: 500 },
    );
  }
}
