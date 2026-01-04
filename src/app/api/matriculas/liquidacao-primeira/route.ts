import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type LiquidacaoModo = "PAGAR_AGORA" | "LANCAR_NO_CARTAO" | "ADIAR_EXCECAO";

type Payload = {
  matricula_id: number;
  tipo_primeira_cobranca: "ENTRADA_PRORATA" | "MENSALIDADE_CHEIA_CARTAO";
  modo: LiquidacaoModo;

  // pagamento no ato (quando PAGAR_AGORA)
  forma_pagamento_id?: number;
  // valor passa a ser opcional: se nao vier, herda da matricula
  valor_centavos?: number;
  data_pagamento?: string; // YYYY-MM-DD
  observacoes?: string;

  // excecao (quando ADIAR_EXCECAO)
  motivo_excecao?: string;
};

type LedgerTipo = "ENTRADA" | "PARCELA" | "LANCAMENTO_CREDITO" | "OUTRO";

type LedgerInsert = {
  matricula_id: number;
  tipo: LedgerTipo;
  descricao: string;
  valor_centavos: number;
  vencimento: string | null;
  data_evento: string | null;
  status: string;
  origem_tabela: string | null;
  origem_id: number | null;
};

function asInt(n: unknown): number | null {
  if (typeof n === "number" && Number.isFinite(n)) return Math.trunc(n);
  if (typeof n === "string" && n.trim() !== "" && !Number.isNaN(Number(n))) return Math.trunc(Number(n));
  return null;
}

function asDateStr(n: unknown): string | null {
  if (typeof n !== "string") return null;
  const s = n.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

function toTimestamptzNoonUtc(dateYYYYMMDD: string): string {
  return `${dateYYYYMMDD}T12:00:00.000Z`;
}

async function getCentroCustoPadraoEscolaId(supabase: any): Promise<number | null> {
  const { data, error } = await supabase
    .from("escola_config_financeira")
    .select("centro_custo_padrao_escola_id")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw new Error(`falha_ler_config_escola_financeira: ${error.message}`);
  }

  const id = data?.centro_custo_padrao_escola_id;
  return typeof id === "number" ? id : null;
}

async function getCentroCustoFallbackPrimeiroAtivoId(supabase: any): Promise<number> {
  const { data, error } = await supabase
    .from("centros_custo")
    .select("id")
    .eq("ativo", true)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(`falha_resolver_centro_custo_fallback: ${error?.message ?? "sem_centro_custo"}`);
  }

  return Number(data.id);
}

async function inserirMovimentoFinanceiroReceita(params: {
  supabase: any;
  centroCustoId: number | null;
  valorCentavos: number;
  dataYYYYMMDD: string;
  origemTipo: string;
  origemId: number;
  descricao: string;
}) {
  const { supabase, centroCustoId, valorCentavos, dataYYYYMMDD, origemTipo, origemId, descricao } = params;

  const centroPadrao = await getCentroCustoPadraoEscolaId(supabase);
  const centroIdFinal = centroPadrao ?? centroCustoId ?? (await getCentroCustoFallbackPrimeiroAtivoId(supabase));

  const payload: Record<string, unknown> = {
    tipo: "RECEITA",
    centro_custo_id: centroIdFinal,
    valor_centavos: valorCentavos,
    data_movimento: toTimestamptzNoonUtc(dataYYYYMMDD),
    origem: origemTipo,
    origem_id: origemId,
    descricao,
    usuario_id: null,
  };

  const { error } = await supabase.from("movimento_financeiro").insert(payload);
  if (error) {
    throw new Error(`falha_criar_movimento_financeiro: ${error.message}`);
  }
}

function ymFromDate(dateYYYYMMDD: string): string {
  return dateYYYYMMDD.slice(0, 7);
}

function yearFromDate(dateYYYYMMDD: string): number {
  return Number(dateYYYYMMDD.slice(0, 4));
}

function monthFromDate(dateYYYYMMDD: string): number {
  return Number(dateYYYYMMDD.slice(5, 7));
}

