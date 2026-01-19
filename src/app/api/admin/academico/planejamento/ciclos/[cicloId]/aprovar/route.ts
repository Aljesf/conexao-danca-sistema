import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "../../../_lib/auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const zId = z.coerce.number().int().positive();

export async function POST(_req: Request, ctx: { params: Promise<{ cicloId: string }> }) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;
  const admin = await getAdminContext();
  if (!admin.ok) return NextResponse.json(admin.body, { status: admin.status });

  const { cicloId } = await ctx.params;
  const cicloIdParsed = zId.safeParse(cicloId);
  if (!cicloIdParsed.success) {
    return NextResponse.json({ ok: false, code: "CICLO_ID_INVALIDO" }, { status: 400 });
  }

  const { data, error } = await admin.supabase
    .from("planejamento_ciclos")
    .update({
      status: "APROVADO",
      aprovado_por: admin.user.id,
      aprovado_em: new Date().toISOString(),
      updated_by: admin.user.id,
    })
    .eq("id", cicloIdParsed.data)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, code: "ERRO_APROVAR_CICLO", message: error?.message ?? "Erro" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, ciclo: data });
}
