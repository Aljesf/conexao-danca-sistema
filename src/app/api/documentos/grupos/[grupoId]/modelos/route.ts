import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type SetModelosBody = {
  documento_modelo_ids: number[];
};

export async function GET(_: Request, ctx: { params: Promise<{ grupoId: string }> }) {
  const { grupoId } = await ctx.params;
  const id = Number(grupoId);

  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, message: "ID invalido." }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("documentos_grupos_modelos")
    .select("documento_modelo_id")
    .eq("grupo_id", id);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const ids = (data ?? [])
    .map((r) => Number((r as Record<string, unknown>).documento_modelo_id))
    .filter((n) => Number.isFinite(n));

  return NextResponse.json({ ok: true, data: ids }, { status: 200 });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ grupoId: string }> }) {
  const { grupoId } = await ctx.params;
  const grupoIdNum = Number(grupoId);

  if (!Number.isFinite(grupoIdNum)) {
    return NextResponse.json({ ok: false, message: "ID invalido." }, { status: 400 });
  }

  const body = (await req.json()) as SetModelosBody;
  const ids = Array.isArray(body?.documento_modelo_ids) ? body.documento_modelo_ids : [];

  const modeloIds = ids
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { error: delErr } = await supabase
    .from("documentos_grupos_modelos")
    .delete()
    .eq("grupo_id", grupoIdNum);

  if (delErr) {
    return NextResponse.json({ ok: false, message: delErr.message }, { status: 500 });
  }

  if (modeloIds.length > 0) {
    const rows = modeloIds.map((mid) => ({ grupo_id: grupoIdNum, documento_modelo_id: mid }));

    const { error: insErr } = await supabase
      .from("documentos_grupos_modelos")
      .insert(rows);

    if (insErr) {
      return NextResponse.json({ ok: false, message: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, data: modeloIds }, { status: 200 });
}

