// src/app/api/turmas/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const turmaId = Number(id);
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const body = await req.json(); // { turma: {...}, horarios: [...] }
  const turmaPayload = { ...(body.turma ?? {}) } as Record<string, unknown>;
  for (const key of ["serie", "created_at", "updated_at", "created_by", "updated_by"]) {
    if (key in turmaPayload) {
      delete turmaPayload[key];
    }
  }
  const diasRaw = turmaPayload.dias_semana;
  if (typeof diasRaw === "string") {
    return NextResponse.json(
      { error: "dias_semana_invalido", message: "dias_semana deve ser array de strings, nao string." },
      { status: 400 },
    );
  }
  if (Array.isArray(diasRaw)) {
    turmaPayload.dias_semana = diasRaw.map((dia) => String(dia));
  }

  // atualiza turma
  const { data, error } = await supabase
    .from("turmas")
    .update(turmaPayload)
    .eq("turma_id", turmaId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // substitui horÃ¡rios
  if (Array.isArray(body.horarios)) {
    await supabase.from("turmas_horarios").delete().eq("turma_id", turmaId);

    const rows = body.horarios.map((h: any) => ({
      turma_id: turmaId,
      day_of_week: h.day,
      inicio: h.inicio,
      fim: h.fim,
    }));

    const { error: e2 } = await supabase.from("turmas_horarios").insert(rows);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const turmaId = Number(id);
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { error } = await supabase.from("turmas").delete().eq("turma_id", turmaId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}



