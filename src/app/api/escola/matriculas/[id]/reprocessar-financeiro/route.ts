import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { upsertLancamentoPorCobranca } from "@/lib/credito-conexao/upsertLancamentoPorCobranca";

type ReprocessarPayload = {
  entrada?: {
    valor_centavos: number;
    pago_no_ato: boolean;
    metodo_pagamento?: string | null;
    data_pagamento?: string | null;
    observacoes?: string | null;
  };
  mensalidades: Array<{
    competencia: string;
    valor_centavos: number;
    descricao?: string | null;
  }>;
  forcar_rebuild_fatura?: boolean;
  motivo?: string | null;
};

type SugestoesResponse = {
  ok: true;
  matricula_id: number;
  sugestoes: {
    entrada: {
      valor_centavos: number;
      pago_no_ato: boolean;
      metodo_pagamento: string;
      data_pagamento: string;
      observacoes: string;
    };
    mensalidades: Array<{
      competencia: string;
      valor_centavos: number;
      descricao: string;
    }>;
  };
  fontes: {
    entrada: string;
    mensalidades: string;
  };
};

function parseId(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function isSchemaMissing(err: unknown): boolean {
  const anyErr = err as { code?: string } | null;
  return !!anyErr?.code && (anyErr.code === "42P01" || anyErr.code === "42703");
}

function isCompetencia(val: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(val);
}

function isDateISO(val: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(val);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function toTimestamptzNoonUtc(dateYYYYMMDD: string): string {
  return `${dateYYYYMMDD}T12:00:00.000Z`;
}

function buildReferenciaLancamentoCartaoConexao(matriculaId: number, competencia: string): string {
  return `matricula:${matriculaId}|cartao_conexao|competencia:${competencia}`;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id?: string }> }) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;

  try {
    const supabase = getSupabaseAdmin();
    const { id } = await ctx.params;
    const matriculaId = parseId(id);

    if (!matriculaId) {
      return NextResponse.json({ ok: false, error: "matricula_id_invalido" }, { status: 400 });
    }

    const { data: matricula, error: errMat } = await supabase
      .from("matriculas")
      .select(
        "id, primeira_cobranca_valor_centavos, primeira_cobranca_data_pagamento, total_mensalidade_centavos",
      )
      .eq("id", matriculaId)
      .maybeSingle();

    if (errMat) throw errMat;
    if (!matricula) {
      return NextResponse.json({ ok: false, error: "matricula_nao_encontrada" }, { status: 404 });
    }

    let entradaValor = 0;
    let entradaPagoNoAto = true;
    let entradaMetodo = "PIX";
    let entradaData = todayISO();
    let entradaFonte = "sem_dados";

    const primeiraValor = Number(matricula.primeira_cobranca_valor_centavos ?? 0);
    if (Number.isFinite(primeiraValor) && primeiraValor > 0) {
      entradaValor = primeiraValor;
      entradaFonte = "matriculas.primeira_cobranca_valor_centavos";
      if (typeof matricula.primeira_cobranca_data_pagamento === "string") {
        entradaData = matricula.primeira_cobranca_data_pagamento.slice(0, 10);
      }
    }

    if (entradaValor === 0) {
      const { data: cobrancaEntrada, error: errEntrada } = await supabase
        .from("cobrancas")
        .select("valor_centavos, data_pagamento, metodo_pagamento, status")
        .in("origem_tipo", ["MATRICULA", "MATRICULA_ENTRADA"])
        .eq("origem_id", matriculaId)
        .is("competencia_ano_mes", null)
        .order("id", { ascending: false })
        .limit(1);

      if (errEntrada && !isSchemaMissing(errEntrada)) throw errEntrada;
      if (Array.isArray(cobrancaEntrada) && cobrancaEntrada.length > 0) {
        const row = cobrancaEntrada[0] as Record<string, unknown>;
        const valor = Number(row.valor_centavos ?? 0);
        if (Number.isFinite(valor) && valor > 0) {
          entradaValor = valor;
          entradaFonte = "cobrancas (MATRICULA)";
          const status = String(row.status ?? "").toUpperCase();
          entradaPagoNoAto = ["PAGA", "PAGO", "RECEBIDO"].includes(status);
          const dataPg = typeof row.data_pagamento === "string" ? row.data_pagamento : null;
          if (dataPg) entradaData = dataPg.slice(0, 10);
          const metodo = typeof row.metodo_pagamento === "string" ? row.metodo_pagamento : null;
          if (metodo) entradaMetodo = metodo;
        }
      }
    }

    let mensalidades: Array<{ competencia: string; valor_centavos: number; descricao: string }> = [];
    let mensalidadesFonte = "sem_dados";
    let valorBaseMensal: number | null = null;

    const { data: execRows, error: execErr } = await supabase
      .from("matricula_execucao_valores")
      .select("valor_mensal_centavos")
      .eq("matricula_id", matriculaId)
      .eq("ativo", true);

    if (execErr && !isSchemaMissing(execErr)) throw execErr;
    if (!execErr && Array.isArray(execRows) && execRows.length > 0) {
      const total = execRows.reduce((acc, row) => acc + Number(row.valor_mensal_centavos ?? 0), 0);
      if (Number.isFinite(total) && total > 0) {
        valorBaseMensal = total;
        mensalidadesFonte = "matricula_execucao_valores";
      }
    }

    const competenciaPadrao = new Date().toISOString().slice(0, 7);
    const { data: lancMens, error: errLancMens } = await supabase
      .from("credito_conexao_lancamentos")
      .select("competencia, valor_centavos, referencia_item")
      .eq("origem_id", matriculaId)
      .in("origem_sistema", ["MATRICULA", "MATRICULA_MENSAL", "MATRICULA_REPROCESSAR"]);

    if (errLancMens && !isSchemaMissing(errLancMens)) throw errLancMens;

    const { data: cobMens, error: errCobMens } = await supabase
      .from("cobrancas")
      .select("competencia_ano_mes, valor_centavos")
      .in("origem_tipo", ["MATRICULA", "MATRICULA_MENSALIDADE"])
      .eq("origem_subtipo", "CARTAO_CONEXAO")
      .eq("origem_id", matriculaId);

    if (errCobMens && !isSchemaMissing(errCobMens)) throw errCobMens;

    if (valorBaseMensal && valorBaseMensal > 0) {
      const competencias =
        !errLancMens && Array.isArray(lancMens) && lancMens.length > 0
          ? Array.from(
              new Set(
                lancMens
                  .map((row) => (typeof row.competencia === "string" ? row.competencia : ""))
                  .filter((comp) => isCompetencia(comp)),
              ),
            )
          : !errCobMens && Array.isArray(cobMens)
          ? Array.from(
              new Set(
                cobMens
                  .map((row) => (typeof row.competencia_ano_mes === "string" ? row.competencia_ano_mes : ""))
                  .filter((comp) => isCompetencia(comp)),
              ),
            )
          : [];

      if (competencias.length > 0) {
        mensalidades = competencias.sort().map((comp) => ({
          competencia: comp,
          valor_centavos: valorBaseMensal,
          descricao: "Mensalidade (herdada)",
        }));
        mensalidadesFonte =
          !errLancMens && Array.isArray(lancMens) && lancMens.length > 0
            ? "matricula_execucao_valores + credito_conexao_lancamentos"
            : "matricula_execucao_valores + cobrancas";
      } else {
        mensalidades = [
          {
            competencia: competenciaPadrao,
            valor_centavos: valorBaseMensal,
            descricao: "Mensalidade (herdada)",
          },
        ];
      }
    } else if (!errLancMens && Array.isArray(lancMens) && lancMens.length > 0) {
      const mapMensal = new Map<string, number>();
      lancMens.forEach((row) => {
        const comp = typeof row.competencia === "string" ? row.competencia : "";
        const valor = Number(row.valor_centavos);
        if (isCompetencia(comp) && Number.isFinite(valor) && valor > 0) {
          mapMensal.set(comp, valor);
        }
      });
      mensalidades = Array.from(mapMensal.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([competencia, valor_centavos]) => ({
          competencia,
          valor_centavos,
          descricao: "Mensalidade (inferida por lancamentos)",
        }));
      if (mensalidades.length > 0) {
        mensalidadesFonte = "credito_conexao_lancamentos";
      }
    } else if (!errCobMens && Array.isArray(cobMens) && cobMens.length > 0) {
      const mapMensal = new Map<string, number>();
      cobMens.forEach((row) => {
        const comp = typeof row.competencia_ano_mes === "string" ? row.competencia_ano_mes : "";
        const valor = Number(row.valor_centavos);
        if (isCompetencia(comp) && Number.isFinite(valor) && valor > 0) {
          mapMensal.set(comp, valor);
        }
      });
      mensalidades = Array.from(mapMensal.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([competencia, valor_centavos]) => ({
          competencia,
          valor_centavos,
          descricao: "Mensalidade (inferida por cobrancas)",
        }));
      if (mensalidades.length > 0) {
        mensalidadesFonte = "cobrancas (MATRICULA/CARTAO_CONEXAO)";
      }
    } else {
      const totalMensal = Number(matricula.total_mensalidade_centavos ?? 0);
      if (Number.isFinite(totalMensal) && totalMensal > 0) {
        mensalidades = [
          {
            competencia: competenciaPadrao,
            valor_centavos: totalMensal,
            descricao: "Mensalidade (herdada)",
          },
        ];
        mensalidadesFonte = "matriculas.total_mensalidade_centavos";
      }
    }

    if (mensalidades.length === 0) {
      mensalidades = [
        {
          competencia: competenciaPadrao,
          valor_centavos: 0,
          descricao: "Mensalidade (manual)",
        },
      ];
      mensalidadesFonte = "sem_dados";
    }

    const resp: SugestoesResponse = {
      ok: true,
      matricula_id: matriculaId,
      sugestoes: {
        entrada: {
          valor_centavos: entradaValor,
          pago_no_ato: entradaPagoNoAto,
          metodo_pagamento: entradaMetodo,
          data_pagamento: entradaData,
          observacoes: "Reprocessamento manual (herdado).",
        },
        mensalidades,
      },
      fontes: {
        entrada: entradaFonte,
        mensalidades: mensalidadesFonte,
      },
    };

    return NextResponse.json(resp);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json(
      { ok: false, error: "erro_buscar_sugestoes_reprocessamento", detail: msg },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id?: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  try {
    const supabase = getSupabaseAdmin();
    const { id } = await ctx.params;
    const matriculaId = parseId(id);

    if (!matriculaId) {
      return NextResponse.json({ ok: false, error: "matricula_id_invalido" }, { status: 400 });
    }

    let payload: ReprocessarPayload;
    try {
      payload = (await req.json()) as ReprocessarPayload;
    } catch {
      return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
    }

    if (!payload || !Array.isArray(payload.mensalidades) || payload.mensalidades.length === 0) {
      return NextResponse.json({ ok: false, error: "mensalidades_obrigatorio" }, { status: 400 });
    }

    for (const m of payload.mensalidades) {
      if (!isCompetencia(m.competencia)) {
        return NextResponse.json(
          { ok: false, error: "competencia_invalida", competencia: m.competencia },
          { status: 400 },
        );
      }
      if (!Number.isInteger(m.valor_centavos) || m.valor_centavos <= 0) {
        return NextResponse.json(
          { ok: false, error: "valor_mensalidade_invalido", competencia: m.competencia },
          { status: 400 },
        );
      }
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

    const { data: matricula, error: errMat } = await supabase
      .from("matriculas")
      .select("id, pessoa_id, responsavel_financeiro_id, ano_referencia, status")
      .eq("id", matriculaId)
      .maybeSingle();

    if (errMat) throw errMat;
    if (!matricula) {
      return NextResponse.json({ ok: false, error: "matricula_nao_encontrada" }, { status: 404 });
    }

    const responsavelId = Number(matricula.responsavel_financeiro_id);
    if (!Number.isFinite(responsavelId) || responsavelId <= 0) {
      return NextResponse.json({ ok: false, error: "matricula_sem_responsavel_financeiro" }, { status: 400 });
    }

    const competenciasPayload = Array.from(new Set(payload.mensalidades.map((m) => m.competencia)));
    const { data: cobExistentes, error: errCobExist } = await supabase
      .from("cobrancas")
      .select("id, competencia_ano_mes, valor_centavos, status")
      .in("origem_tipo", ["MATRICULA", "MATRICULA_MENSALIDADE"])
      .eq("origem_subtipo", "CARTAO_CONEXAO")
      .eq("origem_id", matriculaId)
      .in("competencia_ano_mes", competenciasPayload);

    if (errCobExist) throw errCobExist;

    if (cobExistentes && cobExistentes.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "reprocessamento_bloqueado_ja_existe",
          detail:
            "Ja existem cobrancas elegiveis ao Cartao Conexao para esta matricula/competencia. Para evitar duplicidade, o reprocessamento foi bloqueado.",
          cobrancas_existentes: cobExistentes,
        },
        { status: 409 },
      );
    }

    const referenciasPayload = competenciasPayload.map((competencia) =>
      buildReferenciaLancamentoCartaoConexao(matriculaId, competencia),
    );
    const { data: lancExistentes, error: errLancExist } = await supabase
      .from("credito_conexao_lancamentos")
      .select("id, competencia, referencia_item, status")
      .eq("origem_id", matriculaId)
      .in("referencia_item", referenciasPayload);

    if (errLancExist) throw errLancExist;

    if (lancExistentes && lancExistentes.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "reprocessamento_bloqueado_lancamento_existente",
          detail:
            "Ja existem lancamentos elegiveis ao Cartao Conexao para esta matricula/competencia. Para evitar duplicidade, o reprocessamento foi bloqueado.",
          lancamentos_existentes: lancExistentes,
        },
        { status: 409 },
      );
    }

    const { data: conta, error: contaErr } = await supabase
      .from("credito_conexao_contas")
      .select("*")
      .eq("pessoa_titular_id", responsavelId)
      .eq("tipo_conta", "ALUNO")
      .eq("ativo", true)
      .maybeSingle();

    if (contaErr) throw contaErr;
    let contaConexaoId: number;

    if (!conta) {
      const { data: contaNova, error: errContaNova } = await supabase
        .from("credito_conexao_contas")
        .insert({
          pessoa_titular_id: responsavelId,
          tipo_conta: "ALUNO",
          descricao_exibicao: "Cartao Conexao Aluno",
          ativo: true,
        })
        .select("*")
        .single();

      if (errContaNova) throw errContaNova;
      contaConexaoId = Number(contaNova.id);
    } else {
      contaConexaoId = Number(conta.id);
    }

    const resultados: {
      cobrancas_criadas: number[];
      cobrancas_atualizadas: number[];
      referencias_lancamento: string[];
      lancamentos_upsert: Array<{ cobranca_id: number | null; lancamento_id: number | null }>;
      entrada?: { cobranca_id: number | null; recebimento_id: number | null };
      faturas_rebuild?: Array<{ competencia: string; fatura_id: number | null }>;
    } = {
      cobrancas_criadas: [],
      cobrancas_atualizadas: [],
      referencias_lancamento: [],
      lancamentos_upsert: [],
    };

    if (payload.entrada && payload.entrada.valor_centavos > 0) {
      const hoje = new Date().toISOString().slice(0, 10);
      const dataPagamento = payload.entrada.data_pagamento ?? hoje;

      const { data: cobrancaEntrada, error: errCobE } = await supabase
        .from("cobrancas")
        .insert({
          pessoa_id: responsavelId,
          descricao: "Entrada (reprocessada)",
          valor_centavos: payload.entrada.valor_centavos,
          vencimento: dataPagamento,
          status: payload.entrada.pago_no_ato ? "PAGA" : "PENDENTE",
          data_pagamento: payload.entrada.pago_no_ato ? dataPagamento : null,
          metodo_pagamento: payload.entrada.metodo_pagamento ?? null,
          observacoes: payload.entrada.observacoes ?? null,
          origem_tipo: "MATRICULA",
          origem_id: matriculaId,
        })
        .select("id, centro_custo_id")
        .single();

      if (errCobE) throw errCobE;

      let recebimentoId: number | null = null;
      if (payload.entrada.pago_no_ato) {
        const metodo = payload.entrada.metodo_pagamento ?? "PIX";
        const { data: receb, error: errRec } = await supabase
          .from("recebimentos")
          .insert({
            cobranca_id: cobrancaEntrada.id,
            centro_custo_id: cobrancaEntrada.centro_custo_id ?? null,
            valor_centavos: payload.entrada.valor_centavos,
            data_pagamento: toTimestamptzNoonUtc(dataPagamento),
            metodo_pagamento: metodo,
            origem_sistema: "MATRICULA",
            observacoes: payload.entrada.observacoes ?? "Reprocessamento manual.",
            forma_pagamento_codigo: metodo,
          })
          .select("id")
          .single();

        if (errRec) throw errRec;
        recebimentoId = receb.id;
      }

      resultados.entrada = { cobranca_id: cobrancaEntrada.id, recebimento_id: recebimentoId };
    }

    for (const m of payload.mensalidades) {
      const descricao = m.descricao ?? "Mensalidade (reprocessada)";
      const referenciaItem = buildReferenciaLancamentoCartaoConexao(matriculaId, m.competencia);

      const lanc = await upsertLancamentoPorCobranca({
        cobrancaId: null,
        referenciaItem,
        supabase,
        contaConexaoId,
        competencia: m.competencia,
        valorCentavos: m.valor_centavos,
        descricao,
        origemSistema: "MATRICULA_MENSAL",
        origemId: matriculaId,
      });

      resultados.referencias_lancamento.push(referenciaItem);
      resultados.lancamentos_upsert.push({
        cobranca_id: null,
        lancamento_id: lanc?.id ?? null,
      });
    }

    if (payload.forcar_rebuild_fatura) {
      const competencias = Array.from(new Set(payload.mensalidades.map((m) => m.competencia)));
      resultados.faturas_rebuild = [];

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
          const hoje = new Date().toISOString().slice(0, 10);
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
          faturaId = novaFatura.id;
        } else {
          faturaId = faturaExistente.id;
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
          .in("status", ["PENDENTE_FATURA", "FATURADO"]);

        if (errLancs) throw errLancs;

        const lista = lancs ?? [];

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

        resultados.faturas_rebuild.push({ competencia, fatura_id: faturaId });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        matricula_id: matriculaId,
        conta_conexao_id: contaConexaoId,
        resultados,
      },
      { status: 200 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro_desconhecido";
    return NextResponse.json(
      { ok: false, error: "erro_reprocessar_financeiro", detail: msg },
      { status: 500 },
    );
  }
}
