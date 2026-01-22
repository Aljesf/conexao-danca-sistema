import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const linkId = Number(id);

  if (!Number.isFinite(linkId) || linkId <= 0) {
    return NextResponse.json(
      { ok: false, message: "ID do vinculo invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (Object.prototype.hasOwnProperty.call(body, "ativo")) {
    patch.ativo = Boolean(body.ativo);
  }
  if (Object.prototype.hasOwnProperty.call(body, "ordem")) {
    const n = Number(body.ordem);
    if (!Number.isFinite(n) || n <= 0) {
      return NextResponse.json(
        { ok: false, message: "ordem invalida." } satisfies ApiResp<never>,
        { status: 400 },
      );
    }
    patch.ordem = n;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { ok: false, message: "Nenhuma alteracao informada." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("documentos_conjuntos_grupos_modelos")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("grupo_modelo_id", linkId)
    .select("grupo_modelo_id,conjunto_grupo_id,modelo_id,ordem,ativo")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const linkId = Number(id);

  if (!Number.isFinite(linkId) || linkId <= 0) {
    return NextResponse.json(
      { ok: false, message: "ID do vinculo invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { error } = await supabase
    .from("documentos_conjuntos_grupos_modelos")
    .delete()
    .eq("grupo_modelo_id", linkId);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true } satisfies ApiResp<unknown>);
}

