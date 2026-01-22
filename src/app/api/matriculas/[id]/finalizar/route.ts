import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const supabase = getSupabaseAdmin();
  const { id: rawId } = await ctx.params;
  const id = Number(rawId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "matricula_id_invalido" }, { status: 400 });
  }

  const { data: matricula, error: getErr } = await supabase
    .from("matriculas")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();

  if (getErr || !matricula) {
    return NextResponse.json({ ok: false, error: "matricula_nao_encontrada" }, { status: 404 });
  }

  if (matricula.status === "ATIVA") {
    return NextResponse.json({ ok: true, data: { matricula_id: id, status: "ATIVA" } });
  }

  const { error: updErr } = await supabase
    .from("matriculas")
    .update({
      status: "ATIVA",
      rascunho_expira_em: null,
    })
    .eq("id", id);

  if (updErr) {
    return NextResponse.json({ ok: false, error: "falha_finalizar_matricula", detail: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { matricula_id: id, status: "ATIVA" } });
}

