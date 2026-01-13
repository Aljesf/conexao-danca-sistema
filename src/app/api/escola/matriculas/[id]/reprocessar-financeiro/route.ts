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

function parseId(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function isCompetencia(val: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(val);
}

function isDateISO(val: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(val);
}

function toTimestamptzNoonUtc(dateYYYYMMDD: string): string {
  return `${dateYYYYMMDD}T12:00:00.000Z`;
}

function buildVencimento(competencia: string, diaVencimento: number | null): string {
  const [anoStr, mesStr] = competencia.split("-");
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const dia = diaVencimento && diaVencimento >= 1 && diaVencimento <= 31 ? diaVencimento : 12;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.toISOString().slice(0, 10);
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

    const { data: conta, error: contaErr } = await supabase
      .from("credito_conexao_contas")
      .select("id, pessoa_titular_id, tipo_conta, ativo, dia_vencimento")
      .eq("pessoa_titular_id", responsavelId)
      .eq("tipo_conta", "ALUNO")
      .eq("ativo", true)
      .maybeSingle();

    if (contaErr) throw contaErr;
    if (!conta) {
      return NextResponse.json(
        {
          ok: false,
          error: "conta_cartao_conexao_inexistente",
          detail: "Responsavel financeiro nao possui Cartao Conexao (ALUNO) ativo.",
        },
        { status: 400 },
      );
    }

    const contaConexaoId = Number(conta.id);
    const diaVencimento = Number.isFinite(Number(conta.dia_vencimento))
      ? Number(conta.dia_vencimento)
      : null;

    const resultados: {
      cobrancas_criadas: number[];
      cobrancas_atualizadas: number[];
      lancamentos_upsert: Array<{ cobranca_id: number; lancamento_id: number | null }>;
      entrada?: { cobranca_id: number | null; recebimento_id: number | null };
      faturas_rebuild?: Array<{ competencia: string; fatura_id: number | null }>;
    } = {
      cobrancas_criadas: [],
      cobrancas_atualizadas: [],
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
      const vencimento = buildVencimento(m.competencia, diaVencimento);

      const { data: cobExist, error: errFind } = await supabase
        .from("cobrancas")
        .select("id, valor_centavos, vencimento, descricao")
        .eq("origem_tipo", "MATRICULA")
        .eq("origem_id", matriculaId)
        .eq("origem_subtipo", "CARTAO_CONEXAO")
        .eq("competencia_ano_mes", m.competencia)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errFind) throw errFind;

      let cobrancaId: number;

      if (!cobExist) {
        const { data: cobNova, error: errCob } = await supabase
          .from("cobrancas")
          .insert({
            pessoa_id: responsavelId,
            descricao,
            valor_centavos: m.valor_centavos,
            vencimento,
            status: "PENDENTE",
            origem_tipo: "MATRICULA",
            origem_subtipo: "CARTAO_CONEXAO",
            origem_id: matriculaId,
            competencia_ano_mes: m.competencia,
          })
          .select("id")
          .single();

        if (errCob) throw errCob;

        cobrancaId = cobNova.id;
        resultados.cobrancas_criadas.push(cobrancaId);
      } else {
        cobrancaId = cobExist.id;
        const valorAtual = Number(cobExist.valor_centavos);
        const vencAtual = String(cobExist.vencimento ?? "").slice(0, 10);
        const descAtual = String(cobExist.descricao ?? "");
        const needsUpdate =
          valorAtual !== m.valor_centavos || vencAtual !== vencimento || descAtual !== descricao;

        if (needsUpdate) {
          const { error: errUpd } = await supabase
            .from("cobrancas")
            .update({
              descricao,
              valor_centavos: m.valor_centavos,
              vencimento,
              origem_subtipo: "CARTAO_CONEXAO",
              competencia_ano_mes: m.competencia,
            })
            .eq("id", cobrancaId);

          if (errUpd) throw errUpd;
          resultados.cobrancas_atualizadas.push(cobrancaId);
        }
      }

      const lanc = await upsertLancamentoPorCobranca({
        cobrancaId,
        contaConexaoId,
        competencia: m.competencia,
        valorCentavos: m.valor_centavos,
        descricao,
        origemSistema: "MATRICULA_MENSAL",
        origemId: matriculaId,
      });

      resultados.lancamentos_upsert.push({
        cobranca_id: cobrancaId,
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
