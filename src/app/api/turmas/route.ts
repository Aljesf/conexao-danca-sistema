// src/app/api/turmas/route.ts
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { logAuditoria, resolverNomeDoUsuario } from "@/lib/auditoriaLog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function abreviarDia(valor: string): string | null {
  const normalizado = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  switch (normalizado) {
    case "DOMINGO":
    case "DOM":
      return "Dom";
    case "SEGUNDA":
    case "SEGUNDAFEIRA":
    case "SEG":
      return "Seg";
    case "TERCA":
    case "TERCAFEIRA":
    case "TER":
      return "Ter";
    case "QUARTA":
    case "QUARTAFEIRA":
    case "QUA":
      return "Qua";
    case "QUINTA":
    case "QUINTAFEIRA":
    case "QUI":
      return "Qui";
    case "SEXTA":
    case "SEXTAFEIRA":
    case "SEX":
      return "Sex";
    case "SABADO":
    case "SAB":
      return "Sab";
    default:
      return null;
  }
}

function compactarNiveis(resumo: string | null | undefined): string {
  const partes = (resumo ?? "")
    .split(",")
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0);

  if (partes.length === 0) return "";

  const abreviados = partes.map((parte) => {
    const semPrefixo = parte.replace(/^nivel\s*/i, "N");
    return semPrefixo.replace(/\s+/g, " ");
  });

  if (abreviados.length <= 2) {
    return abreviados.join("/");
  }

  const primeiros = abreviados.slice(0, 2).join("/");
  return `${primeiros}/+${abreviados.length - 2}`;
}

function montarNomeTurma(params: {
  curso?: string | null;
  nivelResumo?: string | null;
  turno?: string | null;
  dias?: string[];
  ano?: number | null;
}): string {
  const curso = params.curso?.trim() || "Turma";
  const nivel = compactarNiveis(params.nivelResumo);

  const turnoMap: Record<string, string> = {
    MANHA: "Manha",
    TARDE: "Tarde",
    NOITE: "Noite",
    INTEGRAL: "Integral",
  };
  const turno = params.turno ? turnoMap[String(params.turno).toUpperCase()] ?? String(params.turno) : "";

  const diasOrdenados = (params.dias ?? [])
    .map((dia) => abreviarDia(dia) ?? dia)
    .filter((dia) => dia)
    .map((dia) => String(dia));

  const ordemDia: Record<string, number> = { Dom: 0, Seg: 1, Ter: 2, Qua: 3, Qui: 4, Sex: 5, Sab: 6 };
  const diasUnicos = Array.from(new Set(diasOrdenados));
  diasUnicos.sort((a, b) => (ordemDia[a] ?? 99) - (ordemDia[b] ?? 99));
  const dias = diasUnicos.length > 0 ? diasUnicos.join("/") : "";

  const partes = [curso, nivel, turno, dias].filter((parte) => parte && String(parte).trim().length > 0);
  if (params.ano) {
    partes.push(String(params.ano));
  }

  return partes.join(" - ");
}

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
    if (contextoTipo === "PERIODO_LETIVO" && typeof anoReferencia === "number") {
      const { data, error } = await supabase
        .from("escola_contextos_matricula")
        .select("id,tipo,ano_referencia")
        .eq("tipo", "PERIODO_LETIVO")
        .eq("ano_referencia", anoReferencia)
        .maybeSingle();
      if (error) {
        return {
          ok: false as const,
          response: NextResponse.json({ error: "erro_contexto", message: error.message }, { status: 500 }),
        };
      }
      if (data?.id) {
        return { ok: true as const, contextoId: Number(data.id) };
      }
    }
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

