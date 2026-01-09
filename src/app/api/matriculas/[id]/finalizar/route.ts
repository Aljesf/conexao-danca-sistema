import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export async function POST(_: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(_ as any);
  if (denied) return denied as any;
  const cookieStore = await cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: auth } = await supabaseAuth.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ ok: false, error: "nao_autenticado" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const id = Number(ctx.params.id);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "matricula_id_invalido" }, { status: 400 });
  }

  const { data: matricula, error: getErr } = await supabase
    .from("matriculas")
    .select("id,status_fluxo")
    .eq("id", id)
    .maybeSingle();

  if (getErr || !matricula) {
    return NextResponse.json({ ok: false, error: "matricula_nao_encontrada" }, { status: 404 });
  }

  if (matricula.status_fluxo !== "AGUARDANDO_LIQUIDACAO") {
    return NextResponse.json(
      { ok: false, error: "matricula_nao_esta_em_liquidacao", status_fluxo: matricula.status_fluxo },
      { status: 409 },
    );
  }

  const { error: updErr } = await supabase
    .from("matriculas")
    .update({
      status_fluxo: "ATIVA",
      concluida_em: new Date().toISOString(),
      rascunho_expira_em: null,
    })
    .eq("id", id);

  if (updErr) {
    return NextResponse.json({ ok: false, error: "falha_finalizar_matricula", detail: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: { matricula_id: id, status_fluxo: "ATIVA" } });
}
