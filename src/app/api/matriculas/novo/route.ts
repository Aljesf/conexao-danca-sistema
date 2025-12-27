import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type TipoMatricula = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

type PlanoPagamentoMvp = {
  id: number;
  ativo: boolean;
  ciclo_cobranca: "COBRANCA_UNICA" | "COBRANCA_EM_PARCELAS" | "COBRANCA_MENSAL" | null;
  numero_parcelas: number | null;
  termino_cobranca: "FIM_TURMA_CURSO" | "FIM_PROJETO" | "FIM_ANO_LETIVO" | "DATA_ESPECIFICA" | null;
  data_fim_manual: string | null; // date
  regra_total_devido: "PROPORCIONAL" | "FIXO" | null;
  permite_prorrata: boolean | null;
  ciclo_financeiro: "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | null;
  forma_liquidacao_padrao: string | null;
};

type BodyNovo = {
  pessoa_id: number;
  responsavel_financeiro_id: number;
  tipo_matricula: TipoMatricula;
  vinculo_id: number; // turmas.turma_id (para MVP)
  ano_referencia?: number | null;

  data_matricula?: string | null; // date
  data_inicio_vinculo?: string | null; // date

  escola_tabela_preco_curso_id?: number | null;
  plano_pagamento_id?: number | null;

  forma_liquidacao_padrao?: string | null;
  contrato_modelo_id?: number | null;

  observacoes?: string | null;
};

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: "bad_request", message, details: details ?? null },
    { status: 400 },
  );
}

function conflict(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: "conflict", message, details: details ?? null },
    { status: 409 },
  );
}

function serverError(message: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: "server_error", message, details: details ?? null },
    { status: 500 },
  );
}

function parseDateOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  // Mantém como ISO date YYYY-MM-DD (o front deve enviar assim).
  return value;
}

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: BodyNovo;
  try {
    body = (await req.json()) as BodyNovo;
  } catch {
    return badRequest("JSON inválido.");
  }

  const pessoaId = Number(body.pessoa_id);
  const respFinId = Number(body.responsavel_financeiro_id);
  const tipoMatricula = body.tipo_matricula;
  const vinculoId = Number(body.vinculo_id);

  if (!pessoaId || !respFinId || !tipoMatricula || !vinculoId) {
    return badRequest("Campos obrigatórios ausentes: pessoa_id, responsavel_financeiro_id, tipo_matricula, vinculo_id.");
  }

  const anoRef = body.ano_referencia ?? null;

  // datas
  const dataMatricula = parseDateOrNull(body.data_matricula) ?? null;
  const dataInicioVinculo = parseDateOrNull(body.data_inicio_vinculo) ?? dataMatricula ?? null;

  const escolaTabelaPrecoCursoId = body.escola_tabela_preco_curso_id ?? null;
  const planoPagamentoId = body.plano_pagamento_id ?? null;

  const formaLiquidacaoPadrao =
    body.forma_liquidacao_padrao ?? null; // declarativo
  const contratoModeloId =
    body.contrato_modelo_id ?? null; // declarativo

  // Validações mínimas por tipo
  if (tipoMatricula === "REGULAR" && (anoRef === null || typeof anoRef !== "number")) {
    return badRequest("ano_referencia é obrigatório para tipo_matricula = REGULAR.");
  }

  // 1) Validar entidades base (pessoas e turmas)
  const { data: pessoa, error: pessoaErr } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", pessoaId)
    .maybeSingle();

  if (pessoaErr) return serverError("Falha ao validar pessoa.", { pessoaErr });
  if (!pessoa) return badRequest("pessoa_id não encontrado.");

  const { data: respFin, error: respErr } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", respFinId)
    .maybeSingle();

  if (respErr) return serverError("Falha ao validar responsável financeiro.", { respErr });
  if (!respFin) return badRequest("responsavel_financeiro_id não encontrado.");

  const { data: turma, error: turmaErr } = await supabase
    .from("turmas")
    .select("turma_id")
    .eq("turma_id", vinculoId)
    .maybeSingle();

  if (turmaErr) return serverError("Falha ao validar turma (vinculo_id).", { turmaErr });
  if (!turma) return badRequest("vinculo_id (turma) não encontrado.");

  // 2) Validar Tabela de Preços (quando informada)
  if (escolaTabelaPrecoCursoId !== null) {
    const { data: tabelaPreco, error: tabErr } = await supabase
      .from("escola_tabelas_precos_cursos")
      .select("id, ativo")
      .eq("id", escolaTabelaPrecoCursoId)
      .maybeSingle();

    if (tabErr) return serverError("Falha ao validar escola_tabela_preco_curso_id.", { tabErr });
    if (!tabelaPreco) return badRequest("escola_tabela_preco_curso_id não encontrado.");
    if (!tabelaPreco.ativo) return badRequest("Tabela de Preços informada está inativa.");
  }

  // 3) Validar Plano de Pagamento (quando informado)
  let plano: PlanoPagamentoMvp | null = null;

  if (planoPagamentoId !== null) {
    const { data: planoDb, error: planoErr } = await supabase
      .from("matricula_planos_pagamento")
      .select(
        [
          "id",
          "ativo",
          "ciclo_cobranca",
          "numero_parcelas",
          "termino_cobranca",
          "data_fim_manual",
          "regra_total_devido",
          "permite_prorrata",
          "ciclo_financeiro",
          "forma_liquidacao_padrao",
        ].join(","),
      )
      .eq("id", planoPagamentoId)
      .maybeSingle();

    if (planoErr) return serverError("Falha ao validar plano_pagamento_id.", { planoErr });
    if (!planoDb) return badRequest("plano_pagamento_id não encontrado.");

    plano = planoDb as unknown as PlanoPagamentoMvp;

    if (!plano.ativo) return badRequest("Plano de pagamento informado está inativo.");

    // Regras MVP do plano (sem executar financeiro)
    if (!plano.ciclo_cobranca) {
      return badRequest("Plano de pagamento inválido: ciclo_cobranca ausente.");
    }

    if (plano.ciclo_cobranca === "COBRANCA_EM_PARCELAS") {
      if (!plano.numero_parcelas || plano.numero_parcelas <= 0) {
        return badRequest("Plano inválido: COBRANCA_EM_PARCELAS exige numero_parcelas.");
      }
    }

    if (plano.ciclo_cobranca === "COBRANCA_MENSAL") {
      if (!plano.termino_cobranca) {
        return badRequest("Plano inválido: COBRANCA_MENSAL exige termino_cobranca.");
      }
      if (plano.termino_cobranca === "DATA_ESPECIFICA" && !plano.data_fim_manual) {
        return badRequest("Plano inválido: DATA_ESPECIFICA exige data_fim_manual.");
      }
      // FIM_ANO_LETIVO é permitido e depende de ano_referencia (preferencialmente).
      if (plano.termino_cobranca === "FIM_ANO_LETIVO") {
        const anoBase = anoRef ?? (dataInicioVinculo ? Number(String(dataInicioVinculo).slice(0, 4)) : null);
        if (!anoBase || Number.isNaN(anoBase)) {
          return badRequest("Plano com termino FIM_ANO_LETIVO exige ano_referencia (ou data_inicio_vinculo válida).");
        }
      }
    }
  }

  // 4) Anti-duplicidade simples para REGULAR: mesma pessoa + turma + ano com status ATIVA/TRANCADA
  if (tipoMatricula === "REGULAR") {
    const { data: dup, error: dupErr } = await supabase
      .from("matriculas")
      .select("id")
      .eq("pessoa_id", pessoaId)
      .eq("vinculo_id", vinculoId)
      .eq("tipo_matricula", "REGULAR")
      .eq("ano_referencia", anoRef)
      .in("status", ["ATIVA", "TRANCADA"])
      .limit(1);

    if (dupErr) return serverError("Falha ao checar duplicidade de matrícula.", { dupErr });
    if (dup && dup.length > 0) {
      return conflict("Matrícula REGULAR duplicada para a mesma pessoa/turma/ano.", { matricula_id: dup[0]?.id });
    }
  }

  // 5) Criar matrícula (MVP: sem financeiro)
  const insertPayload: Record<string, unknown> = {
    pessoa_id: pessoaId,
    responsavel_financeiro_id: respFinId,
    tipo_matricula: tipoMatricula,
    vinculo_id: vinculoId,
    ano_referencia: anoRef,
    data_matricula: dataMatricula,
    data_inicio_vinculo: dataInicioVinculo,
    escola_tabela_preco_curso_id: escolaTabelaPrecoCursoId,
    plano_pagamento_id: planoPagamentoId,
    forma_liquidacao_padrao: formaLiquidacaoPadrao ?? plano?.forma_liquidacao_padrao ?? null,
    contrato_modelo_id: contratoModeloId,
    observacoes: body.observacoes ?? null,
    status: "ATIVA",
    created_by: user.id,
    updated_by: user.id,
  };

  // Remove undefined (supabase não gosta)
  for (const k of Object.keys(insertPayload)) {
    if (insertPayload[k] === undefined) delete insertPayload[k];
  }

  const { data: matriculaCriada, error: insErr } = await supabase
    .from("matriculas")
    .insert(insertPayload)
    .select("id, pessoa_id, responsavel_financeiro_id, tipo_matricula, vinculo_id, ano_referencia, data_matricula, data_inicio_vinculo, escola_tabela_preco_curso_id, plano_pagamento_id, forma_liquidacao_padrao, contrato_modelo_id, status")
    .single();

  if (insErr) return serverError("Falha ao criar matrícula.", { insErr });

  // 6) Garantir vínculo operacional em turma_aluno (para REGULAR/CURSO_LIVRE)
  if (tipoMatricula === "REGULAR" || tipoMatricula === "CURSO_LIVRE") {
    const dtInicio = dataInicioVinculo ?? dataMatricula ?? null;

    // Ver se já existe vínculo pessoa/turma ativo
    const { data: taExist, error: taErr } = await supabase
      .from("turma_aluno")
      .select("turma_aluno_id, matricula_id")
      .eq("turma_id", vinculoId)
      .eq("aluno_pessoa_id", pessoaId)
      .is("dt_fim", null)
      .limit(1);

    if (taErr) return serverError("Falha ao checar turma_aluno.", { taErr });

    if (!taExist || taExist.length === 0) {
      const { error: taInsErr } = await supabase
        .from("turma_aluno")
        .insert({
          turma_id: vinculoId,
          aluno_pessoa_id: pessoaId,
          matricula_id: (matriculaCriada as any).id,
          dt_inicio: dtInicio,
          status: "ativo",
        });

      if (taInsErr) return serverError("Falha ao criar vínculo turma_aluno.", { taInsErr });
    } else {
      // Se existe mas não tem matricula_id, preencher
      const current = taExist[0];
      if (!current.matricula_id) {
        const { error: taUpdErr } = await supabase
          .from("turma_aluno")
          .update({ matricula_id: (matriculaCriada as any).id })
          .eq("turma_aluno_id", current.turma_aluno_id);

        if (taUpdErr) return serverError("Falha ao atualizar matricula_id em turma_aluno.", { taUpdErr });
      }
    }
  }

  return NextResponse.json({ ok: true, matricula: matriculaCriada }, { status: 201 });
}
