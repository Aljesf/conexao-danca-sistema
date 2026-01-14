import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { upsertLancamentoPorCobranca } from "@/lib/credito-conexao/upsertLancamentoPorCobranca";

type EntradaPayload = {
  valor_centavos: number;
  pago_no_ato: boolean;
  metodo_pagamento?: string | null;
  data_pagamento?: string | null;
  observacoes?: string | null;
};

type ExecutePayload = {
  motivo: string;
  forcar_rebuild_faturas?: boolean;
  entrada?: EntradaPayload;
};

type Diagnostico = {
  ok: true;
  matricula_id: number;
  resumo: {
    tipo_matricula: string;
    ano_referencia: number | null;
    data_inicio_vinculo: string | null;
    data_matricula: string | null;
  };
  checks: {
    matricula_existe: boolean;
    turma_aluno_ok: boolean;
    responsavel_financeiro_ok: boolean;
    conta_cartao_existe: boolean;
    cobrancas_cartao_existentes: number;
    cobrancas_cartao_esperadas: number;
    competencias_esperadas: string[];
    competencias_faltantes: string[];
    lancamentos_existentes: number;
    faturas_existentes: number;
  };
  fontes: {
    entrada: string;
    mensalidades: string;
  };
  sugestoes: {
    entrada_pactuada_centavos: number;
    mensalidade_padrao_centavos: number;
  };
  acoes_planejadas: Array<{ code: string; detail: string }>;
};

