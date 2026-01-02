import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; grupo_modelo_id: string }> }) {
  const { id, grupo_modelo_id } = await ctx.params;
  const grupoId = Number(id);
  const linkId = Number(grupo_modelo_id);

  if (!Number.isFinite(grupoId) || grupoId <= 0) {
    return NextResponse.json(
      { ok: false, message: "ID do grupo invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }
  if (!Number.isFinite(linkId) || linkId <= 0) {
    return NextResponse.json(
      { ok: false, message: "ID do vinculo invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const body = (await req.json()) as Record<string, unknown>;
  const ativo = body.ativo === undefined ? false : Boolean(body.ativo);

  const supabase = await getSupabaseServerSSR();

  const { data, error } = await supabase
    .from("documentos_conjuntos_grupos_modelos")
    .update({ ativo, updated_at: new Date().toISOString() })
    .eq("grupo_modelo_id", linkId)
    .eq("conjunto_grupo_id", grupoId)
    .select("grupo_modelo_id,ativo")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}
