import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessTurma, getUserOrThrow } from "../../../_lib/auth";
import type { Supa } from "../../../_lib/auth";

const zAulaId = z.coerce.number().int().positive();
const zStatus = z.enum(["PRESENTE", "FALTA", "JUSTIFICADA", "ATRASO"]);

const zItem = z.object({
  alunoPessoaId: z.coerce.number().int().positive(),
  status: zStatus,
  minutosAtraso: z.coerce.number().int().min(1).optional(),
  observacao: z.string().max(500).optional(),
});

const zBodyPut = z.object({
  itens: z.array(zItem).min(1).max(200),
});

async function getAulaOrFail(params: { supabase: Supa; aulaId: number }) {
  const { data, error } = await params.supabase
    .from("turma_aulas")
    .select("id, turma_id, data_aula")
    .eq("id", params.aulaId)
    .single();

  if (error) return { ok: false as const, status: 404, code: "AULA_NAO_ENCONTRADA" as const };
  return { ok: true as const, aula: data };
}

/**
 * GET /api/professor/diario-de-classe/aulas/:aulaId/presencas
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ aulaId: string }> }) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const { aulaId: aulaIdRaw } = await ctx.params;
  const aulaId = zAulaId.safeParse(aulaIdRaw);
  if (!aulaId.success) return NextResponse.json({ ok: false, code: "AULA_ID_INVALIDO" }, { status: 400 });

  const { supabase, user } = auth;

  const aulaRes = await getAulaOrFail({ supabase, aulaId: aulaId.data });
  if (!aulaRes.ok) return NextResponse.json(aulaRes, { status: aulaRes.status });

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: aulaRes.aula.turma_id });
  if (!perm.ok) return NextResponse.json(perm, { status: perm.status });

  const { data, error } = await supabase
    .from("turma_aula_presencas")
    .select("*")
    .eq("aula_id", aulaId.data)
    .order("aluno_pessoa_id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, code: "ERRO_BUSCAR_PRESENCAS", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, aula: aulaRes.aula, presencas: data ?? [] });
}

/**
 * PUT /api/professor/diario-de-classe/aulas/:aulaId/presencas
 */
export async function PUT(request: NextRequest, ctx: { params: Promise<{ aulaId: string }> }) {
  const auth = await getUserOrThrow(request);
  if (!auth.ok) return NextResponse.json(auth, { status: auth.status });

  const { aulaId: aulaIdRaw } = await ctx.params;
  const aulaId = zAulaId.safeParse(aulaIdRaw);
  if (!aulaId.success) return NextResponse.json({ ok: false, code: "AULA_ID_INVALIDO" }, { status: 400 });

  const json = await request.json().catch(() => null);
  const body = zBodyPut.safeParse(json);
  if (!body.success) return NextResponse.json({ ok: false, code: "BODY_INVALIDO", issues: body.error.issues }, { status: 400 });

  const { supabase, user } = auth;

  const aulaRes = await getAulaOrFail({ supabase, aulaId: aulaId.data });
  if (!aulaRes.ok) return NextResponse.json(aulaRes, { status: aulaRes.status });

  const perm = await canAccessTurma({ supabase, userId: user.id, turmaId: aulaRes.aula.turma_id });
  if (!perm.ok) return NextResponse.json(perm, { status: perm.status });

  const rows = body.data.itens.map((i) => ({
    aula_id: aulaId.data,
    aluno_pessoa_id: i.alunoPessoaId,
    status: i.status,
    minutos_atraso: i.status === "ATRASO" ? (i.minutosAtraso ?? 1) : null,
    observacao: i.observacao ?? null,
    registrado_por: user.id,
  }));

  const { error: upsertErr } = await supabase
    .from("turma_aula_presencas")
    .upsert(rows, { onConflict: "aula_id,aluno_pessoa_id" });

  if (upsertErr) {
    return NextResponse.json(
      { ok: false, code: "ERRO_SALVAR_PRESENCAS", message: upsertErr.message },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("turma_aula_presencas")
    .select("*")
    .eq("aula_id", aulaId.data)
    .order("aluno_pessoa_id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, code: "ERRO_RETORNAR_PRESENCAS", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, salvas: rows.length, presencas: data ?? [] });
}
