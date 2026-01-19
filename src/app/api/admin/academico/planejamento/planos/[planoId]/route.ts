import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "../../_lib/auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const zId = z.coerce.number().int().positive();

export async function PUT(req: Request, ctx: { params: Promise<{ planoId: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const admin = await getAdminContext();
  if (!admin.ok) return NextResponse.json(admin.body, { status: admin.status });

  const { planoId } = await ctx.params;
  const planoIdParsed = zId.safeParse(planoId);
  if (!planoIdParsed.success) {
    return NextResponse.json({ ok: false, code: "PLANO_ID_INVALIDO" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const schema = z.object({
    aula_numero: z.coerce.number().int().positive().optional(),
    intencao_pedagogica: z.string().trim().optional().nullable(),
    observacoes_gerais: z.string().trim().optional().nullable(),
    playlist_url: z.string().trim().url().optional().nullable(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "PAYLOAD_INVALIDO" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    updated_by: admin.user.id,
  };

  if (typeof parsed.data.aula_numero === "number") patch.aula_numero = parsed.data.aula_numero;
  if (parsed.data.intencao_pedagogica !== undefined) {
    patch.intencao_pedagogica = parsed.data.intencao_pedagogica ?? null;
  }
  if (parsed.data.observacoes_gerais !== undefined) {
    patch.observacoes_gerais = parsed.data.observacoes_gerais ?? null;
  }
  if (parsed.data.playlist_url !== undefined) {
    patch.playlist_url = parsed.data.playlist_url ?? null;
  }

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ ok: false, code: "NENHUM_CAMPO_EDITAVEL" }, { status: 400 });
  }

  const { data, error } = await admin.supabase
    .from("planos_aula")
    .update(patch)
    .eq("id", planoIdParsed.data)
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, code: "ERRO_ATUALIZAR_PLANO", message: error?.message ?? "Erro" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, plano: data });
}
