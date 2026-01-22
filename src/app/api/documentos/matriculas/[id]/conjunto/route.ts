import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type PutBody = { documento_conjunto_id: number | null };

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const matriculaId = Number(id);
  if (!Number.isFinite(matriculaId)) {
    return NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { data, error } = await supabase
    .from("matriculas")
    .select("id, documento_conjunto_id")
    .eq("id", matriculaId)
    .single();

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 404 });
  return NextResponse.json({ ok: true, data }, { status: 200 });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const matriculaId = Number(id);
  if (!Number.isFinite(matriculaId)) {
    return NextResponse.json({ ok: false, message: "ID inválido." }, { status: 400 });
  }

  const body = (await req.json()) as PutBody;
  const conjuntoId = body?.documento_conjunto_id;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  if (conjuntoId !== null && typeof conjuntoId !== "number") {
    return NextResponse.json({ ok: false, message: "documento_conjunto_id inválido." }, { status: 400 });
  }

  const patch = { documento_conjunto_id: conjuntoId };

  const { data, error } = await supabase
    .from("matriculas")
    .update(patch)
    .eq("id", matriculaId)
    .select("id, documento_conjunto_id")
    .single();

  if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data }, { status: 200 });
}

