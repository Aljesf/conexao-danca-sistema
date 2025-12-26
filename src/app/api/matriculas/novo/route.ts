import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type PoliticaPrimeiroPagamento =
  | {
      modo: "PADRAO";
      motivo_excecao?: null;
    }
  | {
      modo: "ADIAR_PARA_VENCIMENTO";
      motivo_excecao: string;
    };

type PagamentoEntrada = {
  metodo_pagamento: string;
  valor_centavos: number;
  data_pagamento?: string | null; // YYYY-MM-DD
  observacoes?: string | null;
};

type MatriculaNovoPayload = {
  pessoa_id: number;
  responsavel_financeiro_id: number;
  tipo_matricula: "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
  vinculo_id: number;
  ano_referencia?: number | null;
  data_matricula?: string | null; // YYYY-MM-DD
  data_inicio_vinculo?: string | null; // YYYY-MM-DD
  tabela_matricula_id?: number | null;
  plano_pagamento_id?: number | null;
  vencimento_padrao_referencia?: number | null;
  politica_primeiro_pagamento?: PoliticaPrimeiroPagamento | null;
  pagamento_entrada?: PagamentoEntrada | null;
  observacoes?: string | null;
};

function isValidDateYYYYMMDD(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  const [y, m, day] = value.split("-").map((v) => Number(v));
  return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
}

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: "payload_invalido", message, details: details ?? null },
    { status: 400 }
  );
}

function conflict(code: string, message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: code, message, details: details ?? null }, { status: 409 });
}

function notFound(code: string, message: string) {
  return NextResponse.json({ ok: false, error: code, message }, { status: 404 });
}

function serverError(message: string) {
  return NextResponse.json({ ok: false, error: "internal_error", message }, { status: 500 });
}

function getTodayYYYYMMDD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normalizeInt(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  if (!Number.isInteger(value)) return null;
  return value;
}

function safeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function calcVencimentoAdiado(baseDateYYYYMMDD: string, diaVencimento: number): string {
  const [y, m, d] = baseDateYYYYMMDD.split("-").map((v) => Number(v));
  const base = new Date(Date.UTC(y, m - 1, d));
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const day = base.getUTCDate();
  const targetMonth = day <= diaVencimento ? month : month + 1;
  const targetDate = new Date(Date.UTC(year, targetMonth, diaVencimento));
  const ty = targetDate.getUTCFullYear();
  const tm = String(targetDate.getUTCMonth() + 1).padStart(2, "0");
  const td = String(targetDate.getUTCDate()).padStart(2, "0");
  return `${ty}-${tm}-${td}`;
}

