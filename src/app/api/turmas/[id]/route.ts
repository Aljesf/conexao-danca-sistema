import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/supabase/api-auth";

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
] as const;

const DIA_LABEL_BY_VALUE = new Map(DIAS_SEMANA_MAP.map((d) => [d.value, d.label]));
const DIA_VALUE_BY_ALIAS = new Map(
  DIAS_SEMANA_MAP.flatMap((d) => [d.label, ...d.aliases].map((alias) => [alias, d.value] as const)),
);

type ContextoTipo = "PERIODO_LETIVO" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type TurmaRow = {
  turma_id: number;
  nome: string | null;
  tipo_turma: string | null;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  ano_referencia: number | null;
  capacidade: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  status: string | null;
  encerramento_automatico: boolean | null;
  periodo_letivo_id: number | null;
  carga_horaria_prevista: number | null;
  frequencia_minima_percentual: number | null;
  observacoes: string | null;
  contexto_matricula_id: number | null;
  dias_semana: string[] | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  espaco_id: number | null;
};

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
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalInteger(value: unknown): number | null {
  const n = parseOptionalNumber(value);
  if (n === null) return null;
  return Number.isInteger(n) ? n : null;
}

function parseOptionalBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "sim") return true;
    if (normalized === "false" || normalized === "0" || normalized === "nao" || normalized === "não") return false;
  }
  return null;
}

function parseOptionalDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function parseOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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
        { error: "contexto_tipo_invalido", message: "Contexto nao compativel com o tipo da turma." },
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
    const inicio = typeof record.inicio === "string" ? record.inicio : typeof record.hora_inicio === "string" ? record.hora_inicio : null;
    const fim = typeof record.fim === "string" ? record.fim : typeof record.hora_fim === "string" ? record.hora_fim : null;

    if (diaValue === null || !diaLabel || !isHorarioValido(inicio) || !isHorarioValido(fim)) {
      return null;
    }

    return { day_of_week: diaValue, dia_label: diaLabel, inicio, fim };
  });

  if (itens.some((item) => item === null)) {
    return null;
  }

  return itens.filter((item): item is { day_of_week: number; dia_label: string; inicio: string; fim: string } => Boolean(item));
}

