import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

function parseId(param: string): number | null {
  const id = Number(param);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ id: string; turmaId: string }> }) {
  const { id, turmaId: turmaIdRaw } = await ctx.params;
  const cursoLivreId = parseId(id);
  const turmaId = parseId(turmaIdRaw);

  if (!cursoLivreId || !turmaId) {
    return NextResponse.json({ error: "parametros_invalidos" }, { status: 400 });
  }

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data: turma, error: turmaError } = await supabase
    .from("turmas")
    .select("turma_id, curso_livre_id")
    .eq("turma_id", turmaId)
    .single();

  if (turmaError || !turma) {
    return NextResponse.json({ error: "turma_nao_encontrada" }, { status: 404 });
  }

  if (turma.curso_livre_id !== cursoLivreId) {
    return NextResponse.json({ error: "turma_nao_pertence_ao_curso_livre" }, { status: 409 });
  }

  const { error } = await supabase.from("turmas").delete().eq("turma_id", turmaId);

  if (error) {
    return NextResponse.json(
      {
        error: "nao_foi_possivel_apagar_turma",
        details: error.message,
        hint: "Se esta turma ja possui vinculos (ex.: matriculas), cancele a turma em vez de apagar.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
