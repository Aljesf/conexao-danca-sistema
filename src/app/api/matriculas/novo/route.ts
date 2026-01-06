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
  data_fim_manual: string | null;
  regra_total_devido: "PROPORCIONAL" | "FIXO" | null;
  permite_prorrata: boolean | null;
  ciclo_financeiro: "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | null;
  forma_liquidacao_padrao: string | null;
};

type BodyNovo = {
  pessoa_id: number;
  responsavel_financeiro_id: number;
  tipo_matricula: TipoMatricula;
  vinculo_id: number;
  vinculos_ids?: number[] | null;
  itens?: MatriculaItemIn[] | null;
  ano_referencia?: number | null;
  data_matricula?: string | null;
  data_inicio_vinculo?: string | null;
  escola_tabela_preco_curso_id?: number | null;
  plano_pagamento_id?: number | null;
  forma_liquidacao_padrao?: string | null;
  documento_modelo_id?: number | null;
  contrato_modelo_id?: number | null;
  observacoes?: string | null;
  total_mensalidade_centavos?: number | null;
};

type MatriculaItemIn = {
  servico_id: number;
  unidade_execucao_id: number;
  turma_id?: number | null;
};

type MatriculaItem = {
  servico_id: number;
  unidade_execucao_id: number;
  turma_id: number;
};

function badRequest(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "bad_request", message, details: details ?? null }, { status: 400 });
}

function conflict(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "conflict", message, details: details ?? null }, { status: 409 });
}

function serverError(message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: "server_error", message, details: details ?? null }, { status: 500 });
}

function parseDateOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value;
}

function normalizeIdArray(value: unknown): number[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of value) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return null;
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

