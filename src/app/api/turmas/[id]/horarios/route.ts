import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/api-auth";

type Supa = SupabaseClient;

type HorarioInput = {
  id?: number;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
};

const DIA_LABEL_BY_VALUE = new Map<number, string>([
  [0, "Dom"],
  [1, "Seg"],
  [2, "Ter"],
  [3, "Qua"],
  [4, "Qui"],
  [5, "Sex"],
  [6, "Sab"],
]);

function isValidDiaSemana(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
}

function isValidTimeHHMM(value: unknown): value is string {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value);
}

function compareTime(a: string, b: string): number {
  return a.localeCompare(b);
}

function uniqHorarios(list: HorarioInput[]) {
  const key = (item: HorarioInput) => `${item.dia_semana}|${item.hora_inicio}|${item.hora_fim}`;
  const map = new Map<string, HorarioInput>();
  for (const item of list) {
    map.set(key(item), item);
  }
  return Array.from(map.values());
}

function parseHorarioInput(raw: unknown): HorarioInput | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = record.id ?? record.horario_id;
  const dia_semana = typeof record.dia_semana === "number" ? record.dia_semana : Number(record.dia_semana);
  const hora_inicio = typeof record.hora_inicio === "string" ? record.hora_inicio : record.inicio;
  const hora_fim = typeof record.hora_fim === "string" ? record.hora_fim : record.fim;

  if (!isValidDiaSemana(dia_semana) || !isValidTimeHHMM(hora_inicio) || !isValidTimeHHMM(hora_fim)) {
    return null;
  }

  if (compareTime(hora_inicio, hora_fim) >= 0) {
    return null;
  }

  const parsedId = typeof id === "number" ? id : Number(id);

  return {
    id: Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined,
    dia_semana,
    hora_inicio,
    hora_fim,
  };
}