function buildPeriodo(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

function buildDateFromYMD(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function dateFromPeriodo(periodo: string): string | null {
  if (!/^\d{4}-\d{2}$/.test(periodo)) return null;
  return `${periodo}-01`;
}

async function ensureContaCreditoConexaoAluno(params: { supabase: any; pessoaTitularId: number }) {
  const { supabase, pessoaTitularId } = params;

  const { data: contaExistente } = await supabase
    .from("credito_conexao_contas")
    .select("id, dia_fechamento, dia_vencimento")
    .eq("pessoa_titular_id", pessoaTitularId)
    .eq("tipo_conta", "ALUNO")
    .eq("ativo", true)
    .maybeSingle();

  if (contaExistente?.id) return contaExistente;

  const { data: contaNova, error: errNova } = await supabase
    .from("credito_conexao_contas")
    .insert({
      pessoa_titular_id: pessoaTitularId,
      tipo_conta: "ALUNO",
      descricao_exibicao: "Cartao Conexao ALUNO",
      dia_fechamento: 10,
      dia_vencimento: 12,
      ativo: true,
    })
    .select("id, dia_fechamento, dia_vencimento")
    .single();

  if (errNova || !contaNova) {
    throw new Error(`falha_criar_conta_credito_conexao: ${errNova?.message ?? "erro_desconhecido"}`);
  }

  return contaNova;
}

async function ensureFaturasAno(params: {
  supabase: any;
  contaConexaoId: number;
  ano: number;
  diaFechamento: number;
  diaVencimento: number | null;
}) {
  const { supabase, contaConexaoId, ano, diaFechamento, diaVencimento } = params;

  for (let m = 1; m <= 12; m++) {
    const periodo = `${ano}-${String(m).padStart(2, "0")}`;

    const { data: jaExiste } = await supabase
      .from("credito_conexao_faturas")
      .select("id")
      .eq("conta_conexao_id", contaConexaoId)
      .eq("periodo_referencia", periodo)
      .maybeSingle();

    if (jaExiste?.id) continue;

    const dataFechamento = buildDateFromYMD(ano, m, diaFechamento);
    const dataVenc = diaVencimento ? buildDateFromYMD(ano, m, diaVencimento) : null;

    const { error } = await supabase.from("credito_conexao_faturas").insert({
      conta_conexao_id: contaConexaoId,
      periodo_referencia: periodo,
      data_fechamento: dataFechamento,
      data_vencimento: dataVenc,
      valor_total_centavos: 0,
      status: "ABERTA",
    });

    if (error) {
      throw new Error(`falha_criar_fatura_credito_conexao: ${error.message}`);
    }
  }
}

async function vincularLancamentoNaFatura(params: {
  supabase: any;
  contaConexaoId: number;
  periodoReferencia: string;
  lancamentoId: number;
  valorCentavos: number;
}) {
  const { supabase, contaConexaoId, periodoReferencia, lancamentoId, valorCentavos } = params;

  const { data: fatura, error: errFat } = await supabase
    .from("credito_conexao_faturas")
    .select("id, valor_total_centavos")
    .eq("conta_conexao_id", contaConexaoId)
    .eq("periodo_referencia", periodoReferencia)
    .single();

  if (errFat || !fatura) {
    throw new Error(`fatura_nao_encontrada_para_periodo: ${periodoReferencia}`);
  }

  const { error: errLink } = await supabase.from("credito_conexao_fatura_lancamentos").insert({
    fatura_id: fatura.id,
    lancamento_id: lancamentoId,
  });

  if (errLink) {
    throw new Error(`falha_vincular_lancamento_fatura: ${errLink.message}`);
  }

  const novoTotal = (Number(fatura.valor_total_centavos) || 0) + valorCentavos;

  const { error: errUpd } = await supabase
    .from("credito_conexao_faturas")
    .update({ valor_total_centavos: novoTotal })
    .eq("id", fatura.id);

  if (errUpd) {
    throw new Error(`falha_atualizar_total_fatura: ${errUpd.message}`);
  }
}

export async function POST(req: Request) {
  // Next.js 15: cookies() is async
  const cookieStore = await cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: auth } = await supabaseAuth.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "nao_autenticado" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const matriculaId = asInt(body.matricula_id);
  if (!matriculaId) {
    return NextResponse.json({ error: "matricula_id_invalido" }, { status: 400 });
  }

  if (!body.tipo_primeira_cobranca) {
    return NextResponse.json({ error: "tipo_primeira_cobranca_obrigatorio" }, { status: 400 });
  }

  if (!body.modo) {
    return NextResponse.json({ error: "modo_obrigatorio" }, { status: 400 });
  }

  // 1) Carrega matricula (inclui valor herdado)
  const { data: matricula, error: errMat } = await supabase
    .from("matriculas")
    .select(
      "id, pessoa_id, responsavel_financeiro_id, primeira_cobranca_status, primeira_cobranca_valor_centavos, ano_referencia, data_inicio_vinculo",
    )
    .eq("id", matriculaId)
    .single();

  if (errMat || !matricula) {
    return NextResponse.json({ error: "matricula_nao_encontrada" }, { status: 404 });
  }

  const debugCartao: {
    executado: boolean;
    conta_conexao_id?: number;
    ano_ref?: number;
    data_inicio_vinculo?: string | null;
    periodo_inicio?: string | null;
    periodo_fim?: string | null;
    created_lancamentos: number;
    linked_faturas: number;
    erro?: string;
  } = {
    executado: false,
    created_lancamentos: 0,
    linked_faturas: 0,
    data_inicio_vinculo: null,
    periodo_inicio: null,
    periodo_fim: null,
  };

  debugCartao.data_inicio_vinculo =
    typeof matricula.data_inicio_vinculo === "string" ? matricula.data_inicio_vinculo : null;

  if (matricula.primeira_cobranca_status === "PAGA" || matricula.primeira_cobranca_status === "LANCADA_CARTAO") {
    return NextResponse.json({ error: "matricula_ja_liquidada" }, { status: 409 });
  }

  const valorPayload = asInt(body.valor_centavos);
  const valorHerdado = asInt(matricula.primeira_cobranca_valor_centavos);
  const valorFinal = valorPayload && valorPayload > 0 ? valorPayload : valorHerdado && valorHerdado > 0 ? valorHerdado : null;

  if (body.modo === "PAGAR_AGORA") {
    const formaPagamentoId = asInt(body.forma_pagamento_id);
    const dataPg = asDateStr(body.data_pagamento);

    if (!formaPagamentoId) {
      return NextResponse.json({ error: "forma_pagamento_id_obrigatorio" }, { status: 400 });
    }
    if (!valorFinal) {
      return NextResponse.json({ error: "valor_nao_resolvido_na_matricula" }, { status: 409 });
    }
    if (!dataPg) {
      return NextResponse.json({ error: "data_pagamento_obrigatoria" }, { status: 400 });
    }

    const { data: forma, error: errForma } = await supabase
      .from("formas_pagamento")
      .select("id, codigo, nome")
      .eq("id", formaPagamentoId)
      .single();

    if (errForma || !forma?.codigo) {
      return NextResponse.json({ error: "forma_pagamento_invalida" }, { status: 400 });
    }

    const { data: cobranca, error: errCobr } = await supabase
      .from("cobrancas")
      .insert({
        pessoa_id: matricula.responsavel_financeiro_id,
        descricao: "Entrada (pro-rata) - ato da matricula",
        valor_centavos: valorFinal,
        vencimento: dataPg,
        status: "PAGA",
        data_pagamento: dataPg,
        metodo_pagamento: forma.codigo,
        observacoes: body.observacoes ?? null,
        origem_tipo: "MATRICULA",
        origem_id: matricula.id,
      })
      .select("id, centro_custo_id")
      .single();

    if (errCobr || !cobranca) {
      return NextResponse.json(
        { error: "falha_criar_cobranca", details: errCobr?.message ?? "erro_desconhecido" },
        { status: 500 },
      );
    }

    const { data: receb, error: errRec } = await supabase
      .from("recebimentos")
      .insert({
        cobranca_id: cobranca.id,
        centro_custo_id: cobranca.centro_custo_id ?? null,
        valor_centavos: valorFinal,
        data_pagamento: toTimestamptzNoonUtc(dataPg),
        metodo_pagamento: forma.codigo,
        origem_sistema: "MATRICULA",
        observacoes: body.observacoes ?? null,
        forma_pagamento_codigo: forma.codigo,
      })
      .select("id")
      .single();

    if (errRec || !receb) {
      return NextResponse.json(
        { error: "falha_criar_recebimento", details: errRec?.message ?? "erro_desconhecido" },
        { status: 500 },
      );
    }

    await inserirMovimentoFinanceiroReceita({
      supabase,
      centroCustoId: cobranca.centro_custo_id ?? null,
      valorCentavos: valorFinal,
      dataYYYYMMDD: dataPg,
      origemTipo: "RECEBIMENTO",
      origemId: receb.id,
      descricao: "Pagamento presencial - Entrada (pro-rata) matricula",
    });

    if (body.tipo_primeira_cobranca === "ENTRADA_PRORATA") {
      const ledgerEntrada: LedgerInsert = {
        matricula_id: matricula.id,
        tipo: "ENTRADA",
        descricao: "Entrada / Pro-rata",
        valor_centavos: valorFinal,
        vencimento: null,
        data_evento: dataPg,
        status: "PAGO",
        origem_tabela: "recebimentos",
        origem_id: receb.id,
      };

      const { error: ledgerErr } = await supabase.from("matriculas_financeiro_linhas").insert(ledgerEntrada);
      if (ledgerErr) {
        return NextResponse.json(
          { error: "falha_inserir_ledger", details: ledgerErr.message },
          { status: 500 },
        );
      }
    }

    const { error: errUpd } = await supabase
      .from("matriculas")
      .update({
        primeira_cobranca_tipo: body.tipo_primeira_cobranca,
        primeira_cobranca_status: "PAGA",
        primeira_cobranca_valor_centavos: valorFinal,
        primeira_cobranca_cobranca_id: cobranca.id,
        primeira_cobranca_recebimento_id: receb.id,
        primeira_cobranca_forma_pagamento_id: formaPagamentoId,
        primeira_cobranca_data_pagamento: dataPg,
      })
      .eq("id", matricula.id);

    if (errUpd) {
      return NextResponse.json({ error: "falha_atualizar_matricula", details: errUpd.message }, { status: 500 });
    }

    if (body.tipo_primeira_cobranca === "ENTRADA_PRORATA") {
      debugCartao.executado = true;

      try {
        const dataInicio = debugCartao.data_inicio_vinculo;
        const anoRef =
          typeof matricula.ano_referencia === "number"
            ? matricula.ano_referencia
            : dataInicio
              ? yearFromDate(dataInicio)
              : new Date().getFullYear();

        debugCartao.ano_ref = anoRef;

        const mesInicioVinculo = dataInicio ? monthFromDate(dataInicio) : 1;
        const mesPrimeiraMensalidadeCheia = Math.min(12, mesInicioVinculo + 1);

        debugCartao.periodo_inicio = buildPeriodo(anoRef, mesPrimeiraMensalidadeCheia);
        debugCartao.periodo_fim = buildPeriodo(anoRef, 12);

        const valorMensalidadeCheia = Number(matricula.primeira_cobranca_valor_centavos) || null;

        if (!valorMensalidadeCheia || valorMensalidadeCheia <= 0) {
          console.warn(
            "[matriculas/liquidacao] valorMensalidadeCheia ausente para lancamento no cartao. Matricula:",
            matricula.id,
          );
        } else {
          const conta = await ensureContaCreditoConexaoAluno({
            supabase,
            pessoaTitularId: matricula.responsavel_financeiro_id,
          });

          debugCartao.conta_conexao_id = conta.id;

          await ensureFaturasAno({
            supabase,
            contaConexaoId: conta.id,
            ano: anoRef,
            diaFechamento: conta.dia_fechamento ?? 10,
            diaVencimento: conta.dia_vencimento ?? 12,
          });

          for (let mes = mesPrimeiraMensalidadeCheia; mes <= 12; mes++) {
            const periodo = buildPeriodo(anoRef, mes);
            const dataEvento = buildDateFromYMD(anoRef, mes, 1);

            const { data: lanc, error: errLanc } = await supabase
              .from("credito_conexao_lancamentos")
              .insert({
                conta_conexao_id: conta.id,
                origem_sistema: "MATRICULA",
                origem_id: matricula.id,
                descricao: `Mensalidade ${periodo} - matricula`,
                valor_centavos: valorMensalidadeCheia,
                status: "PENDENTE_FATURA",
              })
              .select("id")
              .single();

            if (errLanc || !lanc) {
              throw new Error(`falha_criar_lancamento_cartao: ${errLanc?.message ?? "erro"}`);
            }

            debugCartao.created_lancamentos += 1;

            await vincularLancamentoNaFatura({
              supabase,
              contaConexaoId: conta.id,
              periodoReferencia: periodo,
              lancamentoId: lanc.id,
              valorCentavos: valorMensalidadeCheia,
            });

            debugCartao.linked_faturas += 1;

            const ledgerLinha: LedgerInsert = {
              matricula_id: matricula.id,
              tipo: "LANCAMENTO_CREDITO",
              descricao: `Mensalidade ${periodo} - matricula`,
              valor_centavos: valorMensalidadeCheia,
              vencimento: null,
              data_evento: dataEvento,
              status: "PENDENTE_FATURA",
              origem_tabela: "credito_conexao_lancamentos",
              origem_id: lanc.id,
            };

            const { error: ledgerErr } = await supabase.from("matriculas_financeiro_linhas").insert(ledgerLinha);
            if (ledgerErr) {
              return NextResponse.json(
                { error: "falha_inserir_ledger", details: ledgerErr.message },
                { status: 500 },
              );
            }
          }
        }
      } catch (err) {
        debugCartao.erro = err instanceof Error ? err.message : "erro_desconhecido";
        return NextResponse.json({ error: "falha_cartao_conexao", debugCartao }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      status: "PAGA",
      cobranca_id: cobranca.id,
      recebimento_id: receb.id,
      debugCartao,
    });
  }

  if (body.modo === "LANCAR_NO_CARTAO") {
    if (!valorFinal) {
      return NextResponse.json({ error: "valor_nao_resolvido_na_matricula" }, { status: 409 });
    }

    const conta = await ensureContaCreditoConexaoAluno({
      supabase,
      pessoaTitularId: matricula.responsavel_financeiro_id,
    });

    const anoRef = typeof matricula.ano_referencia === "number" ? matricula.ano_referencia : new Date().getFullYear();
    await ensureFaturasAno({
      supabase,
      contaConexaoId: conta.id,
      ano: anoRef,
      diaFechamento: conta.dia_fechamento ?? 10,
      diaVencimento: conta.dia_vencimento ?? 12,
    });

    const { data: lanc, error: errLanc } = await supabase
      .from("credito_conexao_lancamentos")
      .insert({
        conta_conexao_id: conta.id,
        origem_sistema: "MATRICULA",
        origem_id: matricula.id,
        descricao: "Mensalidade cheia - matricula",
        valor_centavos: valorFinal,
        status: "PENDENTE_FATURA",
      })
      .select("id")
      .single();

    if (errLanc || !lanc) {
      return NextResponse.json(
        { error: "falha_criar_lancamento_cartao", details: errLanc?.message ?? "erro_desconhecido" },
        { status: 500 },
      );
    }

    const periodo =
      typeof matricula.data_inicio_vinculo === "string" ? ymFromDate(matricula.data_inicio_vinculo) : `${anoRef}-01`;

    await vincularLancamentoNaFatura({
      supabase,
      contaConexaoId: conta.id,
      periodoReferencia: periodo,
      lancamentoId: lanc.id,
      valorCentavos: valorFinal,
    });

    const ledgerLinha: LedgerInsert = {
      matricula_id: matricula.id,
      tipo: "LANCAMENTO_CREDITO",
      descricao: "Mensalidade cheia - matricula",
      valor_centavos: valorFinal,
      vencimento: null,
      data_evento: dateFromPeriodo(periodo),
      status: "PENDENTE_FATURA",
      origem_tabela: "credito_conexao_lancamentos",
      origem_id: lanc.id,
    };

    const { error: ledgerErr } = await supabase.from("matriculas_financeiro_linhas").insert(ledgerLinha);
    if (ledgerErr) {
      return NextResponse.json(
        { error: "falha_inserir_ledger", details: ledgerErr.message },
        { status: 500 },
      );
    }

    const { error: errUpd } = await supabase
      .from("matriculas")
      .update({
        primeira_cobranca_tipo: body.tipo_primeira_cobranca,
        primeira_cobranca_status: "LANCADA_CARTAO",
        primeira_cobranca_valor_centavos: valorFinal,
        primeira_cobranca_data_pagamento: null,
      })
      .eq("id", matricula.id);

    if (errUpd) {
      return NextResponse.json({ error: "falha_atualizar_matricula", details: errUpd.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "LANCADA_CARTAO", lancamento_cartao_id: lanc.id });
  }

  if (body.modo === "ADIAR_EXCECAO") {
    const motivo = typeof body.motivo_excecao === "string" ? body.motivo_excecao.trim() : "";
    if (!motivo) {
      return NextResponse.json({ error: "motivo_excecao_obrigatorio" }, { status: 400 });
    }

    const { error: errUpd } = await supabase
      .from("matriculas")
      .update({
        primeira_cobranca_tipo: body.tipo_primeira_cobranca,
        primeira_cobranca_status: "ADIADA_EXCECAO",
        excecao_primeiro_pagamento: true,
        motivo_excecao_primeiro_pagamento: motivo,
        excecao_autorizada_por: auth.user.id,
        excecao_criada_em: new Date().toISOString(),
      })
      .eq("id", matricula.id);

    if (errUpd) {
      return NextResponse.json({ error: "falha_atualizar_matricula", details: errUpd.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "ADIADA_EXCECAO" });
  }

  return NextResponse.json({ error: "modo_invalido" }, { status: 400 });
}
