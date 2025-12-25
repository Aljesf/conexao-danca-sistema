import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIAS_SEMANA_MAP = [
  { value: 0, label: "Dom", aliases: ["DOM", "DOMINGO"] },
  { value: 1, label: "Seg", aliases: ["SEG", "SEGUNDA", "SEGUNDAFEIRA"] },
  { value: 2, label: "Ter", aliases: ["TER", "TERCA", "TERCAFEIRA"] },
  { value: 3, label: "Qua", aliases: ["QUA", "QUARTA", "QUARTAFEIRA"] },
  { value: 4, label: "Qui", aliases: ["QUI", "QUINTA", "QUINTAFEIRA"] },
  { value: 5, label: "Sex", aliases: ["SEX", "SEXTA", "SEXTAFEIRA"] },
  { value: 6, label: "Sab", aliases: ["SAB", "SABADO"] },
];

const DIA_LABEL_BY_VALUE = new Map(DIAS_SEMANA_MAP.map((d) => [d.value, d.label]));
const DIA_VALUE_BY_ALIAS = new Map(
  DIAS_SEMANA_MAP.flatMap((d) => [d.label, ...d.aliases].map((alias) => [alias, d.value] as const)),
);

function normalizeDiaValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6) {
    return value;
  }
  if (typeof value === "string") {
    const key = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z]/g, "");
    return DIA_VALUE_BY_ALIAS.get(key) ?? null;
  }
  return null;
}

function normalizeDiaLabel(value: unknown): string | null {
  const diaValue = normalizeDiaValue(value);
  if (diaValue === null) return null;
  return DIA_LABEL_BY_VALUE.get(diaValue) ?? null;
}

function parseDiasSemanal(raw: unknown): string[] | null {
  if (raw === undefined || raw === null) return null;
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : [];
  const labels = list
    .map((item) => (typeof item === "string" || typeof item === "number" ? item : ""))
    .map((item) => normalizeDiaLabel(item) ?? String(item).trim())
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  return labels;
}

function parseHorariosPorDia(
  raw: unknown,
): Array<{ day_of_week: number; dia_label: string; inicio: string; fim: string }> | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return null;

  const itens = raw.map((item) => {
    if (!item || typeof item !== "object") return null;
    const record = item as Record<string, unknown>;
    const diaRaw = record.dia_semana ?? record.day_of_week ?? record.dia ?? record.day;
    const diaValue = normalizeDiaValue(diaRaw);
    const diaLabel = normalizeDiaLabel(diaRaw);
    const inicio = typeof record.inicio === "string" ? record.inicio : null;
    const fim = typeof record.fim === "string" ? record.fim : null;

    if (diaValue === null || !diaLabel || !inicio || !fim) {
      return null;
    }

    return { day_of_week: diaValue, dia_label: diaLabel, inicio, fim };
  });

  if (itens.some((item) => item === null)) {
    return null;
  }

  return itens.filter((item): item is { day_of_week: number; dia_label: string; inicio: string; fim: string } => !!item);
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const turmaId = Number(params.id);
  if (!Number.isInteger(turmaId) || turmaId <= 0) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const { data: turma, error } = await supabase
    .from("turmas")
    .select("*")
    .eq("turma_id", turmaId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: horarios, error: errHorarios } = await supabase
    .from("turmas_horarios")
    .select("day_of_week,inicio,fim")
    .eq("turma_id", turmaId)
    .order("day_of_week", { ascending: true });

  if (errHorarios) return NextResponse.json({ error: errHorarios.message }, { status: 500 });

  const horariosPorDia =
    horarios?.map((h) => ({
      dia_semana: DIA_LABEL_BY_VALUE.get(Number(h.day_of_week)) ?? String(h.day_of_week),
      inicio: String(h.inicio),
      fim: String(h.fim),
    })) ?? [];

  return NextResponse.json({ turma, horarios_por_dia: horariosPorDia }, { status: 200 });
}

export async function PUT(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const body = await _req.json(); // { turma: {...}, horarios_por_dia: [...] }
  const turmaPayload = { ...(body.turma ?? {}) } as Record<string, unknown>;
  for (const key of ["serie", "created_at", "updated_at", "created_by", "updated_by"]) {
    if (key in turmaPayload) {
      delete turmaPayload[key];
    }
  }

  const diasParsed = parseDiasSemanal(turmaPayload.dias_semana);
  const horariosParsed = parseHorariosPorDia(body.horarios_por_dia ?? body.horarios);

  if (horariosParsed === null) {
    return NextResponse.json(
      { error: "horarios_invalido", message: "horarios_por_dia deve ser um array valido de horarios." },
      { status: 400 },
    );
  }

  const diasWasProvided = "dias_semana" in turmaPayload;
  const horariosProvided = horariosParsed.length > 0;
  let diasEfetivos = diasParsed;

  if ((!diasEfetivos || diasEfetivos.length === 0) && horariosProvided) {
    diasEfetivos = Array.from(new Set(horariosParsed.map((h) => h.dia_label)));
  }

  if ((diasWasProvided || horariosProvided) && (!diasEfetivos || diasEfetivos.length === 0)) {
    return NextResponse.json({ error: "dias_semana_invalido", message: "Informe ao menos um dia da semana." }, { status: 400 });
  }

  if (diasEfetivos && diasEfetivos.length > 0) {
    turmaPayload.dias_semana = diasEfetivos;
  }

  const { data, error } = await supabase
    .from("turmas")
    .update(turmaPayload)
    .eq("turma_id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (horariosProvided) {
    await supabase.from("turmas_horarios").delete().eq("turma_id", id);

    const diasSet = new Set(diasEfetivos ?? []);
    const rows = horariosParsed
      .filter((h) => diasSet.has(h.dia_label))
      .map((h) => ({
        turma_id: id,
        day_of_week: h.day_of_week,
        inicio: h.inicio,
        fim: h.fim,
      }));

    const { error: e2 } = await supabase.from("turmas_horarios").insert(rows);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("turmas").delete().eq("turma_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
