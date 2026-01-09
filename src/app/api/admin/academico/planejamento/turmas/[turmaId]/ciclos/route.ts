import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "../../../_lib/auth";

const zId = z.coerce.number().int().positive();

export async function GET(_req: Request, ctx: { params: { turmaId: string } }) {
  const admin = await getAdminContext();
  if (!admin.ok) return NextResponse.json(admin.body, { status: admin.status });

  const turmaId = zId.safeParse(ctx.params.turmaId);
  if (!turmaId.success) {
    return NextResponse.json({ ok: false, code: "TURMA_ID_INVALIDO" }, { status: 400 });
  }

  const { data, error } = await admin.supabase
    .from("planejamento_ciclos")
    .select("*")
    .eq("turma_id", turmaId.data)
    .order("aula_inicio_numero", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, code: "ERRO_LISTAR_CICLOS", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ciclos: data ?? [] });
}

export async function POST(req: Request, ctx: { params: { turmaId: string } }) {
  const admin = await getAdminContext();
  if (!admin.ok) return NextResponse.json(admin.body, { status: admin.status });

  const turmaId = zId.safeParse(ctx.params.turmaId);
  if (!turmaId.success) {
    return NextResponse.json({ ok: false, code: "TURMA_ID_INVALIDO" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const schema = z.object({
    titulo: z.string().trim().min(1),
    aula_inicio_numero: z.coerce.number().int().positive(),
    aula_fim_numero: z.coerce.number().int().positive(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "PAYLOAD_INVALIDO" }, { status: 400 });
  }

  if (parsed.data.aula_fim_numero < parsed.data.aula_inicio_numero) {
    return NextResponse.json({ ok: false, code: "INTERVALO_INVALIDO" }, { status: 400 });
  }

  const payload = {
    turma_id: turmaId.data,
    titulo: parsed.data.titulo,
    aula_inicio_numero: parsed.data.aula_inicio_numero,
    aula_fim_numero: parsed.data.aula_fim_numero,
    created_by: admin.user.id,
    updated_by: admin.user.id,
  };

  const { data, error } = await admin.supabase
    .from("planejamento_ciclos")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, code: "ERRO_CRIAR_CICLO", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ciclo: data }, { status: 201 });
}
