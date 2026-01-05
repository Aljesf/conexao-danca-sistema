import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
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

type ContextoTipo = "PERIODO_LETIVO" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

function isHorarioValido(value: string | null): boolean {
  if (!value) return false;
  return /^\d{2}:\d{2}(:\d{2})?$/.test(value);
}

function normalizeDiaValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      if (Number.isInteger(num) && num >= 0 && num <= 6) {
        return num;
      }
    }
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

function parseOptionalNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeTipoTurma(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.toUpperCase();
}

function mapContextoTipo(tipoTurma: string | null): ContextoTipo | null {
  if (!tipoTurma) return null;
  if (tipoTurma === "REGULAR") return "PERIODO_LETIVO";
  if (tipoTurma === "CURSO_LIVRE") return "CURSO_LIVRE";
  if (tipoTurma === "ENSAIO" || tipoTurma === "PROJETO_ARTISTICO") return "PROJETO_ARTISTICO";
  return null;
}

async function resolveContextoMatriculaId(params: {
  supabase: SupabaseClient;
  contextoRaw: unknown;
  tipoTurma: string | null;
  anoReferencia: number | null;
}) {
  const { supabase, contextoRaw, tipoTurma, anoReferencia } = params;
  const contextoTipo = mapContextoTipo(tipoTurma);

  if (contextoRaw === null || contextoRaw === undefined || contextoRaw === "") {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "contexto_matricula_obrigatorio", message: "Informe o contexto da matricula." },
        { status: 400 },
      ),
    };
  }

  const contextoId = Number(contextoRaw);
  if (!Number.isFinite(contextoId) || contextoId <= 0) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "contexto_matricula_invalido" }, { status: 400 }),
    };
  }

  const { data: contexto, error: contextoErr } = await supabase
    .from("escola_contextos_matricula")
    .select("id,tipo,ano_referencia")
    .eq("id", contextoId)
    .maybeSingle();

  if (contextoErr) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "erro_contexto", message: contextoErr.message }, { status: 500 }),
    };
  }
  if (!contexto) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "contexto_matricula_nao_encontrado" }, { status: 400 }),
    };
  }

  if (contextoTipo && String(contexto.tipo) !== contextoTipo) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "contexto_tipo_invalido", message: "Contexto nao compatível com o tipo da turma." },
        { status: 400 },
      ),
    };
  }

  if (contextoTipo === "PERIODO_LETIVO" && typeof anoReferencia === "number") {
    const anoCtx = contexto.ano_referencia === null ? null : Number(contexto.ano_referencia);
    if (anoCtx && anoCtx !== anoReferencia) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: "contexto_ano_invalido", message: "Ano de referencia nao confere com o contexto." },
          { status: 400 },
        ),
      };
    }
  }

  return { ok: true as const, contextoId };
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

    if (diaValue === null || !diaLabel || !isHorarioValido(inicio) || !isHorarioValido(fim)) {
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
    .select("*, espaco:espacos ( id, nome, tipo, capacidade, local_id, local:locais ( id, nome, tipo ) )")
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
  const turmaPayload = { ...(body.turma ?? body) } as Record<string, unknown>;
  for (const key of ["horarios_por_dia", "horarios"]) {
    if (key in turmaPayload) {
      delete turmaPayload[key];
    }
  }
  for (const key of ["serie", "created_at", "updated_at", "created_by", "updated_by", "local_id"]) {
    if (key in turmaPayload) {
      delete turmaPayload[key];
    }
  }

  if ("espaco_id" in turmaPayload) {
    const rawEspaco = turmaPayload.espaco_id;
    if (rawEspaco === null || rawEspaco === undefined || rawEspaco === "") {
      turmaPayload.espaco_id = null;
    } else {
      const espacoId = Number(rawEspaco);
      if (!Number.isInteger(espacoId) || espacoId <= 0) {
        return NextResponse.json(
          { error: "espaco_id_invalido", message: "Informe um espaco valido para a turma." },
          { status: 400 },
        );
      }
      turmaPayload.espaco_id = espacoId;
    }
  }

  const diasParsed = parseDiasSemanal(turmaPayload.dias_semana);
  const horariosParsed = parseHorariosPorDia(body.horarios_por_dia ?? body.horarios);
  const horariosProvided = "horarios_por_dia" in body || "horarios" in body;
  const tipoTurma = normalizeTipoTurma(turmaPayload.tipo_turma);
  const anoReferencia = parseOptionalNumber(turmaPayload.ano_referencia);

  if (horariosParsed === null) {
    return NextResponse.json(
      { error: "horarios_invalido", message: "horarios_por_dia deve ser um array valido de horarios." },
      { status: 400 },
    );
  }

  if (horariosProvided && horariosParsed.length === 0) {
    return NextResponse.json(
      { error: "horarios_obrigatorios", message: "Defina ao menos um dia e horario." },
      { status: 400 },
    );
  }

  const diasWasProvided = "dias_semana" in turmaPayload;
  let diasEfetivos = diasParsed;

  if (horariosProvided && horariosParsed.length > 0) {
    diasEfetivos = Array.from(new Set(horariosParsed.map((h) => h.dia_label)));
  }

  if ((diasWasProvided || horariosProvided) && (!diasEfetivos || diasEfetivos.length === 0)) {
    return NextResponse.json({ error: "dias_semana_invalido", message: "Informe ao menos um dia da semana." }, { status: 400 });
  }

  if (diasEfetivos && diasEfetivos.length > 0) {
    turmaPayload.dias_semana = diasEfetivos;
  }

  if ("contexto_matricula_id" in turmaPayload) {
    const contextoRes = await resolveContextoMatriculaId({
      supabase,
      contextoRaw: turmaPayload.contexto_matricula_id,
      tipoTurma,
      anoReferencia,
    });

    if (!contextoRes.ok) {
      return contextoRes.response;
    }

    turmaPayload.contexto_matricula_id = contextoRes.contextoId;
  }

  const { data, error } = await supabase
    .from("turmas")
    .update(turmaPayload)
    .eq("turma_id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (horariosProvided && horariosParsed.length > 0) {
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

  return NextResponse.json({ data, horarios_por_dia: horariosParsed }, { status: 200 });
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
