import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

function parseId(value: string | undefined): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ turmaId?: string; encontroId?: string }> }) {
  const { turmaId: turmaIdRaw, encontroId: encontroIdRaw } = await ctx.params;
  const turmaId = parseId(turmaIdRaw);
  const encontroId = parseId(encontroIdRaw);

  if (!turmaId || !encontroId) {
    return NextResponse.json({ error: "parametros_invalidos" }, { status: 400 });
  }

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

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
