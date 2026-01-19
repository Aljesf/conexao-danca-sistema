import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "../../../_lib/auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const zId = z.coerce.number().int().positive();

export async function POST(req: Request, ctx: { params: Promise<{ blocoId: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const admin = await getAdminContext();
  if (!admin.ok) return NextResponse.json(admin.body, { status: admin.status });

  const { blocoId } = await ctx.params;
  const blocoIdParsed = zId.safeParse(blocoId);
  if (!blocoIdParsed.success) {
    return NextResponse.json({ ok: false, code: "BLOCO_ID_INVALIDO" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const schema = z.object({
    ordem: z.coerce.number().int().positive(),
    titulo: z.string().trim().min(1),
    minutos_min: z.coerce.number().int().positive().optional().nullable(),
    minutos_ideal: z.coerce.number().int().positive().optional().nullable(),
    minutos_max: z.coerce.number().int().positive().optional().nullable(),
    habilidade_id: z.coerce.number().int().positive().optional().nullable(),
    nivel_abordagem: z.enum(["INTRODUCAO", "PRATICA", "REFORCO", "CONSOLIDACAO"]).optional().nullable(),
    instrucoes: z.string().trim().optional().nullable(),
    musica_sugestao: z.string().trim().optional().nullable(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "PAYLOAD_INVALIDO" }, { status: 400 });
  }

  const payload = {
    bloco_id: blocoIdParsed.data,
    ordem: parsed.data.ordem,
    titulo: parsed.data.titulo,
    minutos_min: parsed.data.minutos_min ?? null,
    minutos_ideal: parsed.data.minutos_ideal ?? null,
    minutos_max: parsed.data.minutos_max ?? null,
    habilidade_id: parsed.data.habilidade_id ?? null,
    nivel_abordagem: parsed.data.nivel_abordagem ?? null,
    instrucoes: parsed.data.instrucoes ?? null,
    musica_sugestao: parsed.data.musica_sugestao ?? null,
    created_by: admin.user.id,
    updated_by: admin.user.id,
  };

  const { data, error } = await admin.supabase
    .from("plano_aula_subblocos")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { ok: false, code: "ERRO_CRIAR_SUBBLOCO", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, subbloco: data }, { status: 201 });
}
