import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import {
  buildReferenciaMatriculaContaInterna,
  buildReferenciaMatriculaEntradaContaInterna,
  garantirObrigacaoContaInterna,
} from "@/lib/financeiro/contaInternaObrigacao";
import { recalcularComprasFatura } from "@/lib/financeiro/creditoConexaoFaturas";
import {
  buildReferenciaMatriculaItemCompetencia,
  listMatriculaItensAtivos,
} from "@/lib/matriculas/matriculaItens";

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

function buildReferenciaLancamentoCartaoConexao(matriculaId: number, competencia: string): string {
  return buildReferenciaMatriculaContaInterna(matriculaId, competencia);
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

    const referenciasPayload = competenciasPayload.map((competencia) =>
      buildReferenciaLancamentoCartaoConexao(matriculaId, competencia),
    );
    const { data: lancExistentes, error: errLancExist } = await supabase
      .from("credito_conexao_lancamentos")
      .select("id, cobranca_id, competencia, referencia_item, status")
      .eq("origem_id", matriculaId)
      .in("referencia_item", referenciasPayload);

    if (errLancExist) throw errLancExist;

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
          descricao_exibicao: "Conta interna do aluno",
          ativo: true,
        })
        .select("*")
        .single();

      if (errContaNova) throw errContaNova;
      contaConexaoId = Number(contaNova.id);
    } else {
      contaConexaoId = Number(conta.id);
    }

    let matriculaItensAtivos: Awaited<ReturnType<typeof listMatriculaItensAtivos>> = [];
    try {
      matriculaItensAtivos = await listMatriculaItensAtivos(
        supabase as unknown as { from: (table: string) => any },
        matriculaId,
      );
    } catch (matriculaItensError) {
      throw matriculaItensError;
    }

    const resultados: {
      cobrancas_criadas: number[];
      cobrancas_atualizadas: number[];
      referencias_lancamento: string[];
      lancamentos_upsert: Array<{ cobranca_id: number | null; lancamento_id: number | null }>;
      resultados_por_item?: Array<{
        item_id: number;
        competencia: string;
        lancamento_criado: boolean;
        lancamento_reutilizado: boolean;
        bloqueado_por_idempotencia: boolean;
      }>;
      entrada?: { cobranca_id: number | null; recebimento_id: number | null };
      faturas_rebuild?: Array<{ competencia: string; fatura_id: number | null }>;
    } = {
      cobrancas_criadas: [],
      cobrancas_atualizadas: [],
      referencias_lancamento: [],
      lancamentos_upsert: [],
      resultados_por_item: [],
    };

    if (payload.entrada && payload.entrada.valor_centavos > 0) {
      const hoje = new Date().toISOString().slice(0, 10);
      const dataPagamento = payload.entrada.data_pagamento ?? hoje;
      const obrigacaoEntrada = await garantirObrigacaoContaInterna({
        supabase,
        tipoConta: "ALUNO",
        pessoaCobrancaId: responsavelId,
        contaInternaId: contaConexaoId,
        competencia: dataPagamento.slice(0, 7),
        valorCentavos: payload.entrada.valor_centavos,
        descricao: "Conta interna - Entrada / pro-rata (reprocessamento matricula)",
        origemTipoCobranca: "MATRICULA",
        origemSubtipoCobranca: "CONTA_INTERNA_ENTRADA_PRORATA",
        origemSistema: "MATRICULA_REPROCESSAR",
        origemId: matriculaId,
        origemItemTipo: "MATRICULA",
        origemItemId: matriculaId,
        referenciaItem: buildReferenciaMatriculaEntradaContaInterna(matriculaId, dataPagamento.slice(0, 7)),
        diaVencimento:
          Number.isFinite(Number((conta ?? {}) && (conta as { dia_vencimento?: unknown }).dia_vencimento))
            ? Number((conta as { dia_vencimento?: unknown }).dia_vencimento)
            : 12,
        alunoId: Number(matricula.pessoa_id ?? 0) || null,
        matriculaId,
        observacoes: payload.entrada.observacoes ?? payload.motivo ?? null,
        pagamento: payload.entrada.pago_no_ato
          ? {
              dataPagamento,
              metodoPagamento: payload.entrada.metodo_pagamento ?? "PIX",
              formaPagamentoCodigo: payload.entrada.metodo_pagamento ?? "PIX",
              origemSistemaRecebimento: "MATRICULA",
              observacoes: payload.entrada.observacoes ?? "Reprocessamento manual.",
              descricaoMovimento: "Quitacao conta interna - reprocessamento de matricula",
            }
          : null,
      });

      resultados.entrada = {
        cobranca_id: obrigacaoEntrada.cobranca_id,
        recebimento_id: obrigacaoEntrada.recebimento_id ?? null,
      };
    }

    if (matriculaItensAtivos.length > 0) {
      const valorRateadoBase =
        matriculaItensAtivos.length > 0
          ? Math.floor(
              payload.mensalidades.reduce((acc, item) => acc + item.valor_centavos, 0) / matriculaItensAtivos.length,
            )
          : 0;

      const referenciasPorItem = competenciasPayload.flatMap((competencia) =>
        matriculaItensAtivos.map((item) => buildReferenciaMatriculaItemCompetencia(item.id, competencia)),
      );

      const { data: lancamentosItemExistentes, error: errLancamentosItemExistentes } = await supabase
        .from("credito_conexao_lancamentos")
        .select("id,cobranca_id,competencia,referencia_item,status")
        .in("referencia_item", referenciasPorItem);

      if (errLancamentosItemExistentes) throw errLancamentosItemExistentes;

      const lancamentoExistenteByReferencia = new Map<
        string,
        { id: number; cobranca_id: number | null; status: string | null }
      >();
      for (const row of (lancamentosItemExistentes ?? []) as Array<Record<string, unknown>>) {
        const referencia = typeof row.referencia_item === "string" ? row.referencia_item : null;
        const id = Number(row.id ?? 0);
        if (!referencia || !Number.isFinite(id) || id <= 0) continue;
        if (lancamentoExistenteByReferencia.has(referencia)) continue;
        lancamentoExistenteByReferencia.set(referencia, {
          id,
          cobranca_id: Number.isFinite(Number(row.cobranca_id)) ? Number(row.cobranca_id) : null,
          status: typeof row.status === "string" ? row.status : null,
        });
      }

      for (const m of payload.mensalidades) {
        for (let index = 0; index < matriculaItensAtivos.length; index += 1) {
          const item = matriculaItensAtivos[index];
          const valorItemBase =
            item.valor_liquido_centavos > 0
              ? item.valor_liquido_centavos
              : index === matriculaItensAtivos.length - 1
                ? m.valor_centavos - valorRateadoBase * (matriculaItensAtivos.length - 1)
                : valorRateadoBase;
          const valorItem = Math.max(0, valorItemBase);
          if (valorItem <= 0) continue;

          const referenciaItem = buildReferenciaMatriculaItemCompetencia(item.id, m.competencia);
          const lancamentoExistente = lancamentoExistenteByReferencia.get(referenciaItem) ?? null;

          if (lancamentoExistente) {
            resultados.referencias_lancamento.push(referenciaItem);
            resultados.lancamentos_upsert.push({
              cobranca_id: lancamentoExistente.cobranca_id,
              lancamento_id: lancamentoExistente.id,
            });
            resultados.resultados_por_item?.push({
              item_id: item.id,
              competencia: m.competencia,
              lancamento_criado: false,
              lancamento_reutilizado: true,
              bloqueado_por_idempotencia: false,
            });
            continue;
          }

          const obrigacao = await garantirObrigacaoContaInterna({
            supabase,
            tipoConta: "ALUNO",
            pessoaCobrancaId: responsavelId,
            contaInternaId: contaConexaoId,
            competencia: m.competencia,
            valorCentavos: valorItem,
            descricao: m.descricao ?? item.descricao,
            origemTipoCobranca: "CONTA_INTERNA",
            origemSubtipoCobranca: "CONTA_INTERNA_MENSALIDADE",
            origemSistema: "MATRICULA_REPROCESSAR",
            origemId: matriculaId,
            origemItemTipo: "MATRICULA_ITEM",
            origemItemId: item.id,
            referenciaItem,
            diaVencimento:
              Number.isFinite(Number((conta ?? {}) && (conta as { dia_vencimento?: unknown }).dia_vencimento))
                ? Number((conta as { dia_vencimento?: unknown }).dia_vencimento)
                : 12,
            alunoId: Number(matricula.pessoa_id ?? 0) || null,
            matriculaId,
            composicaoJson: {
              fonte: "MATRICULA_ITENS_REPROCESSAMENTO",
              competencia: m.competencia,
              item_id: item.id,
              turma_id: item.turma_id_inicial,
              valor_centavos: valorItem,
              descricao: item.descricao,
            },
            fallbackLegacyLookup: {
              origemTipos: ["MATRICULA", "MATRICULA_MENSALIDADE"],
              origemSubtipo: "CARTAO_CONEXAO",
              origemId: matriculaId,
              competenciaAnoMes: m.competencia,
            },
          });

          if (obrigacao.cobranca_created) {
            resultados.cobrancas_criadas.push(obrigacao.cobranca_id);
          } else {
            resultados.cobrancas_atualizadas.push(obrigacao.cobranca_id);
          }

          resultados.referencias_lancamento.push(referenciaItem);
          resultados.lancamentos_upsert.push({
            cobranca_id: obrigacao.cobranca_id,
            lancamento_id: obrigacao.lancamento_id ?? null,
          });
          resultados.resultados_por_item?.push({
            item_id: item.id,
            competencia: m.competencia,
            lancamento_criado: obrigacao.lancamento_created,
            lancamento_reutilizado: !obrigacao.lancamento_created,
            bloqueado_por_idempotencia: false,
          });
        }
      }
    } else {
      for (const m of payload.mensalidades) {
        const descricao = m.descricao ?? `Conta interna - Mensalidade ${m.competencia}`;
        const referenciaItem = buildReferenciaLancamentoCartaoConexao(matriculaId, m.competencia);

        const obrigacao = await garantirObrigacaoContaInterna({
          supabase,
          tipoConta: "ALUNO",
          pessoaCobrancaId: responsavelId,
          contaInternaId: contaConexaoId,
          competencia: m.competencia,
          valorCentavos: m.valor_centavos,
          descricao,
          origemTipoCobranca: "CONTA_INTERNA",
          origemSubtipoCobranca: "CONTA_INTERNA_MENSALIDADE",
          origemSistema: "MATRICULA_REPROCESSAR",
          origemId: matriculaId,
          origemItemTipo: "MATRICULA",
          origemItemId: matriculaId,
          referenciaItem,
          diaVencimento:
            Number.isFinite(Number((conta ?? {}) && (conta as { dia_vencimento?: unknown }).dia_vencimento))
              ? Number((conta as { dia_vencimento?: unknown }).dia_vencimento)
              : 12,
          alunoId: Number(matricula.pessoa_id ?? 0) || null,
          matriculaId,
          fallbackLegacyLookup: {
            origemTipos: ["MATRICULA", "MATRICULA_MENSALIDADE"],
            origemSubtipo: "CARTAO_CONEXAO",
            origemId: matriculaId,
            competenciaAnoMes: m.competencia,
          },
        });

        if (obrigacao.cobranca_created) {
          resultados.cobrancas_criadas.push(obrigacao.cobranca_id);
        } else {
          resultados.cobrancas_atualizadas.push(obrigacao.cobranca_id);
        }

        resultados.referencias_lancamento.push(referenciaItem);
        resultados.lancamentos_upsert.push({
          cobranca_id: obrigacao.cobranca_id,
          lancamento_id: obrigacao.lancamento_id ?? null,
        });
      }
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
        const faturaId = Number(faturaExistente?.id ?? 0);
        if (!Number.isFinite(faturaId) || faturaId <= 0) {
          resultados.faturas_rebuild.push({ competencia, fatura_id: null });
          continue;
        }

        await recalcularComprasFatura(supabase as any, faturaId);
        resultados.faturas_rebuild.push({ competencia, fatura_id: faturaId });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        matricula_id: matriculaId,
        conta_conexao_id: contaConexaoId,
        resultados,
        cobrancas_existentes: cobExistentes ?? [],
        lancamentos_existentes: lancExistentes ?? [],
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