export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("turmas")
    .select(`
      turma_id,
      nome,
      nivel,
      curso,
      capacidade,
      ativo,
      created_at,
      user_email,
      particular,
      passe_livre,
      online,
      professor_id,
      professor:pessoas ( id, nome, email ),
      espaco_id,
      espaco:espacos ( id, nome, tipo, capacidade, local_id, local:locais ( id, nome, tipo ) ),
      dias_semana,
      horarios:turmas_horarios ( day_of_week, inicio, fim ),
      updated_at
    `)
    .order("turma_id", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((row) => {
    const horarios = Array.isArray(row.horarios) ? row.horarios : [];
    return {
      ...row,
      id: Number(row.turma_id),
      tem_horario: horarios.length > 0,
    };
  });

  return NextResponse.json({ data: rows });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const usuarioId = user?.id ?? null;
  if (!usuarioId) {
    return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
  }

  const payload = await req.json(); // { turma: {...}, horarios_por_dia: [...] }
  const niveisIdsRaw = Array.isArray(payload.niveis_ids) ? payload.niveis_ids : null;
  const niveisIds: number[] = [];

  if (niveisIdsRaw) {
    const seen = new Set<number>();
    for (const raw of niveisIdsRaw) {
      const id = Number(raw);
      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ error: "niveis_ids_invalidos" }, { status: 400 });
      }
      if (!seen.has(id)) {
        seen.add(id);
        niveisIds.push(id);
      }
    }
  }

  const turmaPayload = { ...(payload.turma ?? payload) } as Record<string, unknown>;
  for (const key of ["horarios_por_dia", "horarios", "niveis_ids"]) {
    if (key in turmaPayload) {
      delete turmaPayload[key];
    }
  }
  for (const key of ["serie", "created_at", "updated_at", "created_by", "updated_by", "local_id"]) {
    if (key in turmaPayload) {
      delete turmaPayload[key];
    }
  }
  const nomeRaw = typeof turmaPayload.nome === "string" ? turmaPayload.nome.trim() : "";
  const tipoTurma = normalizeTipoTurma(turmaPayload.tipo_turma);
  const anoReferencia = parseOptionalNumber(turmaPayload.ano_referencia);
  const horariosParsed = parseHorariosPorDia(payload.horarios_por_dia ?? payload.horarios);

  if ("espaco_id" in turmaPayload) {
    const rawEspaco = turmaPayload.espaco_id;
    if (rawEspaco === null || rawEspaco === undefined || rawEspaco === "") {
      delete turmaPayload.espaco_id;
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

  if (horariosParsed === null) {
    return NextResponse.json(
      { error: "horarios_invalido", message: "horarios_por_dia deve ser um array valido de horarios." },
      { status: 400 },
    );
  }

  if (horariosParsed.length === 0) {
    return NextResponse.json(
      { error: "horarios_obrigatorios", message: "Defina ao menos um dia e horario." },
      { status: 400 },
    );
  }

  const diasEfetivos = Array.from(new Set(horariosParsed.map((h) => h.dia_label)));

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

  const nomeGerado = montarNomeTurma({
    curso: turmaPayload.curso ?? null,
    nivelResumo: turmaPayload.nivel ?? null,
    turno: turmaPayload.turno ?? null,
    dias: diasEfetivos,
    ano: anoReferencia ?? null,
  });

  const turmaInsert = {
    ...turmaPayload,
    nome: nomeRaw || nomeGerado,
    dias_semana: diasEfetivos,
  };

  const { data: turma, error } = await supabase
    .from("turmas")
    .insert([turmaInsert])
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const turmaId = Number((turma as { turma_id?: number })?.turma_id);

  if (niveisIds.length > 0) {
    const rows = niveisIds.map((nivelId, index) => ({
      turma_id: turmaId,
      nivel_id: nivelId,
      principal: index === 0,
    }));

    const { error: errNiveis } = await supabase.from("turma_niveis").insert(rows);

    if (errNiveis) {
      return NextResponse.json({ error: errNiveis.message }, { status: 500 });
    }
  }

  const rows = horariosParsed.map((h) => ({
    turma_id: turmaId,
    day_of_week: h.day_of_week,
    inicio: h.inicio,
    fim: h.fim,
  }));

  const { error: errH } = await supabase.from("turmas_horarios").insert(rows);

  if (errH) {
    return NextResponse.json({ error: errH.message }, { status: 500 });
  }

  const usuarioNome = await resolverNomeDoUsuario(usuarioId);
  await logAuditoria({
    usuario_id: usuarioId ?? "",
    usuario_nome: usuarioNome,
    entidade: "turma",
    entidade_id: turmaId,
    acao: "CREATE",
    descricao: `Criou turma ${turma.nome ?? ""} (#${turmaId})`,
  });

  return NextResponse.json(
    { turma: { ...turma, id: turmaId }, niveis_ids: niveisIds, horarios_por_dia: horariosParsed },
    { status: 201 },
  );
}