async function syncTurmaResumoHorarios(params: {
  supabase: Supa;
  turmaId: number;
}) {
  const { supabase, turmaId } = params;
  const { data, error } = await supabase
    .from("turmas_horarios")
    .select("day_of_week,inicio,fim")
    .eq("turma_id", turmaId);

  if (error) {
    throw new Error(error.message);
  }

  const horarios = (data ?? []).map((item) => ({
    dia_semana: Number(item.day_of_week),
    inicio: String(item.inicio).slice(0, 5),
    fim: String(item.fim).slice(0, 5),
  }));

  const dias = Array.from(new Set(horarios.map((item) => DIA_LABEL_BY_VALUE.get(item.dia_semana) ?? String(item.dia_semana))));
  const horaInicio = horarios.length > 0 ? [...horarios].sort((a, b) => a.inicio.localeCompare(b.inicio))[0]?.inicio ?? null : null;
  const horaFim = horarios.length > 0 ? [...horarios].sort((a, b) => b.fim.localeCompare(a.fim))[0]?.fim ?? null : null;

  const { error: updateError } = await supabase
    .from("turmas")
    .update({
      dias_semana: dias,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
    })
    .eq("turma_id", turmaId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

async function listarHorarios(supabase: Supa, turmaId: number) {
  const { data, error } = await supabase
    .from("turmas_horarios")
    .select("id,day_of_week,inicio,fim")
    .eq("turma_id", turmaId)
    .order("day_of_week", { ascending: true })
    .order("inicio", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => ({
    id: Number(item.id),
    dia_semana: Number(item.day_of_week),
    dia_label: DIA_LABEL_BY_VALUE.get(Number(item.day_of_week)) ?? String(item.day_of_week),
    hora_inicio: String(item.inicio).slice(0, 5),
    hora_fim: String(item.fim).slice(0, 5),
  }));
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const turmaId = Number(rawId);
  if (!Number.isFinite(turmaId)) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const horarios = await listarHorarios(auth.supabase, turmaId);
    return NextResponse.json({ horarios, prospectivo: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_ao_listar_horarios";
    return NextResponse.json({ error: "falha_ao_listar_horarios", details: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const turmaId = Number(rawId);
  if (!Number.isFinite(turmaId)) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const horario = parseHorarioInput(body);
  if (!horario) {
    return NextResponse.json({ error: "horario_invalido", details: "Informe dia, hora_inicio e hora_fim validos." }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { error: insertError } = await auth.supabase.from("turmas_horarios").insert({
    turma_id: turmaId,
    day_of_week: horario.dia_semana,
    inicio: horario.hora_inicio,
    fim: horario.hora_fim,
  });

  if (insertError) {
    return NextResponse.json({ error: "falha_ao_adicionar_horario", details: insertError.message }, { status: 500 });
  }

  try {
    await syncTurmaResumoHorarios({ supabase: auth.supabase, turmaId });
    const horarios = await listarHorarios(auth.supabase, turmaId);
    return NextResponse.json({
      ok: true,
      message: "Horario adicionado. A alteracao vale apenas para a grade futura.",
      prospectivo: true,
      horarios,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_ao_recalcular_resumo";
    return NextResponse.json({ error: "falha_ao_recalcular_resumo", details: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const turmaId = Number(rawId);
  if (!Number.isFinite(turmaId)) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { horarios?: unknown } | Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  if (Array.isArray((body as { horarios?: unknown }).horarios)) {
    const horariosInput = (body as { horarios: unknown[] }).horarios.map((item) => parseHorarioInput(item));
    if (horariosInput.some((item) => item === null)) {
      return NextResponse.json({ error: "horario_invalido", details: "A lista de horarios contem itens invalidos." }, { status: 400 });
    }

    const horarios = uniqHorarios(horariosInput.filter((item): item is HorarioInput => Boolean(item)));

    const { error: deleteError } = await auth.supabase.from("turmas_horarios").delete().eq("turma_id", turmaId);
    if (deleteError) {
      return NextResponse.json({ error: "falha_ao_limpar_grade", details: deleteError.message }, { status: 500 });
    }

    if (horarios.length > 0) {
      const { error: insertError } = await auth.supabase.from("turmas_horarios").insert(
        horarios.map((item) => ({
          turma_id: turmaId,
          day_of_week: item.dia_semana,
          inicio: item.hora_inicio,
          fim: item.hora_fim,
        })),
      );

      if (insertError) {
        return NextResponse.json({ error: "falha_ao_salvar_grade", details: insertError.message }, { status: 500 });
      }
    }

    try {
      await syncTurmaResumoHorarios({ supabase: auth.supabase, turmaId });
      const horariosAtualizados = await listarHorarios(auth.supabase, turmaId);
      return NextResponse.json({
        ok: true,
        message: "Grade atualizada. Alteracoes valem apenas para execucoes futuras.",
        prospectivo: true,
        horarios: horariosAtualizados,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "falha_ao_recalcular_resumo";
      return NextResponse.json({ error: "falha_ao_recalcular_resumo", details: message }, { status: 500 });
    }
  }

  const horario = parseHorarioInput(body);
  if (!horario?.id) {
    return NextResponse.json({ error: "horario_id_obrigatorio", details: "Informe o horario a editar." }, { status: 400 });
  }

  const { data: existing, error: existingError } = await auth.supabase
    .from("turmas_horarios")
    .select("id")
    .eq("id", horario.id)
    .eq("turma_id", turmaId)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: "falha_buscar_horario", details: existingError.message }, { status: 500 });
  }
  if (!existing?.id) {
    return NextResponse.json({ error: "horario_nao_encontrado" }, { status: 404 });
  }

  const { error: updateError } = await auth.supabase
    .from("turmas_horarios")
    .update({
      day_of_week: horario.dia_semana,
      inicio: horario.hora_inicio,
      fim: horario.hora_fim,
    })
    .eq("id", horario.id)
    .eq("turma_id", turmaId);

  if (updateError) {
    return NextResponse.json({ error: "falha_ao_editar_horario", details: updateError.message }, { status: 500 });
  }

  try {
    await syncTurmaResumoHorarios({ supabase: auth.supabase, turmaId });
    const horarios = await listarHorarios(auth.supabase, turmaId);
    return NextResponse.json({
      ok: true,
      message: "Horario atualizado. A alteracao vale apenas para execucoes futuras.",
      prospectivo: true,
      horarios,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_ao_recalcular_resumo";
    return NextResponse.json({ error: "falha_ao_recalcular_resumo", details: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const turmaId = Number(rawId);
  if (!Number.isFinite(turmaId)) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const horarioId = Number(body?.horario_id ?? body?.id);
  if (!Number.isInteger(horarioId) || horarioId <= 0) {
    return NextResponse.json({ error: "horario_id_obrigatorio" }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { error: deleteError } = await auth.supabase
    .from("turmas_horarios")
    .delete()
    .eq("id", horarioId)
    .eq("turma_id", turmaId);

  if (deleteError) {
    return NextResponse.json({ error: "falha_ao_remover_horario", details: deleteError.message }, { status: 500 });
  }

  try {
    await syncTurmaResumoHorarios({ supabase: auth.supabase, turmaId });
    const horarios = await listarHorarios(auth.supabase, turmaId);
    return NextResponse.json({
      ok: true,
      message: "Horario removido da grade futura. O historico de execucao nao foi alterado.",
      prospectivo: true,
      horarios,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_ao_recalcular_resumo";
    return NextResponse.json({ error: "falha_ao_recalcular_resumo", details: message }, { status: 500 });
  }
}