async function loadTurmaResponse(supabase: SupabaseClient, turmaId: number) {
  const { data: turma, error } = await supabase
    .from("turmas")
    .select("*, espaco:espacos ( id, nome, tipo, capacidade, local_id, local:locais ( id, nome, tipo ) )")
    .eq("turma_id", turmaId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const { data: horarios, error: errHorarios } = await supabase
    .from("turmas_horarios")
    .select("id,day_of_week,inicio,fim")
    .eq("turma_id", turmaId)
    .order("day_of_week", { ascending: true })
    .order("inicio", { ascending: true });

  if (errHorarios) {
    throw new Error(errHorarios.message);
  }

  return {
    turma,
    horarios_por_dia:
      horarios?.map((h) => ({
        id: Number(h.id),
        dia_semana: Number(h.day_of_week),
        dia_label: DIA_LABEL_BY_VALUE.get(Number(h.day_of_week)) ?? String(h.day_of_week),
        inicio: String(h.inicio).slice(0, 5),
        fim: String(h.fim).slice(0, 5),
        hora_inicio: String(h.inicio).slice(0, 5),
        hora_fim: String(h.fim).slice(0, 5),
      })) ?? [],
  };
}

function buildMergedTurmaPayload(current: TurmaRow, rawInput: Record<string, unknown>) {
  const next: Record<string, unknown> = {};

  const fieldsText = ["nome", "curso", "nivel", "turno", "status", "observacoes"] as const;
  for (const field of fieldsText) {
    if (!(field in rawInput)) continue;
    const parsed = parseOptionalText(rawInput[field]);
    next[field] = field === "nome" ? parsed ?? "" : parsed;
  }

  if ("tipo_turma" in rawInput) {
    next.tipo_turma = normalizeTipoTurma(rawInput.tipo_turma);
  }

  const fieldsInteger = ["ano_referencia", "capacidade", "periodo_letivo_id"] as const;
  for (const field of fieldsInteger) {
    if (!(field in rawInput)) continue;
    const parsed = parseOptionalInteger(rawInput[field]);
    if (rawInput[field] !== null && rawInput[field] !== "" && parsed === null) {
      return { ok: false as const, response: NextResponse.json({ error: `${field}_invalido` }, { status: 400 }) };
    }
    next[field] = parsed;
  }

  const fieldsNumber = ["carga_horaria_prevista", "frequencia_minima_percentual"] as const;
  for (const field of fieldsNumber) {
    if (!(field in rawInput)) continue;
    const parsed = parseOptionalNumber(rawInput[field]);
    if (rawInput[field] !== null && rawInput[field] !== "" && parsed === null) {
      return { ok: false as const, response: NextResponse.json({ error: `${field}_invalido` }, { status: 400 }) };
    }
    next[field] = parsed;
  }

  if ("encerramento_automatico" in rawInput) {
    const parsed = parseOptionalBoolean(rawInput.encerramento_automatico);
    if (rawInput.encerramento_automatico !== null && rawInput.encerramento_automatico !== "" && parsed === null) {
      return {
        ok: false as const,
        response: NextResponse.json({ error: "encerramento_automatico_invalido" }, { status: 400 }),
      };
    }
    next.encerramento_automatico = parsed;
  }

  if ("data_inicio" in rawInput) {
    const parsed = parseOptionalDate(rawInput.data_inicio);
    if (rawInput.data_inicio !== null && rawInput.data_inicio !== "" && parsed === null) {
      return { ok: false as const, response: NextResponse.json({ error: "data_inicio_invalida" }, { status: 400 }) };
    }
    next.data_inicio = parsed;
  }

  if ("data_fim" in rawInput) {
    const parsed = parseOptionalDate(rawInput.data_fim);
    if (rawInput.data_fim !== null && rawInput.data_fim !== "" && parsed === null) {
      return { ok: false as const, response: NextResponse.json({ error: "data_fim_invalida" }, { status: 400 }) };
    }
    next.data_fim = parsed;
  }

  if ("espaco_id" in rawInput) {
    const parsed = parseOptionalInteger(rawInput.espaco_id);
    if (rawInput.espaco_id !== null && rawInput.espaco_id !== "" && (!parsed || parsed <= 0)) {
      return { ok: false as const, response: NextResponse.json({ error: "espaco_id_invalido" }, { status: 400 }) };
    }
    next.espaco_id = parsed;
  }

  const mergedInicio = ("data_inicio" in next ? (next.data_inicio as string | null) : current.data_inicio) ?? null;
  const mergedFim = ("data_fim" in next ? (next.data_fim as string | null) : current.data_fim) ?? null;
  if (mergedInicio && mergedFim && mergedInicio > mergedFim) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "intervalo_datas_invalido", message: "A data de inicio nao pode ser maior que a data de fim." },
        { status: 400 },
      ),
    };
  }

  if ("nome" in next && !parseOptionalText(next.nome)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "nome_obrigatorio", message: "Informe o nome da turma." }, { status: 400 }),
    };
  }

  return { ok: true as const, payload: next };
}

