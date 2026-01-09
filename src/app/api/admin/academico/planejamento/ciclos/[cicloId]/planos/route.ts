import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "../../../_lib/auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const zId = z.coerce.number().int().positive();

export async function GET(_req: Request, ctx: { params: { cicloId: string } }) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;
  const admin = await getAdminContext();
  if (!admin.ok) return NextResponse.json(admin.body, { status: admin.status });

  const cicloId = zId.safeParse(ctx.params.cicloId);
  if (!cicloId.success) {
    return NextResponse.json({ ok: false, code: "CICLO_ID_INVALIDO" }, { status: 400 });
  }

  const { data, error } = await admin.supabase
    .from("planos_aula")
    .select(
      "id,ciclo_id,aula_numero,intencao_pedagogica,observacoes_gerais,playlist_url,created_at,updated_at,plano_aula_blocos(id,plano_aula_id,ordem,titulo,objetivo,minutos_min,minutos_ideal,minutos_max,musica_sugestao,observacoes,plano_aula_subblocos(id,bloco_id,ordem,titulo,minutos_min,minutos_ideal,minutos_max,habilidade_id,nivel_abordagem,instrucoes,musica_sugestao))"
    )
    .eq("ciclo_id", cicloId.data)
    .order("aula_numero", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, code: "ERRO_LISTAR_PLANOS", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, planos: data ?? [] });
}

export async function POST(req: Request, ctx: { params: { cicloId: string } }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const admin = await getAdminContext();
  if (!admin.ok) return NextResponse.json(admin.body, { status: admin.status });

  const cicloId = zId.safeParse(ctx.params.cicloId);
  if (!cicloId.success) {
    return NextResponse.json({ ok: false, code: "CICLO_ID_INVALIDO" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const schema = z.object({
    aula_numero: z.coerce.number().int().positive(),
    intencao_pedagogica: z.string().trim().optional().nullable(),
    observacoes_gerais: z.string().trim().optional().nullable(),
    playlist_url: z.string().trim().url().optional().nullable(),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, code: "PAYLOAD_INVALIDO" }, { status: 400 });
  }

  const payload = {
    ciclo_id: cicloId.data,
    aula_numero: parsed.data.aula_numero,
    intencao_pedagogica: parsed.data.intencao_pedagogica ?? null,
    observacoes_gerais: parsed.data.observacoes_gerais ?? null,
    playlist_url: parsed.data.playlist_url ?? null,
    created_by: admin.user.id,
    updated_by: admin.user.id,
  };

  const { data, error } = await admin.supabase.from("planos_aula").insert(payload).select("*").single();

  if (error) {
    return NextResponse.json({ ok: false, code: "ERRO_CRIAR_PLANO", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, plano: data }, { status: 201 });
}
