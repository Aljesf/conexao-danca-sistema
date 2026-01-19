import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

function parseId(value: string | undefined): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ turmaId?: string; encontroId?: string }> }) {
  const { turmaId: turmaIdRaw, encontroId: encontroIdRaw } = await ctx.params;
  const turmaId = parseId(turmaIdRaw);
  const encontroId = parseId(encontroIdRaw);

  if (!turmaId || !encontroId) {
    return NextResponse.json({ error: "parametros_invalidos" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "usuario_nao_autenticado" }, { status: 401 });
  }

  const { error } = await supabase
    .from("turma_encontros")
    .delete()
    .eq("id", encontroId)
    .eq("turma_id", turmaId);

  if (error) {
    return NextResponse.json(
      { error: "falha_remover_encontro", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
