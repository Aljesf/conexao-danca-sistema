import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

/**
 * POST /api/matriculas/novo
 *
 * Implementa a criação de uma nova matrícula + vínculo em turma_aluno,
 * conforme docs/api-matriculas.md.
 *
 * Regras principais:
 * - Requer usuário autenticado.
 * - Valida payload.
 * - Valida existência de pessoa, responsável e turma.
 * - Evita matrícula duplicada REGULAR para mesma pessoa/turma/ano.
 * - Cria registro em `matriculas`.
 * - Cria vínculo em `turma_aluno` (turma_id, aluno_pessoa_id, matricula_id).
 * - Em caso de erro ao criar turma_aluno, tenta rollback da matrícula.
 */

type TipoMatricula = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

const TIPO_MATRICULA_PERMITIDOS: TipoMatricula[] = [
  "REGULAR",
  "CURSO_LIVRE",
  "PROJETO_ARTISTICO",
];

function badRequest(details: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: "payload_invalido",
      details,
    },
    { status: 400 }
  );
}

function unauthorized() {
  return NextResponse.json(
    {
      ok: false,
      error: "nao_autenticado",
    },
    { status: 401 }
  );
}

function notFound(error: string, extra?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(extra ? { details: extra } : {}),
    },
    { status: 404 }
  );
}

function conflict(error: string, extra?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(extra ? { details: extra } : {}),
    },
    { status: 409 }
  );
}

function internalError(message: string, extra?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: "erro_interno",
      message,
      ...(extra ? { details: extra } : {}),
    },
    { status: 500 }
  );
}

type NovoPayload = {
  pessoa_id: number;
  responsavel_financeiro_id: number;
  tipo_matricula: TipoMatricula;
  vinculo_id: number;
  ano_referencia?: number;
  data_matricula?: string; // YYYY-MM-DD
  observacoes?: string | null;
  origem?: string | null;
  criar_vinculo_turma?: boolean;
};

function isValidDateISO(dateStr: string): boolean {
  // Aceita apenas formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  // Extra: checar se a data convertida bate com a string (evita 2025-13-40 virar outra coisa)
  const [year, month, day] = dateStr.split("-").map((v) => parseInt(v, 10));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() + 1 === month &&
    d.getUTCDate() === day
  );
}

