import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getUserOrThrow, isAdminUser } from "../../../_lib/auth";
import { reabrirAulaExecucao } from "@/lib/academico/execucao-aula";

const zAulaId = z.coerce.number().int().positive();

export async function POST(request: NextRequest, ctx: { params: Promise<{ aulaId: string }> }) {
  const auth = await getUserOrThrow(request);
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

  try {
    const aula = await reabrirAulaExecucao({
      supabase,
      aulaId: aulaId.data,
    });

    return NextResponse.json({ ok: true, aula });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro";
    return NextResponse.json(
      { ok: false, code: "ERRO_REABRIR_AULA", message },
      { status: 500 }
    );
  }
}
