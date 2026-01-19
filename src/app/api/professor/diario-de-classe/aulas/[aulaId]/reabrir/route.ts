import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserOrThrow, isAdminUser } from "../../../_lib/auth";

const zAulaId = z.coerce.number().int().positive();

export async function POST(_req: Request, ctx: { params: Promise<{ aulaId: string }> }) {
  const auth = await getUserOrThrow();
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const { aulaId: aulaIdRaw } = await ctx.params;
  const aulaId = zAulaId.safeParse(aulaIdRaw);
  if (!aulaId.success) return NextResponse.json({ ok: false, code: "AULA_ID_INVALIDO" }, { status: 400 });

  const { supabase, user } = auth;

  let admin = false;
  try {
    admin = await isAdminUser(supabase, user.id);
  } catch {
    return NextResponse.json({ ok: false, code: "ERRO_PERMISSAO_ADMIN" }, { status: 500 });
  }
  if (!admin) return NextResponse.json({ ok: false, code: "SOMENTE_ADMIN" }, { status: 403 });

  const { data, error } = await supabase
    .from("turma_aulas")
    .update({ fechada_em: null, fechada_por: null })
    .eq("id", aulaId.data)
    .select("id, turma_id, data_aula, fechada_em, fechada_por")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, code: "ERRO_REABRIR_AULA", message: error?.message ?? "Erro" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, aula: data });
}
