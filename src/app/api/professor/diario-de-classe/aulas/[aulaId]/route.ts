import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUserOrThrow, canAccessTurma } from "../../_lib/auth";
import { getAulaExecucaoById } from "@/lib/academico/execucao-aula";

const zAulaId = z.coerce.number().int().positive();

export async function GET(request: NextRequest, ctx: { params: Promise<{ aulaId: string }> }) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const { aulaId: aulaIdRaw } = await ctx.params;
  const aulaId = zAulaId.safeParse(aulaIdRaw);
  if (!aulaId.success) return NextResponse.json({ ok: false, code: "AULA_ID_INVALIDO" }, { status: 400 });

  const { supabase, user } = auth;

  const { data: aulaBase, error } = await supabase
    .from("turma_aulas")
    .select("id, turma_id")
    .eq("id", aulaId.data)
    .single();

  if (error || !aulaBase) return NextResponse.json({ ok: false, code: "AULA_NAO_ENCONTRADA" }, { status: 404 });

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: aulaBase.turma_id });
  if (!perm.ok) return NextResponse.json(perm, { status: perm.status });

  try {
    const aula = await getAulaExecucaoById(supabase, aulaId.data);
    return NextResponse.json({ ok: true, aula });
  } catch (loadError) {
    const message = loadError instanceof Error ? loadError.message : "AULA_NAO_ENCONTRADA";
    return NextResponse.json({ ok: false, code: "AULA_NAO_ENCONTRADA", message }, { status: 404 });
  }
}
