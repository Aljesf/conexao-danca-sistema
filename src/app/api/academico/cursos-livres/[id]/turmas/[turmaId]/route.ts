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

  const { error } = await supabase
    .from("turmas")
    .update({ curso_livre_id: null })
    .eq("turma_id", turmaId)
    .eq("curso_livre_id", cursoLivreId);

  if (error) {
    return NextResponse.json(
      { error: "falha_desvincular_turma", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
