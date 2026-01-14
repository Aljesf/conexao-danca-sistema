import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type Payload = {
  forma_pagamento?: string;
  valor_pago_centavos?: number;
  comprovante?: string | null;
  data_pagamento?: string | null; // YYYY-MM-DD (opcional)
  observacoes?: string | null;
};

type CobrancaAvulsa = {
  id: number;
  pessoa_id: number;
  valor_centavos: number;
  status: string;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeFormaPagamento(value: string | undefined): string | null {
  if (!value) return null;
  let cleaned = value.trim().toUpperCase();
  if (!cleaned) return null;

  const allowed = new Set([
    "PIX",
    "DINHEIRO",
    "CARTAO_CREDITO_AVISTA",
    "CARTAO_CREDITO_PARCELADO",
    "CARTAO_CONEXAO_ALUNO",
    "CARTAO_CONEXAO_COLABORADOR",
    "CREDITO_INTERNO_ALUNO",
    "CREDIARIO_COLABORADOR",
    "OUTRO",
  ]);

  if (cleaned === "CARTAO") cleaned = "CARTAO_CREDITO_AVISTA";
  if (cleaned === "TRANSFERENCIA") cleaned = "OUTRO";

  return allowed.has(cleaned) ? cleaned : "OUTRO";
}

function isISODate(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function getCentroCustoPadraoEscolaId(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<number | null> {
  const { data, error } = await supabase
    .from("escola_config_financeira")
    .select("centro_custo_padrao_escola_id")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return null;
  }

  const id = (data as { centro_custo_padrao_escola_id?: number | null })?.centro_custo_padrao_escola_id;
  return typeof id === "number" ? id : null;
}

async function getCentroCustoFallbackPrimeiroAtivoId(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<number | null> {
  const { data, error } = await supabase
    .from("centros_custo")
    .select("id")
    .eq("ativo", true)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }

  return Number(data.id);
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  try {
    const cobrancaId = Number(ctx.params.id);
    if (!Number.isFinite(cobrancaId) || cobrancaId <= 0) {
      return NextResponse.json(
        { ok: false, error_code: "id_invalido", message: "ID de cobrança inválido." },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => null)) as Payload | null;
    const formaPagamento = normalizeFormaPagamento(body?.forma_pagamento);
    if (!formaPagamento) {
      return NextResponse.json(
        { ok: false, error_code: "forma_pagamento_obrigatoria", message: "Forma de pagamento é obrigatória." },
        { status: 400 }
      );
    }

    const dataPagamento = isISODate(body?.data_pagamento) ? body?.data_pagamento : todayISO();
    const valorPagoCentavosRaw = body?.valor_pago_centavos;
    const comprovante = typeof body?.comprovante === "string" ? body.comprovante.trim() : "";
    const observacoes = typeof body?.observacoes === "string" ? body.observacoes.trim() : "";

    const supabase = getSupabaseAdmin();

    const { data: cobranca, error: cobrErr } = await supabase
      .from("financeiro_cobrancas_avulsas")
      .select("id, pessoa_id, valor_centavos, status")
      .eq("id", cobrancaId)
      .maybeSingle<CobrancaAvulsa>();

    if (cobrErr) {
      return NextResponse.json(
        { ok: false, error_code: "erro_buscar_cobranca", message: "Falha ao buscar cobrança.", details: cobrErr.message },
        { status: 500 }
      );
    }

    if (!cobranca) {
      return NextResponse.json(
        { ok: false, error_code: "cobranca_nao_encontrada", message: "Cobrança não encontrada." },
        { status: 404 }
      );
    }

    const statusAtual = String(cobranca.status ?? "").toUpperCase();
    if (statusAtual === "PAGO") {
      return NextResponse.json(
        { ok: false, error_code: "cobranca_ja_paga", message: "Cobrança já está paga." },
        { status: 409 }
      );
    }
    if (statusAtual === "CANCELADO") {
      return NextResponse.json(
        { ok: false, error_code: "cobranca_cancelada", message: "Cobrança cancelada." },
        { status: 409 }
      );
    }

    const valorBase = Number(cobranca.valor_centavos ?? 0);
    const valorPago =
      typeof valorPagoCentavosRaw === "number" && Number.isFinite(valorPagoCentavosRaw)
        ? Math.trunc(valorPagoCentavosRaw)
        : valorBase;

    if (!Number.isFinite(valorPago) || valorPago <= 0) {
      return NextResponse.json(
        { ok: false, error_code: "valor_pago_invalido", message: "Valor pago deve ser maior que zero." },
        { status: 400 }
      );
    }

    const centroPadrao = await getCentroCustoPadraoEscolaId(supabase);
    const centroFallback = await getCentroCustoFallbackPrimeiroAtivoId(supabase);
    const centroCustoId = centroPadrao ?? centroFallback;

    if (!centroCustoId) {
      return NextResponse.json(
        { ok: false, error_code: "centro_custo_indisponivel", message: "Centro de custo não configurado." },
        { status: 500 }
      );
    }

    const { data: recebimento, error: recErr } = await supabase
      .from("recebimentos")
      .insert({
        cobranca_id: null,
        centro_custo_id: centroCustoId,
        valor_centavos: valorPago,
        data_pagamento: dataPagamento,
        metodo_pagamento: formaPagamento,
        origem_sistema: "COBRANCA_AVULSA",
        observacoes: observacoes || comprovante || `Recebimento cobrança avulsa #${cobrancaId}`,
      })
      .select("*")
      .single();

    if (recErr || !recebimento) {
      return NextResponse.json(
        {
          ok: false,
          error_code: "erro_criar_recebimento",
          message: "Falha ao criar recebimento.",
          details: recErr?.message ?? "recebimento_nao_criado",
        },
        { status: 500 }
      );
    }

    const { data: cobrancaAtualizada, error: updErr } = await supabase
      .from("financeiro_cobrancas_avulsas")
      .update({
        status: "PAGO",
        pago_em: new Date().toISOString(),
        valor_pago_centavos: valorPago,
        forma_pagamento: formaPagamento,
        comprovante: comprovante || null,
      })
      .eq("id", cobrancaId)
      .select("*")
      .maybeSingle();

    if (updErr || !cobrancaAtualizada) {
      return NextResponse.json(
        {
          ok: false,
          error_code: "erro_atualizar_cobranca",
          message: "Falha ao atualizar cobrança.",
          details: updErr?.message ?? "cobranca_nao_atualizada",
        },
        { status: 500 }
      );
    }

    const { data: movimento, error: movErr } = await supabase
      .from("movimento_financeiro")
      .insert({
        tipo: "RECEITA",
        centro_custo_id: centroCustoId,
        valor_centavos: valorPago,
        data_movimento: dataPagamento,
        origem: "RECEBIMENTO",
        origem_id: recebimento.id,
        descricao: `Recebimento cobrança avulsa #${cobrancaId}`,
        usuario_id: null,
      })
      .select("*")
      .single();

    if (movErr) {
      return NextResponse.json(
        {
          ok: false,
          error_code: "erro_criar_movimento",
          message: "Falha ao registrar movimento financeiro.",
          details: movErr.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      cobranca: cobrancaAtualizada,
      recebimento,
      movimento,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro_desconhecido";
    return NextResponse.json(
      { ok: false, error_code: "erro_interno", message: "Falha inesperada ao registrar recebimento.", details: message },
      { status: 500 }
    );
  }
}
