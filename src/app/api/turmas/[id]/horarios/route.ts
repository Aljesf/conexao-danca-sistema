import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type HorarioInput = {
  dia_semana: number; // 0=Dom .. 6=Sab
  hora_inicio: string; // HH:MM
  hora_fim: string; // HH:MM
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

function isValidDiaSemana(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 6;
}

function isValidTimeHHMM(v: unknown): v is string {
  if (typeof v !== "string") return false;
  return /^\d{2}:\d{2}$/.test(v);
}

function compareTime(a: string, b: string): number {
  return a.localeCompare(b);
}

function uniqHorarios(list: HorarioInput[]) {
  const key = (h: HorarioInput) => `${h.dia_semana}|${h.hora_inicio}|${h.hora_fim}`;
  const map = new Map<string, HorarioInput>();
  for (const h of list) map.set(key(h), h);
  return Array.from(map.values());
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const turmaId = Number(rawId);
  if (!Number.isFinite(turmaId)) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("turmas_horarios")
    .select("day_of_week,inicio,fim")
    .eq("turma_id", turmaId)
    .order("day_of_week", { ascending: true })
    .order("inicio", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "falha_ao_listar_horarios", details: error.message }, { status: 500 });
  }

  const horarios = (data ?? []).map((h) => ({
    dia_semana: Number(h.day_of_week),
    hora_inicio: String(h.inicio).slice(0, 5),
    hora_fim: String(h.fim).slice(0, 5),
  }));

  return NextResponse.json({ horarios });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const turmaId = Number(rawId);
  if (!Number.isFinite(turmaId)) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { horarios?: unknown } | null;
  if (!body || !Array.isArray(body.horarios)) {
    return NextResponse.json({ error: "payload_invalido", details: "horarios deve ser um array" }, { status: 400 });
  }

  const horariosIn: HorarioInput[] = [];
  for (const item of body.horarios) {
    const obj = item as Record<string, unknown>;
    const dia_semana = obj.dia_semana;
    const hora_inicio = obj.hora_inicio;
    const hora_fim = obj.hora_fim;

    if (!isValidDiaSemana(dia_semana) || !isValidTimeHHMM(hora_inicio) || !isValidTimeHHMM(hora_fim)) {
      return NextResponse.json(
        { error: "horario_invalido", details: "dia_semana (0-6) e hora_inicio/hora_fim (HH:MM) sao obrigatorios" },
        { status: 400 },
      );
    }
    if (compareTime(hora_inicio, hora_fim) >= 0) {
      return NextResponse.json(
        { error: "horario_invalido", details: "hora_inicio deve ser menor que hora_fim" },
        { status: 400 },
      );
    }
    horariosIn.push({ dia_semana, hora_inicio, hora_fim });
  }

  const horarios = uniqHorarios(horariosIn);

  const supabase = await getSupabaseServer();
  const del = await supabase.from("turmas_horarios").delete().eq("turma_id", turmaId);
  if (del.error) {
    return NextResponse.json({ error: "falha_ao_limpar_grade", details: del.error.message }, { status: 500 });
  }

  if (horarios.length > 0) {
    const ins = await supabase.from("turmas_horarios").insert(
      horarios.map((h) => ({
        turma_id: turmaId,
        day_of_week: h.dia_semana,
        inicio: h.hora_inicio,
        fim: h.hora_fim,
      })),
    );

    if (ins.error) {
      return NextResponse.json({ error: "falha_ao_salvar_grade", details: ins.error.message }, { status: 500 });
    }
  }

  const diasValues = Array.from(new Set(horarios.map((h) => h.dia_semana))).sort((a, b) => a - b);
  const diasLabels = diasValues.map((d) => DIA_LABEL_BY_VALUE.get(d) ?? String(d));

  let minInicio: string | null = null;
  let maxFim: string | null = null;
  for (const h of horarios) {
    if (!minInicio || compareTime(h.hora_inicio, minInicio) < 0) minInicio = h.hora_inicio;
    if (!maxFim || compareTime(h.hora_fim, maxFim) > 0) maxFim = h.hora_fim;
  }

  const upd = await supabase
    .from("turmas")
    .update({
      dias_semana: diasLabels,
      hora_inicio: minInicio,
      hora_fim: maxFim,
      updated_at: new Date().toISOString(),
    })
    .eq("turma_id", turmaId);

  if (upd.error) {
    const msg = upd.error.message.toLowerCase();
    const missingColumn =
      msg.includes("column") && (msg.includes("does not exist") || msg.includes("nao existe"));
    if (!missingColumn) {
      return NextResponse.json({ error: "falha_ao_atualizar_resumo", details: upd.error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, turma_id: turmaId, total_horarios: horarios.length });
}