function todayISO(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Valida estrutura e regras básicas do payload.
 * Retorna { ok: true, payload } se estiver ok,
 * ou { ok: false, errors } se houver problema.
 */
function validatePayload(
  body: any
): { ok: true; payload: NovoPayload } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (body == null || typeof body !== "object") {
    return { ok: false, errors: { _root: "corpo_json_obrigatorio" } };
  }

  const {
    pessoa_id,
    responsavel_financeiro_id,
    tipo_matricula,
    vinculo_id,
    ano_referencia,
    data_matricula,
    observacoes,
    origem,
    criar_vinculo_turma,
  } = body as NovoPayload;

  if (!Number.isInteger(pessoa_id) || pessoa_id <= 0) {
    errors.pessoa_id = "pessoa_id_obrigatorio_inteiro_positivo";
  }

  if (!Number.isInteger(responsavel_financeiro_id) || responsavel_financeiro_id <= 0) {
    errors.responsavel_financeiro_id =
      "responsavel_financeiro_id_obrigatorio_inteiro_positivo";
  }

  if (typeof tipo_matricula !== "string" || !TIPO_MATRICULA_PERMITIDOS.includes(tipo_matricula as TipoMatricula)) {
    errors.tipo_matricula = "tipo_matricula_invalido";
  }

  if (!Number.isInteger(vinculo_id) || vinculo_id <= 0) {
    errors.vinculo_id = "vinculo_id_obrigatorio_inteiro_positivo";
  }

  if (tipo_matricula === "REGULAR") {
    if (!Number.isInteger(ano_referencia)) {
      errors.ano_referencia = "ano_referencia_obrigatorio_para_regular";
    } else {
      const currentYear = new Date().getFullYear();
      if (ano_referencia! < 2000 || ano_referencia! > currentYear + 1) {
        errors.ano_referencia = "ano_referencia_fora_do_intervalo";
      }
    }
  } else if (ano_referencia != null) {
    const currentYear = new Date().getFullYear();
    if (ano_referencia < 2000 || ano_referencia > currentYear + 1) {
      errors.ano_referencia = "ano_referencia_fora_do_intervalo";
    }
  }

  if (data_matricula != null) {
    if (typeof data_matricula !== "string" || !isValidDateISO(data_matricula)) {
      errors.data_matricula = "data_matricula_formato_invalido";
    }
  }

  if (observacoes != null && typeof observacoes !== "string") {
    errors.observacoes = "observacoes_deve_ser_string_ou_null";
  } else if (typeof observacoes === "string" && observacoes.length > 2000) {
    errors.observacoes = "observacoes_muito_longa";
  }

  if (origem != null && typeof origem !== "string") {
    errors.origem = "origem_deve_ser_string_ou_null";
  } else if (typeof origem === "string" && origem.length > 100) {
    errors.origem = "origem_muito_longa";
  }

  if (criar_vinculo_turma != null && typeof criar_vinculo_turma !== "boolean") {
    errors.criar_vinculo_turma = "criar_vinculo_turma_deve_ser_booleano";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    payload: {
      pessoa_id,
      responsavel_financeiro_id,
      tipo_matricula: tipo_matricula as TipoMatricula,
      vinculo_id,
      ano_referencia,
      data_matricula,
      observacoes: observacoes ?? null,
      origem: origem ?? null,
      criar_vinculo_turma:
        criar_vinculo_turma === undefined ? true : criar_vinculo_turma,
    },
  };
}

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  // 1. Autenticação básica
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorized();
  }

  // TODO: no futuro, validar roles/permissões (ADMIN/SECRETARIA/etc.)
  // usando profiles + usuario_roles/roles_sistema.

  // 2. Ler e validar payload
  let jsonBody: any;
  try {
    jsonBody = await request.json();
  } catch (e) {
    return badRequest({ _root: "json_invalido" });
  }

  const validation = validatePayload(jsonBody);
  if (!validation.ok) {
    return badRequest(validation.errors);
  }

  const {
    pessoa_id,
    responsavel_financeiro_id,
    tipo_matricula,
    vinculo_id,
    ano_referencia,
    data_matricula,
    observacoes,
    // coluna origem ainda não existe na tabela; manter leitura futura
    origem: _origem,
    criar_vinculo_turma,
  } = validation.payload;

  const dataMatriculaEfetiva = data_matricula ?? todayISO();

  // 3. Validar existência de pessoa, responsável e turma
  const { data: pessoa, error: pessoaError } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", pessoa_id)
    .maybeSingle();

  if (pessoaError) {
    return internalError("erro_buscar_pessoa", pessoaError.message);
  }
  if (!pessoa) {
    return notFound("pessoa_nao_encontrada");
  }

  const { data: responsavel, error: respError } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", responsavel_financeiro_id)
    .maybeSingle();

  if (respError) {
    return internalError("erro_buscar_responsavel", respError.message);
  }
  if (!responsavel) {
    return notFound("responsavel_nao_encontrado");
  }

  const { data: turma, error: turmaError } = await supabase
    .from("turmas")
    .select("turma_id, status")
    .eq("turma_id", vinculo_id)
    .maybeSingle();

  if (turmaError) {
    return internalError("erro_buscar_turma", turmaError.message);
  }
  if (!turma) {
    return notFound("turma_nao_encontrada");
  }

  // Opcional: checar status da turma (ajuste conforme o enum real)
  // Ex.: se tiver campo status, evitar matrícula em turma arquivada/encerrada:
  // if (turma.status && !["ATIVA", "ABERTA_INSCRICOES"].includes(turma.status)) {
  //   return conflict("turma_nao_aceita_matriculas", { status: turma.status });
  // }

  // 4. Regra de matrículas duplicadas (REGULAR)
  if (tipo_matricula === "REGULAR") {
    const { data: existente, error: dupError } = await supabase
      .from("matriculas")
      .select("id, pessoa_id, tipo_matricula, vinculo_id, ano_referencia, status")
      .eq("pessoa_id", pessoa_id)
      .eq("tipo_matricula", "REGULAR")
      .eq("vinculo_id", vinculo_id)
      .eq("ano_referencia", ano_referencia)
      .in("status", ["ATIVA", "TRANCADA"])
      .maybeSingle();

    if (dupError && dupError.code !== "PGRST116") {
      // PGRST116 é "No rows found" no PostgREST; ajustar se necessário
      return internalError("erro_verificar_matricula_duplicada", dupError.message);
    }

    if (existente) {
      return conflict("matricula_duplicada", {
        id: existente.id,
        pessoa_id: existente.pessoa_id,
        tipo_matricula: existente.tipo_matricula,
        vinculo_id: existente.vinculo_id,
        ano_referencia: existente.ano_referencia,
        status: existente.status,
      });
    }
  }

  // 5. Criar matrícula em `matriculas`
  const { data: matricula, error: matriculaError } = await supabase
    .from("matriculas")
    .insert({
      pessoa_id,
      responsavel_financeiro_id,
      tipo_matricula,
      vinculo_id,
      ano_referencia: ano_referencia ?? null,
      data_matricula: dataMatriculaEfetiva,
      // status inicial: ATIVA (ajustar conforme enum real)
      status: "ATIVA",
      observacoes,
      // campos de auditoria serão preenchidos via triggers ou
      // podem ser tratados aqui se houver colunas created_by/updated_by
    })
    .select("*")
    .single();

  if (matriculaError || !matricula) {
    return internalError("erro_criar_matricula", matriculaError?.message);
  }

  // 6. Criar vínculo em turma_aluno (se solicitado)
  let turmaAluno: any = null;

  if (criar_vinculo_turma) {
    const { data: turmaAlunoData, error: turmaAlunoError } = await supabase
      .from("turma_aluno")
      .insert({
        turma_id: vinculo_id,
        aluno_pessoa_id: pessoa_id,
        dt_inicio: dataMatriculaEfetiva,
        dt_fim: null,
        status: "ativo", // ajustar ao enum/texto real
        matricula_id: matricula.id,
      })
      .select("*")
      .single();

    if (turmaAlunoError || !turmaAlunoData) {
      // Rollback manual: tentar apagar a matrícula recém criada
      await supabase.from("matriculas").delete().eq("id", matricula.id);

      return internalError("erro_criar_vinculo_turma", turmaAlunoError?.message);
    }

    turmaAluno = turmaAlunoData;
  }

  return NextResponse.json(
    {
      ok: true,
      matricula,
      turma_aluno: turmaAluno,
    },
    { status: 201 }
  );
}