function parsePoliticaPrimeiroPagamento(value: unknown): PoliticaPrimeiroPagamento | null | "invalid" {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) return "invalid";
  const record = value as Record<string, unknown>;
  const modo = safeString(record.modo);
  if (modo === "PADRAO") {
    return { modo: "PADRAO", motivo_excecao: null };
  }
  if (modo === "ADIAR_PARA_VENCIMENTO") {
    const motivo = safeString(record.motivo_excecao);
    if (!motivo) return "invalid";
    return { modo: "ADIAR_PARA_VENCIMENTO", motivo_excecao: motivo };
  }
  return "invalid";
}

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return serverError("Supabase env vars missing (URL or SERVICE_ROLE).");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let payloadUnknown: unknown;
  try {
    payloadUnknown = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  if (!payloadUnknown || typeof payloadUnknown !== "object" || Array.isArray(payloadUnknown)) {
    return badRequest("Payload must be a JSON object.");
  }

  const payload = payloadUnknown as Record<string, unknown>;

  const pessoaId = normalizeInt(payload.pessoa_id);
  const responsavelId = normalizeInt(payload.responsavel_financeiro_id);
  const vinculoId = normalizeInt(payload.vinculo_id);

  const tipoMatriculaRaw = safeString(payload.tipo_matricula);
  const tipoMatricula = tipoMatriculaRaw as MatriculaNovoPayload["tipo_matricula"] | null;

  if (!pessoaId || pessoaId <= 0) return badRequest("pessoa_id invalido.");
  if (!responsavelId || responsavelId <= 0) return badRequest("responsavel_financeiro_id invalido.");
  if (!vinculoId || vinculoId <= 0) return badRequest("vinculo_id invalido.");
  if (!tipoMatricula || !["REGULAR", "CURSO_LIVRE", "PROJETO_ARTISTICO"].includes(tipoMatricula)) {
    return badRequest("tipo_matricula invalido.");
  }

  const anoReferencia =
    payload.ano_referencia === null || payload.ano_referencia === undefined
      ? null
      : normalizeInt(payload.ano_referencia);
  if (tipoMatricula === "REGULAR" && (!anoReferencia || anoReferencia < 2000 || anoReferencia > 2100)) {
    return badRequest("ano_referencia obrigatorio e valido para REGULAR.");
  }

  const dataMatricula = safeString(payload.data_matricula) ?? getTodayYYYYMMDD();
  const dataInicioVinculo = safeString(payload.data_inicio_vinculo) ?? dataMatricula;

  if (!isValidDateYYYYMMDD(dataMatricula)) return badRequest("data_matricula invalida (YYYY-MM-DD).");
  if (!isValidDateYYYYMMDD(dataInicioVinculo)) return badRequest("data_inicio_vinculo invalida (YYYY-MM-DD).");

  const tabelaMatriculaId =
    payload.tabela_matricula_id === null || payload.tabela_matricula_id === undefined
      ? null
      : normalizeInt(payload.tabela_matricula_id);
  const planoPagamentoId =
    payload.plano_pagamento_id === null || payload.plano_pagamento_id === undefined
      ? null
      : normalizeInt(payload.plano_pagamento_id);

  const vencRef =
    payload.vencimento_padrao_referencia === null || payload.vencimento_padrao_referencia === undefined
      ? null
      : normalizeInt(payload.vencimento_padrao_referencia);

  if (vencRef !== null && (vencRef < 1 || vencRef > 28)) {
    return badRequest("vencimento_padrao_referencia invalido (1..28).");
  }

  const politica = parsePoliticaPrimeiroPagamento(payload.politica_primeiro_pagamento);
  if (politica === "invalid") {
    return badRequest("politica_primeiro_pagamento invalida.");
  }

  const observacoes = safeString(payload.observacoes);

  const { data: pessoa, error: pessoaErr } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", pessoaId)
    .maybeSingle();
  if (pessoaErr) return serverError("Failed to query pessoa.");
  if (!pessoa) return notFound("pessoa_nao_encontrada", "Pessoa (aluno) nao encontrada.");

  const { data: responsavel, error: respErr } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", responsavelId)
    .maybeSingle();
  if (respErr) return serverError("Failed to query responsavel financeiro.");
  if (!responsavel) return notFound("responsavel_nao_encontrado", "Responsavel financeiro nao encontrado.");

  const { data: turma, error: turmaErr } = await supabase
    .from("turmas")
    .select("turma_id")
    .eq("turma_id", vinculoId)
    .maybeSingle();
  if (turmaErr) return serverError("Failed to query turma.");
  if (!turma) return notFound("turma_nao_encontrada", "Turma nao encontrada.");

  if (tipoMatricula === "REGULAR") {
    const { data: existente, error: dupErr } = await supabase
      .from("matriculas")
      .select("id,status")
      .eq("pessoa_id", pessoaId)
      .eq("tipo_matricula", "REGULAR")
      .eq("vinculo_id", vinculoId)
      .eq("ano_referencia", anoReferencia)
      .in("status", ["ATIVA", "TRANCADA"])
      .maybeSingle();

    if (dupErr) return serverError("Failed to check matricula duplicates.");
    if (existente) {
      return conflict("matricula_duplicada", "Matricula ativa/trancada ja existe para este aluno/turma/ano.", {
        matricula_id: existente.id,
      });
    }
  }

  const insertMatricula: Record<string, unknown> = {
    pessoa_id: pessoaId,
    responsavel_financeiro_id: responsavelId,
    tipo_matricula: tipoMatricula,
    vinculo_id: vinculoId,
    ano_referencia: anoReferencia,
    status: "ATIVA",
    data_matricula: dataMatricula,
    data_inicio_vinculo: dataInicioVinculo,
    tabela_matricula_id: tabelaMatriculaId,
    plano_pagamento_id: planoPagamentoId,
    vencimento_padrao_referencia: vencRef ?? 12,
    observacoes: observacoes ?? null,
  };

  const { data: matriculaCriada, error: matErr } = await supabase
    .from("matriculas")
    .insert(insertMatricula)
    .select("*")
    .single();
  if (matErr || !matriculaCriada) return serverError("Failed to create matricula.");

  const { data: vinculoExistente, error: vErr } = await supabase
    .from("turma_aluno")
    .select("turma_aluno_id, matricula_id")
    .eq("turma_id", vinculoId)
    .eq("aluno_pessoa_id", pessoaId)
    .is("dt_fim", null)
    .maybeSingle();

  if (vErr) return serverError("Failed to query turma_aluno.");

  let turmaAluno: Record<string, unknown> | null = null;

  if (vinculoExistente) {
    if (vinculoExistente.matricula_id === null) {
      const { data: updated, error: upErr } = await supabase
        .from("turma_aluno")
        .update({ matricula_id: matriculaCriada.id })
        .eq("turma_aluno_id", vinculoExistente.turma_aluno_id)
        .select("*")
        .single();
      if (upErr) return serverError("Failed to update turma_aluno with matricula_id.");
      turmaAluno = updated as Record<string, unknown>;
    } else {
      return conflict(
        "vinculo_turma_duplicado",
        "Vinculo ativo desta pessoa nesta turma ja possui matricula associada.",
        { turma_aluno_id: vinculoExistente.turma_aluno_id }
      );
    }
  } else {
    const { data: novoVinculo, error: insVErr } = await supabase
      .from("turma_aluno")
      .insert({
        turma_id: vinculoId,
        aluno_pessoa_id: pessoaId,
        matricula_id: matriculaCriada.id,
        dt_inicio: dataInicioVinculo,
        status: "ativo",
      })
      .select("*")
      .single();
    if (insVErr) return serverError("Failed to create turma_aluno.");
    turmaAluno = novoVinculo as Record<string, unknown>;
  }

  if (politica?.modo === "ADIAR_PARA_VENCIMENTO") {
    const motivo = politica.motivo_excecao.trim();
    const vencimentoCalculado = calcVencimentoAdiado(dataMatricula, vencRef ?? 12);
    const { error: evErr } = await supabase.from("matricula_eventos").insert({
      matricula_id: matriculaCriada.id,
      tipo_evento: "EXCECAO_PRIMEIRO_PAGAMENTO_CONCEDIDA",
      dados: {
        motivo_excecao: motivo,
        vencimento_calculado: vencimentoCalculado,
        modo: "ADIAR_PARA_VENCIMENTO",
      },
    });
    if (evErr) return serverError("Matricula criada, mas falha ao registrar evento de excecao.");
  }

  return NextResponse.json(
    {
      ok: true,
      matricula: matriculaCriada,
      turma_aluno: turmaAluno,
    },
    { status: 201 }
  );
}
