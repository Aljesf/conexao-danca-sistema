import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/api-auth";
import { getHistoricoFrequenciaTurma, mapStatusPresenca } from "@/lib/academico/frequencia";
import { canAccessTurma } from "@/app/api/professor/diario-de-classe/_lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const zStatus = z
  .string()
  .transform((value) => mapStatusPresenca(value))
  .refine((value) => value !== null, "status_presenca invalido")
  .optional();

const zDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

export async function GET(request: NextRequest, ctx: RouteContext) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await ctx.params;
  const turmaId = Number(id);
  if (!Number.isFinite(turmaId) || turmaId <= 0) {
    return NextResponse.json({ ok: false, code: "TURMA_ID_INVALIDO" }, { status: 400 });
  }

  const acesso = await canAccessTurma({
    supabase: auth.supabase,
    userId: auth.userId,
    turmaId,
  });
  if (!acesso.ok) {
    return NextResponse.json(acesso, { status: acesso.status });
  }

  const url = new URL(request.url);
  const dataInicio = zDate.safeParse(url.searchParams.get("data_inicio") ?? undefined);
  const dataFim = zDate.safeParse(url.searchParams.get("data_fim") ?? undefined);
  const statusPresenca = zStatus.safeParse(url.searchParams.get("status_presenca") ?? undefined);
  const alunoIdRaw = url.searchParams.get("aluno_id");
  const alunoId = alunoIdRaw ? Number(alunoIdRaw) : null;

  if (!dataInicio.success || !dataFim.success || !statusPresenca.success) {
    return NextResponse.json(
      { ok: false, code: "FILTROS_INVALIDOS" },
      { status: 400 },
    );
  }

  if (alunoIdRaw && (!Number.isFinite(alunoId) || !alunoId || alunoId <= 0)) {
    return NextResponse.json({ ok: false, code: "ALUNO_ID_INVALIDO" }, { status: 400 });
  }

  try {
    const payload = await getHistoricoFrequenciaTurma({
      supabase: auth.supabase,
      turmaId,
      dataInicio: dataInicio.data ?? null,
      dataFim: dataFim.data ?? null,
      statusPresenca: statusPresenca.data ?? null,
      alunoId: alunoId ?? null,
    });

    return NextResponse.json({ ok: true, ...payload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERRO_CARREGAR_FREQUENCIA_TURMA";
    return NextResponse.json(
      { ok: false, code: "ERRO_CARREGAR_FREQUENCIA_TURMA", message },
      { status: 500 },
    );
  }
}