function parseItens(value: unknown): MatriculaItemIn[] | null {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const itens: MatriculaItemIn[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as Record<string, unknown>;
    const servicoId = Number(record.servico_id);
    const unidadeExecucaoId = Number(record.unidade_execucao_id);
    if (!Number.isFinite(servicoId) || servicoId <= 0) return null;
    if (!Number.isFinite(unidadeExecucaoId) || unidadeExecucaoId <= 0) return null;
    const turmaRaw = record.turma_id;
    const turmaId = turmaRaw === undefined || turmaRaw === null ? null : Number(turmaRaw);
    if (turmaRaw !== undefined && turmaRaw !== null) {
      if (!Number.isFinite(turmaId) || (turmaId as number) <= 0) return null;
    }
    itens.push({
      servico_id: servicoId,
      unidade_execucao_id: unidadeExecucaoId,
      turma_id: Number.isFinite(turmaId as number) ? (turmaId as number) : null,
    });
  }
  return itens;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

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
    return badRequest("JSON invalido.");
  }

  const pessoaId = Number(body.pessoa_id);
  const respFinId = Number(body.responsavel_financeiro_id);
  const tipoMatricula = body.tipo_matricula;
  const itensParsed = parseItens(body.itens);
  if (itensParsed === null) {
    return badRequest("itens invalidos.");
  }
  const itensIn = itensParsed ?? [];
  const hasItens = Object.prototype.hasOwnProperty.call(body as Record<string, unknown>, "itens");
  if (hasItens && itensIn.length === 0) {
    return badRequest("itens_obrigatorios.");
  }

  const itensResolved: MatriculaItem[] = [];
  for (const it of itensIn) {
    const servicoId = Number(it.servico_id);
    const ueId = Number(it.unidade_execucao_id);
    const turmaIdDirect = it.turma_id ?? null;

    if (!Number.isFinite(servicoId) || !Number.isFinite(ueId)) continue;

    if (typeof turmaIdDirect === "number" && Number.isFinite(turmaIdDirect)) {
      itensResolved.push({ servico_id: servicoId, unidade_execucao_id: ueId, turma_id: turmaIdDirect });
      continue;
    }

    const { data: ue, error: ueErr } = await supabase
      .from("escola_unidades_execucao")
      .select("origem_tipo, origem_id")
      .eq("unidade_execucao_id", ueId)
      .maybeSingle();

    if (ueErr || !ue || ue.origem_tipo !== "TURMA" || !ue.origem_id) {
      return NextResponse.json(
        { ok: false, error: "nao_foi_possivel_resolver_turma", ue_id: ueId },
        { status: 500 },
      );
    }

    itensResolved.push({ servico_id: servicoId, unidade_execucao_id: ueId, turma_id: Number(ue.origem_id) });
  }

  if (itensIn.length > 0 && itensResolved.length === 0) {
    return NextResponse.json({ ok: false, error: "itens_invalidos" }, { status: 400 });
  }

  const itens = itensIn.length > 0 ? itensResolved : [];

  let vinculoId = Number(body.vinculo_id);
  const vinculosIdsParsed = normalizeIdArray(body.vinculos_ids);
  if (vinculosIdsParsed === null) {
    return badRequest("vinculos_ids invalidos.");
  }
  let vinculosIds = vinculosIdsParsed ?? [];

  if (itens.length > 0) {
    const principal = itens[0];
    vinculoId = principal.turma_id;
    vinculosIds = Array.from(new Set(itens.map((item) => item.turma_id)));
  } else {
    if (!Number.isFinite(vinculoId) || vinculoId <= 0) {
      vinculoId = vinculosIds[0] ?? NaN;
    }

    if (vinculosIds.length === 0 && Number.isFinite(vinculoId) && vinculoId > 0) {
      vinculosIds = [vinculoId];
    } else if (vinculosIds.length > 0 && Number.isFinite(vinculoId) && !vinculosIds.includes(vinculoId)) {
      vinculosIds.unshift(vinculoId);
    }
  }

  if (!pessoaId || !respFinId || !tipoMatricula || !Number.isFinite(vinculoId) || vinculoId <= 0) {
    return badRequest(
      "Campos obrigatorios ausentes: pessoa_id, responsavel_financeiro_id, tipo_matricula, vinculo_id (ou itens/vinculos_ids).",
    );
  }

  const anoRef = body.ano_referencia ?? null;

  const dataMatricula = parseDateOrNull(body.data_matricula) ?? null;
  const dataInicioVinculo = parseDateOrNull(body.data_inicio_vinculo) ?? dataMatricula ?? null;

  const escolaTabelaPrecoCursoId = body.escola_tabela_preco_curso_id ?? null;
  const planoPagamentoId = body.plano_pagamento_id ?? null;

  const formaLiquidacaoPadrao = body.forma_liquidacao_padrao ?? null;
  const documentoModeloId = body.documento_modelo_id ?? body.contrato_modelo_id ?? null;

  if (tipoMatricula === "REGULAR" && (anoRef === null || typeof anoRef !== "number")) {
    return badRequest("ano_referencia e obrigatorio para tipo_matricula = REGULAR.");
  }

  const { data: pessoa, error: pessoaErr } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", pessoaId)
    .maybeSingle();

  if (pessoaErr) return serverError("Falha ao validar pessoa.", { pessoaErr });
  if (!pessoa) return badRequest("pessoa_id nao encontrado.");

  const { data: respFin, error: respErr } = await supabase
    .from("pessoas")
    .select("id")
    .eq("id", respFinId)
    .maybeSingle();

  if (respErr) return serverError("Falha ao validar responsavel financeiro.", { respErr });
  if (!respFin) return badRequest("responsavel_financeiro_id nao encontrado.");

  const { data: turmas, error: turmaErr } = await supabase
    .from("turmas")
    .select("turma_id")
    .in("turma_id", vinculosIds);

  if (turmaErr) return serverError("Falha ao validar turma (vinculo_id).", { turmaErr });

  const foundIds = new Set((turmas ?? []).map((t) => Number((t as { turma_id?: number }).turma_id)));
  const missingIds = vinculosIds.filter((id) => !foundIds.has(id));
  if (missingIds.length > 0) {
    return badRequest("vinculo_id (turma) nao encontrado.", { missing_ids: missingIds });
  }

  if (anoRef !== null) {
    const resolveUrl = new URL("/api/matriculas/precos/resolver", req.url);
    resolveUrl.searchParams.set("aluno_id", String(pessoaId));
    resolveUrl.searchParams.set("alvo_tipo", "TURMA");
    resolveUrl.searchParams.set("alvo_id", String(vinculoId));
    resolveUrl.searchParams.set("ano", String(anoRef));

    const resolveRes = await fetch(resolveUrl.toString(), {
      headers: { cookie: cookieStore.toString() },
    });

    let resolvePayload: { ok?: boolean; message?: string; details?: Record<string, unknown> } | null = null;
    try {
      resolvePayload = (await resolveRes.json()) as {
        ok?: boolean;
        message?: string;
        details?: Record<string, unknown>;
      };
    } catch {
      resolvePayload = null;
    }

    if (!resolveRes.ok || !resolvePayload?.ok) {
      const status = resolveRes.status === 409 ? 409 : resolveRes.status === 400 ? 400 : 500;
      const errorCode = status === 409 ? "conflict" : status === 400 ? "bad_request" : "server_error";
      return NextResponse.json(
        {
          ok: false,
          error: errorCode,
          message: resolvePayload?.message || "Falha ao validar precificacao.",
          details: resolvePayload?.details ?? null,
        },
        { status },
      );
    }
  }

  if (escolaTabelaPrecoCursoId !== null) {
    const { data: tabelaPreco, error: tabErr } = await supabase
      .from("escola_tabelas_precos_cursos")
      .select("id, ativo")
      .eq("id", escolaTabelaPrecoCursoId)
      .maybeSingle();

    if (tabErr) return serverError("Falha ao validar escola_tabela_preco_curso_id.", { tabErr });
    if (!tabelaPreco) return badRequest("escola_tabela_preco_curso_id nao encontrado.");
    if (!tabelaPreco.ativo) return badRequest("Tabela de precos informada esta inativa.");
  }

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
    if (!planoDb) return badRequest("plano_pagamento_id nao encontrado.");

    plano = planoDb as unknown as PlanoPagamentoMvp;

    if (!plano.ativo) return badRequest("Plano de pagamento informado esta inativo.");

    if (!plano.ciclo_cobranca) {
      return badRequest("Plano de pagamento invalido: ciclo_cobranca ausente.");
    }

    if (plano.ciclo_cobranca === "COBRANCA_EM_PARCELAS") {
      if (!plano.numero_parcelas || plano.numero_parcelas <= 0) {
        return badRequest("Plano invalido: COBRANCA_EM_PARCELAS exige numero_parcelas.");
      }
    }

    if (plano.ciclo_cobranca === "COBRANCA_MENSAL") {
      if (!plano.termino_cobranca) {
        return badRequest("Plano invalido: COBRANCA_MENSAL exige termino_cobranca.");
      }
      if (plano.termino_cobranca === "DATA_ESPECIFICA" && !plano.data_fim_manual) {
        return badRequest("Plano invalido: DATA_ESPECIFICA exige data_fim_manual.");
      }
      if (plano.termino_cobranca === "FIM_ANO_LETIVO") {
        const anoBase = anoRef ?? (dataInicioVinculo ? Number(String(dataInicioVinculo).slice(0, 4)) : null);
        if (!anoBase || Number.isNaN(anoBase)) {
          return badRequest("Plano com termino FIM_ANO_LETIVO exige ano_referencia (ou data_inicio_vinculo valida).");
        }
      }
    }
  }

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

    if (dupErr) return serverError("Falha ao checar duplicidade de matricula.", { dupErr });
    if (dup && dup.length > 0) {
      return conflict("Matricula REGULAR duplicada para a mesma pessoa/turma/ano.", { matricula_id: dup[0]?.id });
    }
  }

  const statusFluxoInicial = "AGUARDANDO_LIQUIDACAO";
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
    documento_modelo_id: documentoModeloId,
    observacoes: body.observacoes ?? null,
    status_fluxo: statusFluxoInicial,
    total_mensalidade_centavos: body.total_mensalidade_centavos ?? 0,
    rascunho_expira_em: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString(),
    status: "ATIVA",
    created_by: user.id,
    updated_by: user.id,
  };

  for (const k of Object.keys(insertPayload)) {
    if (insertPayload[k] === undefined) delete insertPayload[k];
  }

  const { data: matriculaCriada, error: insErr } = await supabase
    .from("matriculas")
    .insert(insertPayload)
    .select(
      "id, pessoa_id, responsavel_financeiro_id, tipo_matricula, vinculo_id, ano_referencia, data_matricula, data_inicio_vinculo, escola_tabela_preco_curso_id, plano_pagamento_id, forma_liquidacao_padrao, documento_modelo_id, status",
    )
    .single();

  if (insErr) return serverError("Falha ao criar matricula.", { insErr });

  if (tipoMatricula === "REGULAR" || tipoMatricula === "CURSO_LIVRE" || tipoMatricula === "PROJETO_ARTISTICO") {
    const dtInicio = dataInicioVinculo ?? dataMatricula ?? null;

    for (const turmaId of vinculosIds) {
      const { data: taExist, error: taErr } = await supabase
        .from("turma_aluno")
        .select("turma_aluno_id, matricula_id")
        .eq("turma_id", turmaId)
        .eq("aluno_pessoa_id", pessoaId)
        .is("dt_fim", null)
        .limit(1);

      if (taErr) return serverError("Falha ao checar turma_aluno.", { taErr, turmaId });

      if (!taExist || taExist.length === 0) {
        const { error: taInsErr } = await supabase
          .from("turma_aluno")
          .insert({
            turma_id: turmaId,
            aluno_pessoa_id: pessoaId,
            matricula_id: (matriculaCriada as { id: number }).id,
            dt_inicio: dtInicio,
            status: "ativo",
          });

        if (taInsErr) return serverError("Falha ao criar vinculo turma_aluno.", { taInsErr, turmaId });
      } else {
        const current = taExist[0];
        if (!current.matricula_id) {
          const { error: taUpdErr } = await supabase
            .from("turma_aluno")
            .update({ matricula_id: (matriculaCriada as { id: number }).id })
            .eq("turma_aluno_id", current.turma_aluno_id);

          if (taUpdErr) return serverError("Falha ao atualizar matricula_id em turma_aluno.", { taUpdErr, turmaId });
        }
      }
    }
  }

  return NextResponse.json({ ok: true, matricula: matriculaCriada }, { status: 201 });
}