function parseId(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function asDateStr(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function asInt(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

function isSchemaMissing(err: unknown): boolean {
  const anyErr = err as { code?: string } | null;
  return !!anyErr?.code && (anyErr.code === "42P01" || anyErr.code === "42703");
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDateISO(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toCompetencia(dateISO: string): string {
  return dateISO.slice(0, 7);
}

function competenciasEntre(inicioISO: string, fimISO: string): string[] {
  const start = new Date(`${inicioISO}T00:00:00Z`);
  const end = new Date(`${fimISO}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const startKey = start.getUTCFullYear() * 12 + start.getUTCMonth();
  const endKey = end.getUTCFullYear() * 12 + end.getUTCMonth();
  const out: string[] = [];

  for (let key = startKey; key <= endKey; key += 1) {
    const year = Math.floor(key / 12);
    const month = key % 12;
    out.push(`${year}-${String(month + 1).padStart(2, "0")}`);
  }

  return out;
}

function buildVencimento(competencia: string, diaVencimento: number | null): string {
  const [anoStr, mesStr] = competencia.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const dia = diaVencimento && diaVencimento >= 1 && diaVencimento <= 31 ? diaVencimento : 12;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.toISOString().slice(0, 10);
}

async function getCondicoesPactuadas(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  matriculaId: number,
) {
  let entradaPactuada = 0;
  let mensalidadePadrao = 0;
  let fonteEntrada = "fallback:sem-dados";
  let fonteMens = "fallback:sem-dados";

  const { data: mat } = await supabase
    .from("matriculas")
    .select("id, primeira_cobranca_valor_centavos, total_mensalidade_centavos")
    .eq("id", matriculaId)
    .maybeSingle();

  const primeiraValor = Number((mat as { primeira_cobranca_valor_centavos?: unknown })?.primeira_cobranca_valor_centavos ?? 0);
  if (Number.isFinite(primeiraValor) && primeiraValor > 0) {
    entradaPactuada = Math.trunc(primeiraValor);
    fonteEntrada = "matriculas.primeira_cobranca_valor_centavos";
  }

  const { data: execRows, error: execErr } = await supabase
    .from("matricula_execucao_valores")
    .select("valor_mensal_centavos, ativo")
    .eq("matricula_id", matriculaId)
    .eq("ativo", true);

  if (execErr && !isSchemaMissing(execErr)) throw execErr;
  if (!execErr && Array.isArray(execRows) && execRows.length > 0) {
    const total = execRows.reduce(
      (acc, row) => acc + Number((row as { valor_mensal_centavos?: unknown }).valor_mensal_centavos ?? 0),
      0,
    );
    if (Number.isFinite(total) && total > 0) {
      mensalidadePadrao = Math.trunc(total);
      fonteMens = "matricula_execucao_valores";
    }
  }

  if (!mensalidadePadrao) {
    const totalMensal = Number((mat as { total_mensalidade_centavos?: unknown })?.total_mensalidade_centavos ?? 0);
    if (Number.isFinite(totalMensal) && totalMensal > 0) {
      mensalidadePadrao = Math.trunc(totalMensal);
      fonteMens = "matriculas.total_mensalidade_centavos";
    }
  }

  return { entradaPactuada, mensalidadePadrao, fonteEntrada, fonteMens };
}

async function listarTurmasMatricula(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  matriculaId: number,
  vinculoId: number | null,
) {
  const turmaIds = new Set<number>();
  const { data: execRows, error: execErr } = await supabase
    .from("matricula_execucao_valores")
    .select("turma_id, ativo")
    .eq("matricula_id", matriculaId)
    .eq("ativo", true);

  if (execErr && !isSchemaMissing(execErr)) throw execErr;

  if (!execErr && Array.isArray(execRows)) {
    execRows.forEach((row) => {
      const turmaId = asInt((row as { turma_id?: unknown }).turma_id);
      if (turmaId) turmaIds.add(turmaId);
    });
  }

  if (turmaIds.size === 0 && vinculoId) turmaIds.add(vinculoId);

  return Array.from(turmaIds);
}

async function diagnosticar(matriculaId: number): Promise<Diagnostico> {
  const supabase = getSupabaseAdmin();

  const { data: matricula, error: errMat } = await supabase
    .from("matriculas")
    .select(
      "id, pessoa_id, responsavel_financeiro_id, tipo_matricula, ano_referencia, data_inicio_vinculo, data_matricula, vinculo_id",
    )
    .eq("id", matriculaId)
    .maybeSingle();

  if (errMat) throw errMat;
  if (!matricula) throw new Error("matricula_nao_encontrada");

  const tipo = String((matricula as { tipo_matricula?: unknown }).tipo_matricula ?? "REGULAR");
  const anoRef = Number((matricula as { ano_referencia?: unknown }).ano_referencia ?? 0) || null;
  const dataInicio = asDateStr((matricula as { data_inicio_vinculo?: unknown }).data_inicio_vinculo);
  const dataMatricula = asDateStr((matricula as { data_matricula?: unknown }).data_matricula);

  const pessoaId = asInt((matricula as { pessoa_id?: unknown }).pessoa_id);
  const responsavelId = asInt((matricula as { responsavel_financeiro_id?: unknown }).responsavel_financeiro_id);
  const vinculoId = asInt((matricula as { vinculo_id?: unknown }).vinculo_id);

  const { entradaPactuada, mensalidadePadrao, fonteEntrada, fonteMens } = await getCondicoesPactuadas(
    supabase,
    matriculaId,
  );

  const acoes: Array<{ code: string; detail: string }> = [];

  const responsavelOk = !!responsavelId;
  if (!responsavelOk) {
    acoes.push({
      code: "FIX_RESPONSAVEL_FINANCEIRO",
      detail: "Matricula sem responsavel financeiro. Corrija antes de reprocessar.",
    });
  }

  const turmaIds = await listarTurmasMatricula(supabase, matriculaId, vinculoId);
  let turmaAlunoOk = turmaIds.length > 0;

  if (turmaIds.length > 0 && pessoaId) {
    for (const turmaId of turmaIds) {
      const { data: ta, error: taErr } = await supabase
        .from("turma_aluno")
        .select("turma_aluno_id, matricula_id")
        .eq("turma_id", turmaId)
        .eq("aluno_pessoa_id", pessoaId)
        .is("dt_fim", null)
        .limit(1);

      if (taErr) throw taErr;
      if (!ta || ta.length === 0) {
        turmaAlunoOk = false;
        break;
      }
    }
  } else {
    turmaAlunoOk = false;
  }

  if (!turmaAlunoOk) {
    acoes.push({
      code: "CREATE_TURMA_ALUNO",
      detail: "Aluno nao esta vinculado a turma. Vinculo sera criado.",
    });
  }

  let contaExiste = false;
  let contaConexaoId: number | null = null;
  if (responsavelId) {
    const { data: conta, error: contaErr } = await supabase
      .from("credito_conexao_contas")
      .select("id")
      .eq("pessoa_titular_id", responsavelId)
      .eq("tipo_conta", "ALUNO")
      .eq("ativo", true)
      .maybeSingle();
    if (contaErr) throw contaErr;
    contaExiste = !!conta;
    contaConexaoId = conta ? asInt((conta as { id?: unknown }).id) : null;
  }

  if (!contaExiste) {
    acoes.push({
      code: "CREATE_CARTAO_CONEXAO",
      detail: "Responsavel nao possui Cartao Conexao ALUNO ativo. Conta sera criada.",
    });
  }

  let competenciasEsperadas: string[] = [];
  const baseInicio = dataInicio ?? dataMatricula ?? todayISO();
  if (tipo === "REGULAR" && anoRef) {
    const inicio = dataInicio ?? dataMatricula ?? `${anoRef}-01-01`;
    const fim = `${anoRef}-12-01`;
    competenciasEsperadas = competenciasEntre(inicio, fim);
  } else if (baseInicio) {
    competenciasEsperadas = [toCompetencia(baseInicio)];
    acoes.push({
      code: "WARN_COMPETENCIAS_FALLBACK",
      detail: "Competencias esperadas calculadas por fallback (ano_ref/tipo ausente).",
    });
  }

  const { data: cobExist, error: cobErr } = await supabase
    .from("cobrancas")
    .select("id, competencia_ano_mes")
    .in("origem_tipo", ["MATRICULA", "MATRICULA_MENSALIDADE"])
    .eq("origem_subtipo", "CARTAO_CONEXAO")
    .eq("origem_id", matriculaId);

  if (cobErr) throw cobErr;

  const competenciasExistentes = new Set<string>();
  const cobrancaIds: number[] = [];
  (cobExist ?? []).forEach((row) => {
    const comp = typeof row.competencia_ano_mes === "string" ? row.competencia_ano_mes : "";
    if (comp) competenciasExistentes.add(comp);
    const id = asInt((row as { id?: unknown }).id);
    if (id) cobrancaIds.push(id);
  });

  const faltantes = competenciasEsperadas.filter((c) => !competenciasExistentes.has(c));
  if (faltantes.length > 0) {
    acoes.push({
      code: "CREATE_COBRANCAS_COMPETENCIAS",
      detail: `Criar ${faltantes.length} cobrancas faltantes no Cartao Conexao.`,
    });
  }

  if (faltantes.length > 0 && mensalidadePadrao <= 0) {
    acoes.push({
      code: "NEED_MENSALIDADE_PADRAO",
      detail: "Valor de mensalidade padrao indisponivel. Reprocessamento vai bloquear.",
    });
  }

  let lancamentosExistentes = 0;
  if (cobrancaIds.length > 0) {
    const { data: lancs, error: lErr } = await supabase
      .from("credito_conexao_lancamentos")
      .select("id, cobranca_id")
      .in("cobranca_id", cobrancaIds);
    if (lErr) throw lErr;
    lancamentosExistentes = Array.isArray(lancs) ? lancs.length : 0;
  }

  let faturasExistentes = 0;
  if (contaConexaoId) {
    const { data: f, error: fErr } = await supabase
      .from("credito_conexao_faturas")
      .select("id")
      .eq("conta_conexao_id", contaConexaoId);
    if (fErr) throw fErr;
    faturasExistentes = Array.isArray(f) ? f.length : 0;
  }

  return {
    ok: true,
    matricula_id: matriculaId,
    resumo: {
      tipo_matricula: tipo,
      ano_referencia: anoRef,
      data_inicio_vinculo: dataInicio,
      data_matricula: dataMatricula,
    },
    checks: {
      matricula_existe: true,
      turma_aluno_ok: turmaAlunoOk,
      responsavel_financeiro_ok: responsavelOk,
      conta_cartao_existe: contaExiste,
      cobrancas_cartao_existentes: competenciasExistentes.size,
      cobrancas_cartao_esperadas: competenciasEsperadas.length,
      competencias_esperadas: competenciasEsperadas,
      competencias_faltantes: faltantes,
      lancamentos_existentes: lancamentosExistentes,
      faturas_existentes: faturasExistentes,
    },
    fontes: { entrada: fonteEntrada, mensalidades: fonteMens },
    sugestoes: {
      entrada_pactuada_centavos: entradaPactuada,
      mensalidade_padrao_centavos: mensalidadePadrao,
    },
    acoes_planejadas: acoes,
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ id?: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  try {
    const { id } = await ctx.params;
    const matriculaId = parseId(id);
    if (!matriculaId) {
      return NextResponse.json({ ok: false, error: "matricula_id_invalido" }, { status: 400 });
    }

    const diag = await diagnosticar(matriculaId);
    return NextResponse.json(diag);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    if (msg === "matricula_nao_encontrada") {
      return NextResponse.json({ ok: false, error: "matricula_nao_encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "erro_diagnostico", detail: msg }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id?: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  try {
    const { id } = await ctx.params;
    const matriculaId = parseId(id);
    if (!matriculaId) {
      return NextResponse.json({ ok: false, error: "matricula_id_invalido" }, { status: 400 });
    }

    let payload: ExecutePayload;
    try {
      payload = (await req.json()) as ExecutePayload;
    } catch {
      return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
    }

    if (!payload?.motivo?.trim()) {
      return NextResponse.json({ ok: false, error: "motivo_obrigatorio" }, { status: 400 });
    }

    if (payload.entrada) {
      const valorEntrada = Number(payload.entrada.valor_centavos);
      if (!Number.isInteger(valorEntrada) || valorEntrada < 0) {
        return NextResponse.json({ ok: false, error: "valor_entrada_invalido" }, { status: 400 });
      }
      if (payload.entrada.data_pagamento && !isDateISO(payload.entrada.data_pagamento)) {
        return NextResponse.json({ ok: false, error: "data_pagamento_invalida" }, { status: 400 });
      }
    }

    const supabase = getSupabaseAdmin();
    const diag = await diagnosticar(matriculaId);

    if (!diag.checks.responsavel_financeiro_ok) {
      return NextResponse.json({ ok: false, error: "matricula_sem_responsavel_financeiro" }, { status: 400 });
    }

    if (diag.checks.competencias_faltantes.length > 0 && diag.sugestoes.mensalidade_padrao_centavos <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "mensalidade_padrao_indisponivel",
          detail: "Nao foi possivel determinar valor padrao para gerar cobrancas.",
        },
        { status: 400 },
      );
    }

    const { data: matricula, error: errMat } = await supabase
      .from("matriculas")
      .select("id, pessoa_id, responsavel_financeiro_id, vinculo_id")
      .eq("id", matriculaId)
      .single();

    if (errMat) throw errMat;

    const pessoaId = asInt((matricula as { pessoa_id?: unknown }).pessoa_id);
    const responsavelId = asInt((matricula as { responsavel_financeiro_id?: unknown }).responsavel_financeiro_id);
    const vinculoId = asInt((matricula as { vinculo_id?: unknown }).vinculo_id);

    if (!pessoaId || !responsavelId) {
      return NextResponse.json({ ok: false, error: "matricula_sem_responsavel_financeiro" }, { status: 400 });
    }

    const turmaIds = await listarTurmasMatricula(supabase, matriculaId, vinculoId);
    if (turmaIds.length > 0) {
      for (const turmaId of turmaIds) {
        const { data: taExist, error: taErr } = await supabase
          .from("turma_aluno")
          .select("turma_aluno_id, matricula_id")
          .eq("turma_id", turmaId)
          .eq("aluno_pessoa_id", pessoaId)
          .is("dt_fim", null)
          .limit(1);

        if (taErr) throw taErr;

        if (!taExist || taExist.length === 0) {
          const { error: insErr } = await supabase.from("turma_aluno").insert({
            turma_id: turmaId,
            aluno_pessoa_id: pessoaId,
            matricula_id: matriculaId,
            dt_inicio: todayISO(),
            status: "ativo",
          });
          if (insErr) throw insErr;
        } else if (!taExist[0]?.matricula_id) {
          const { error: updErr } = await supabase
            .from("turma_aluno")
            .update({ matricula_id: matriculaId })
            .eq("turma_aluno_id", taExist[0].turma_aluno_id);
          if (updErr) throw updErr;
        }
      }
    }

    const { data: conta } = await supabase
      .from("credito_conexao_contas")
      .select("*")
      .eq("pessoa_titular_id", responsavelId)
      .eq("tipo_conta", "ALUNO")
      .eq("ativo", true)
      .maybeSingle();

    let contaConexaoId: number;
    let diaVencimento: number | null = null;

    if (!conta) {
      const { data: contaNova, error: errConta } = await supabase
        .from("credito_conexao_contas")
        .insert({
          pessoa_titular_id: responsavelId,
          tipo_conta: "ALUNO",
          descricao_exibicao: "Cartao Conexao Aluno",
          ativo: true,
        })
        .select("*")
        .single();

      if (errConta) throw errConta;
      contaConexaoId = Number((contaNova as { id?: unknown }).id);
      diaVencimento = Number.isFinite(Number((contaNova as { dia_vencimento?: unknown }).dia_vencimento))
        ? Number((contaNova as { dia_vencimento?: unknown }).dia_vencimento)
        : null;
    } else {
      contaConexaoId = Number((conta as { id?: unknown }).id);
      diaVencimento = Number.isFinite(Number((conta as { dia_vencimento?: unknown }).dia_vencimento))
        ? Number((conta as { dia_vencimento?: unknown }).dia_vencimento)
        : null;
    }

    const createdCobrancas: number[] = [];
    for (const comp of diag.checks.competencias_faltantes) {
      const { data: exist, error: existErr } = await supabase
        .from("cobrancas")
        .select("id")
        .in("origem_tipo", ["MATRICULA", "MATRICULA_MENSALIDADE"])
        .eq("origem_subtipo", "CARTAO_CONEXAO")
        .eq("origem_id", matriculaId)
        .eq("competencia_ano_mes", comp)
        .maybeSingle();

      if (existErr) throw existErr;
      if (exist?.id) continue;

      const vencimento = buildVencimento(comp, diaVencimento);
      const { data: cobNova, error: errCob } = await supabase
        .from("cobrancas")
        .insert({
          pessoa_id: responsavelId,
          descricao: "Mensalidade (reprocessamento matricula)",
          valor_centavos: diag.sugestoes.mensalidade_padrao_centavos,
          vencimento,
          status: "PENDENTE",
          origem_tipo: "MATRICULA",
          origem_subtipo: "CARTAO_CONEXAO",
          origem_id: matriculaId,
          competencia_ano_mes: comp,
        })
        .select("id")
        .single();

      if (errCob) throw errCob;
      createdCobrancas.push(Number((cobNova as { id?: unknown }).id));
    }

    const { data: cobrancasAll, error: cobAllErr } = await supabase
      .from("cobrancas")
      .select("id, competencia_ano_mes, valor_centavos, descricao")
      .in("origem_tipo", ["MATRICULA", "MATRICULA_MENSALIDADE"])
      .eq("origem_subtipo", "CARTAO_CONEXAO")
      .eq("origem_id", matriculaId);

    if (cobAllErr) throw cobAllErr;

    const lancamentos: Array<{ cobranca_id: number; lancamento_id: number | null }> = [];
    if (Array.isArray(cobrancasAll)) {
      for (const cobranca of cobrancasAll) {
        const cobrancaId = asInt((cobranca as { id?: unknown }).id);
        const comp = String((cobranca as { competencia_ano_mes?: unknown }).competencia_ano_mes ?? "");
        const valor = Number((cobranca as { valor_centavos?: unknown }).valor_centavos ?? 0);
        if (!cobrancaId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(comp)) continue;

        const lanc = await upsertLancamentoPorCobranca({
          cobrancaId,
          contaConexaoId,
          competencia: comp,
          valorCentavos: Math.trunc(valor),
          descricao: (cobranca as { descricao?: unknown }).descricao
            ? String((cobranca as { descricao?: unknown }).descricao)
            : "Mensalidade (reprocessamento matricula)",
          origemSistema: "MATRICULA_REPROCESSAR",
          origemId: matriculaId,
        });

        lancamentos.push({ cobranca_id: cobrancaId, lancamento_id: lanc?.id ?? null });
      }
    }

    let entradaResult: { cobranca_id: number | null; recebimento_id: number | null } | null = null;
    if (payload.entrada && Number.isInteger(payload.entrada.valor_centavos) && payload.entrada.valor_centavos > 0) {
      const entradaValor = Math.trunc(payload.entrada.valor_centavos);
      const { data: cobEntrada, error: errFind } = await supabase
        .from("cobrancas")
        .select("id, status, valor_centavos, centro_custo_id")
        .eq("origem_tipo", "MATRICULA")
        .eq("origem_id", matriculaId)
        .is("competencia_ano_mes", null)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errFind) throw errFind;

      let cobrancaId: number | null = null;
      let recebimentoId: number | null = null;

      if (!cobEntrada) {
        const dataPagamento = payload.entrada.data_pagamento ?? todayISO();
        const { data: cobNova, error: errCob } = await supabase
          .from("cobrancas")
          .insert({
            pessoa_id: responsavelId,
            descricao: "Entrada (reprocessamento matricula)",
            valor_centavos: entradaValor,
            vencimento: dataPagamento,
            status: payload.entrada.pago_no_ato ? "PAGA" : "PENDENTE",
            data_pagamento: payload.entrada.pago_no_ato ? dataPagamento : null,
            metodo_pagamento: payload.entrada.metodo_pagamento ?? null,
            observacoes: payload.entrada.observacoes ?? payload.motivo,
            origem_tipo: "MATRICULA",
            origem_id: matriculaId,
          })
          .select("id, centro_custo_id")
          .single();

        if (errCob) throw errCob;
        cobrancaId = Number((cobNova as { id?: unknown }).id);

        if (payload.entrada.pago_no_ato) {
          const metodo = payload.entrada.metodo_pagamento ?? "PIX";
          const { data: rec, error: errRec } = await supabase
            .from("recebimentos")
            .insert({
              cobranca_id: cobrancaId,
              centro_custo_id: (cobNova as { centro_custo_id?: unknown }).centro_custo_id ?? null,
              valor_centavos: entradaValor,
              data_pagamento: `${dataPagamento}T12:00:00.000Z`,
              metodo_pagamento: metodo,
              origem_sistema: "MATRICULA",
              observacoes: payload.entrada.observacoes ?? payload.motivo,
              forma_pagamento_codigo: metodo,
            })
            .select("id")
            .single();

          if (errRec) throw errRec;
          recebimentoId = Number((rec as { id?: unknown }).id);
        }
      } else {
        cobrancaId = Number((cobEntrada as { id?: unknown }).id);
        const statusAtual = String((cobEntrada as { status?: unknown }).status ?? "").toUpperCase();
        if (payload.entrada.pago_no_ato && !["PAGA", "PAGO", "RECEBIDO"].includes(statusAtual)) {
          const dataPagamento = payload.entrada.data_pagamento ?? todayISO();
          const metodo = payload.entrada.metodo_pagamento ?? "PIX";
          const { data: rec, error: errRec } = await supabase
            .from("recebimentos")
            .insert({
              cobranca_id: cobrancaId,
              centro_custo_id: (cobEntrada as { centro_custo_id?: unknown }).centro_custo_id ?? null,
              valor_centavos: entradaValor,
              data_pagamento: `${dataPagamento}T12:00:00.000Z`,
              metodo_pagamento: metodo,
              origem_sistema: "MATRICULA",
              observacoes: payload.entrada.observacoes ?? payload.motivo,
              forma_pagamento_codigo: metodo,
            })
            .select("id")
            .single();

          if (errRec) throw errRec;
          recebimentoId = Number((rec as { id?: unknown }).id);

          const { error: updErr } = await supabase
            .from("cobrancas")
            .update({
              status: "PAGA",
              data_pagamento: dataPagamento,
              metodo_pagamento: metodo,
              observacoes: payload.entrada.observacoes ?? payload.motivo,
            })
            .eq("id", cobrancaId);
          if (updErr) throw updErr;
        }
      }

      entradaResult = { cobranca_id: cobrancaId, recebimento_id: recebimentoId };
    }

    const rebuild = Boolean(payload.forcar_rebuild_faturas);
    const faturasRebuild: Array<{ competencia: string; fatura_id: number | null }> = [];

    if (rebuild) {
      const competencias = Array.from(
        new Set([...diag.checks.competencias_esperadas, ...diag.checks.competencias_faltantes]),
      );

      for (const competencia of competencias) {
        const { data: faturaExistente, error: errFatFind } = await supabase
          .from("credito_conexao_faturas")
          .select("id")
          .eq("conta_conexao_id", contaConexaoId)
          .eq("periodo_referencia", competencia)
          .maybeSingle();

        if (errFatFind) throw errFatFind;

        let faturaId: number;
        if (!faturaExistente?.id) {
          const hoje = todayISO();
          const { data: novaFatura, error: errFatIns } = await supabase
            .from("credito_conexao_faturas")
            .insert({
              conta_conexao_id: contaConexaoId,
              periodo_referencia: competencia,
              data_fechamento: hoje,
              data_vencimento: null,
              valor_total_centavos: 0,
              status: "ABERTA",
            })
            .select("id")
            .single();

          if (errFatIns) throw errFatIns;
          faturaId = Number((novaFatura as { id?: unknown }).id);
        } else {
          faturaId = Number((faturaExistente as { id?: unknown }).id);
        }

        const { error: errDel } = await supabase
          .from("credito_conexao_fatura_lancamentos")
          .delete()
          .eq("fatura_id", faturaId);
        if (errDel) throw errDel;

        const { data: lancs, error: errLancs } = await supabase
          .from("credito_conexao_lancamentos")
          .select("id, valor_centavos, status, referencia_item, cobranca_id")
          .eq("conta_conexao_id", contaConexaoId)
          .eq("competencia", competencia)
          .not("cobranca_id", "is", null)
          .in("status", ["PENDENTE_FATURA", "FATURADO"]);

        if (errLancs) throw errLancs;

        let lista = lancs ?? [];
        if (lista.length === 0) {
          const { data: legacy, error: errLegacy } = await supabase
            .from("credito_conexao_lancamentos")
            .select("id, valor_centavos, status, referencia_item, cobranca_id")
            .eq("conta_conexao_id", contaConexaoId)
            .eq("competencia", competencia)
            .is("cobranca_id", null)
            .not("referencia_item", "is", null)
            .in("status", ["PENDENTE_FATURA", "FATURADO"]);

          if (errLegacy) throw errLegacy;
          lista = legacy ?? [];
        }

        if (lista.length > 0) {
          const payloadPivot = lista.map((l) => ({ fatura_id: faturaId, lancamento_id: l.id }));
          const { error: errLink } = await supabase
            .from("credito_conexao_fatura_lancamentos")
            .insert(payloadPivot);
          if (errLink) throw errLink;
        }

        const total = lista.reduce(
          (acc, l) => acc + (typeof l.valor_centavos === "number" ? l.valor_centavos : 0),
          0,
        );

        const { error: errFatUpd } = await supabase
          .from("credito_conexao_faturas")
          .update({ valor_total_centavos: total })
          .eq("id", faturaId);
        if (errFatUpd) throw errFatUpd;

        faturasRebuild.push({ competencia, fatura_id: faturaId });
      }
    }

    return NextResponse.json({
      ok: true,
      matricula_id: matriculaId,
      conta_conexao_id: contaConexaoId,
      created_cobrancas: createdCobrancas,
      lancamentos,
      entrada: entradaResult,
      faturas_rebuild: rebuild ? faturasRebuild : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    if (msg === "matricula_nao_encontrada") {
      return NextResponse.json({ ok: false, error: "matricula_nao_encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: "erro_reprocessar_matricula", detail: msg }, { status: 500 });
  }
}
