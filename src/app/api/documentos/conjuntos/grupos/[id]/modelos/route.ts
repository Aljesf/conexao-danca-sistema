import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type ApiResp<T> = { ok: boolean; data?: T; message?: string };

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const grupoId = Number(id);
  if (!Number.isFinite(grupoId) || grupoId <= 0) {
    return NextResponse.json(
      { ok: false, message: "ID do grupo invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("documentos_conjuntos_grupos_modelos")
    .select("grupo_modelo_id,ordem,ativo,modelo_id, documentos_modelo:modelo_id ( id,titulo,formato,ativo,tipo_documento_id )")
    .eq("conjunto_grupo_id", grupoId)
    .order("ordem", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const grupoId = Number(id);
  if (!Number.isFinite(grupoId) || grupoId <= 0) {
    return NextResponse.json(
      { ok: false, message: "ID do grupo invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const body = (await req.json()) as Record<string, unknown>;
  const modeloId = Number(body.modelo_id);
  const ordem = body.ordem === undefined || body.ordem === null ? 1 : Number(body.ordem);

  if (!Number.isFinite(modeloId) || modeloId <= 0) {
    return NextResponse.json(
      { ok: false, message: "modelo_id invalido." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }
  if (!Number.isFinite(ordem) || ordem <= 0) {
    return NextResponse.json(
      { ok: false, message: "ordem invalida." } satisfies ApiResp<never>,
      { status: 400 },
    );
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("documentos_conjuntos_grupos_modelos")
    .insert({ conjunto_grupo_id: grupoId, modelo_id: modeloId, ordem, ativo: true })
    .select("grupo_modelo_id,conjunto_grupo_id,modelo_id,ordem,ativo")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message } satisfies ApiResp<never>, { status: 500 });
  }

  return NextResponse.json({ ok: true, data } satisfies ApiResp<unknown>, { status: 201 });
}

