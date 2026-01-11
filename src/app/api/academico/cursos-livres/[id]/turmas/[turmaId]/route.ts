import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

function parseId(param: string): number | null {
  const id = Number(param);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export async function DELETE(_req: Request, ctx: { params: { id: string; turmaId: string } }) {
  const cursoLivreId = parseId(ctx.params.id);
  const turmaId = parseId(ctx.params.turmaId);

  if (!cursoLivreId || !turmaId) {
    return NextResponse.json({ error: "parametros_invalidos" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
  }

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