async function handleUpsert(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const turmaPayload = { ...((body.turma as Record<string, unknown> | undefined) ?? body) };
  for (const key of ["horarios_por_dia", "horarios", "serie", "created_at", "updated_at", "created_by", "updated_by"]) {
    if (key in turmaPayload) {
      delete turmaPayload[key];
    }
  }

  const { data: currentTurma, error: currentError } = await supabase
    .from("turmas")
    .select(
      "turma_id,nome,tipo_turma,curso,nivel,turno,ano_referencia,capacidade,data_inicio,data_fim,status,encerramento_automatico,periodo_letivo_id,carga_horaria_prevista,frequencia_minima_percentual,observacoes,contexto_matricula_id,dias_semana,hora_inicio,hora_fim,espaco_id",
    )
    .eq("turma_id", id)
    .single();

  if (currentError || !currentTurma) {
    return NextResponse.json({ error: currentError?.message ?? "turma_nao_encontrada" }, { status: 404 });
  }

  const mergeResult = buildMergedTurmaPayload(currentTurma as TurmaRow, turmaPayload);
  if (!mergeResult.ok) {
    return mergeResult.response;
  }

  const horarioInput = body.horarios_por_dia ?? body.horarios;
  const horariosParsed = parseHorariosPorDia(horarioInput);
  const horariosProvided = Object.prototype.hasOwnProperty.call(body, "horarios_por_dia") || Object.prototype.hasOwnProperty.call(body, "horarios");
  if (horariosParsed === null) {
    return NextResponse.json(
      { error: "horarios_invalido", message: "horarios_por_dia deve ser um array valido de horarios." },
      { status: 400 },
    );
  }

  const diasParsed = parseDiasSemanal(mergeResult.payload.dias_semana);
  const diasWasProvided = Object.prototype.hasOwnProperty.call(mergeResult.payload, "dias_semana");
  let diasEfetivos = diasParsed;

  if (horariosProvided && horariosParsed.length > 0) {
    diasEfetivos = Array.from(new Set(horariosParsed.map((item) => item.dia_label)));
  }

  if ((diasWasProvided || horariosProvided) && (!diasEfetivos || diasEfetivos.length === 0)) {
    return NextResponse.json({ error: "dias_semana_invalido", message: "Informe ao menos um dia da semana." }, { status: 400 });
  }

  if (diasEfetivos && diasEfetivos.length > 0) {
    mergeResult.payload.dias_semana = diasEfetivos;
  }

  const tipoTurmaEfetivo =
    ("tipo_turma" in mergeResult.payload ? mergeResult.payload.tipo_turma : currentTurma.tipo_turma) ?? null;
  const anoReferenciaEfetivo =
    ("ano_referencia" in mergeResult.payload ? mergeResult.payload.ano_referencia : currentTurma.ano_referencia) ?? null;

  if ("contexto_matricula_id" in turmaPayload) {
    const contextoRes = await resolveContextoMatriculaId({
      supabase,
      contextoRaw: turmaPayload.contexto_matricula_id,
      tipoTurma: normalizeTipoTurma(tipoTurmaEfetivo),
      anoReferencia: parseOptionalInteger(anoReferenciaEfetivo),
    });

    if (!contextoRes.ok) {
      return contextoRes.response;
    }

    mergeResult.payload.contexto_matricula_id = contextoRes.contextoId;
  }

  const { error: updateError } = await supabase.from("turmas").update(mergeResult.payload).eq("turma_id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (horariosProvided) {
    const { error: deleteError } = await supabase.from("turmas_horarios").delete().eq("turma_id", id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    if (horariosParsed.length > 0) {
      const rows = horariosParsed.map((item) => ({
        turma_id: id,
        day_of_week: item.day_of_week,
        inicio: item.inicio,
        fim: item.fim,
      }));

      const { error: insertError } = await supabase.from("turmas_horarios").insert(rows);
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      const diasLabels = Array.from(new Set(horariosParsed.map((item) => item.dia_label)));
      const horaInicio = [...horariosParsed].sort((a, b) => a.inicio.localeCompare(b.inicio))[0]?.inicio ?? null;
      const horaFim = [...horariosParsed].sort((a, b) => b.fim.localeCompare(a.fim))[0]?.fim ?? null;

      const { error: resumoError } = await supabase
        .from("turmas")
        .update({
          dias_semana: diasLabels,
          hora_inicio: horaInicio,
          hora_fim: horaFim,
        })
        .eq("turma_id", id);

      if (resumoError) {
        return NextResponse.json({ error: resumoError.message }, { status: 500 });
      }
    } else {
      const { error: resumoError } = await supabase
        .from("turmas")
        .update({
          dias_semana: [],
          hora_inicio: null,
          hora_fim: null,
        })
        .eq("turma_id", id);

      if (resumoError) {
        return NextResponse.json({ error: resumoError.message }, { status: 500 });
      }
    }
  }

  try {
    const payload = await loadTurmaResponse(supabase, id);
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_carregar_turma";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const turmaId = Number(id);
  if (!Number.isInteger(turmaId) || turmaId <= 0) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const payload = await loadTurmaResponse(auth.supabase, turmaId);
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_carregar_turma";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handleUpsert(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handleUpsert(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "turma_id_invalido" }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { error } = await auth.supabase.from("turmas").delete().eq("turma_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
