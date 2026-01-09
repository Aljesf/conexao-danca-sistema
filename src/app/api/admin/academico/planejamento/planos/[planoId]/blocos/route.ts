import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "../../../_lib/auth";

const zId = z.coerce.number().int().positive();

export async function POST(req: Request, ctx: { params: { planoId: string } }) {
  const admin = await getAdminContext();
  if (!admin.ok) return NextResponse.json(admin.body, { status: admin.status });

  const planoId = zId.safeParse(ctx.params.planoId);
  if (!planoId.success) {
    return NextResponse.json({ ok: false, code: "PLANO_ID_INVALIDO" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const schema = z.object({
    ordem: z.coerce.number().int().positive(),
    titulo: z.string().trim().min(1),
    objetivo: z.string().trim().optional().nullable(),
    minutos_min: z.coerce.number().int().positive().optional().nullable(),
    minutos_ideal: z.coerce.number().int().positive().optional().nullable(),
    minutos_max: z.coerce.number().int().positive().optional().nullable(),
    musica_sugestao: z.string().trim().optional().nullable(),
    observacoes: z.string().trim().optional().nullable(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "PAYLOAD_INVALIDO" }, { status: 400 });
  }

  const payload = {
    plano_aula_id: planoId.data,
    ordem: parsed.data.ordem,
    titulo: parsed.data.titulo,
    objetivo: parsed.data.objetivo ?? null,
    minutos_min: parsed.data.minutos_min ?? null,
    minutos_ideal: parsed.data.minutos_ideal ?? null,
    minutos_max: parsed.data.minutos_max ?? null,
    musica_sugestao: parsed.data.musica_sugestao ?? null,
    observacoes: parsed.data.observacoes ?? null,
    created_by: admin.user.id,
    updated_by: admin.user.id,
  };

  const { data, error } = await admin.supabase
    .from("plano_aula_blocos")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, code: "ERRO_CRIAR_BLOCO", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, bloco: data }, { status: 201 });
}
