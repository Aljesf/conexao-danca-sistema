import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { calcularDataVencimento } from "@/lib/financeiro/creditoConexao/vencimento";
import { getCobrancaProvider } from "@/lib/financeiro/cobranca/providers";
import type { CobrancaProviderCode } from "@/lib/financeiro/cobranca/providers/types";

type RouteContext = { params: Promise<{ id: string }> };

type Body = {
  dia_vencimento?: number;
  salvar_preferencia?: boolean;
  force?: boolean;
};

type FaturaConta = {
  tipo_conta: string | null;
  pessoa_titular_id: number | null;
  dia_vencimento: number | null;
  dia_vencimento_preferido: number | null;
} | null;

type FaturaRow = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string;
  status: string;
  data_fechamento: string | null;
  data_vencimento: string | null;
  valor_total_centavos: number;
  cobranca_id: number | null;
  conta: FaturaConta;
};

type ConfigCobrancaRow = {
  provider_ativo: string | null;
  dias_permitidos_vencimento: number[] | null;
};

const ORIGEM_TIPO_CANONICA = "FATURA_CREDITO_CONEXAO";
const ORIGEM_TIPOS_COMPATIVEIS = [ORIGEM_TIPO_CANONICA, "CREDITO_CONEXAO_FATURA"];

function clampDiaVencimento(dia: number): number {
  if (dia < 1) return 1;
  if (dia > 28) return 28;
  return Math.trunc(dia);
}

function selecionarDiaPermitido(preferido: number, permitidos: number[] | null | undefined): number {
  const diasValidos = Array.from(
    new Set(
      (permitidos ?? [])
        .map((d) => Number(d))
        .filter((d) => Number.isFinite(d))
        .map((d) => clampDiaVencimento(d)),
    ),
  ).sort((a, b) => a - b);

  if (diasValidos.length === 0) return clampDiaVencimento(preferido);
  if (diasValidos.includes(preferido)) return preferido;
  if (diasValidos.includes(12)) return 12;
  return diasValidos[0];
}

async function calcularTotalFaturaCentavos(
  supabase: any,
  faturaId: number,
  fallback: number,
): Promise<number> {
  const valorFallback = Number(fallback);
  if (Number.isFinite(valorFallback) && valorFallback > 0) {
    return Math.trunc(valorFallback);
  }

  const { data: vinculos, error: vincErr } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("lancamento:credito_conexao_lancamentos(valor_centavos)")
    .eq("fatura_id", faturaId);

  if (vincErr) throw new Error(vincErr.message);

  const total = (vinculos ?? []).reduce((acc: number, row: any) => {
    const valor = Number(row?.lancamento?.valor_centavos ?? 0);
    return acc + (Number.isFinite(valor) ? valor : 0);
  }, 0);

  return Math.max(Math.trunc(total), 0);
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { supabase } = auth;

  const { id } = await params;
  const faturaId = Number(id);
  if (!faturaId || Number.isNaN(faturaId)) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const force = body.force === true;
  const salvarPreferencia = body.salvar_preferencia === true;
  const diaBody = Number(body.dia_vencimento);
  const diaInput = Number.isFinite(diaBody) ? clampDiaVencimento(diaBody) : null;

  const { data: fatura, error: faturaErr } = await supabase
    .from("credito_conexao_faturas")
    .select(
      `
      id,
      conta_conexao_id,
      periodo_referencia,
      status,
      data_fechamento,
      data_vencimento,
      valor_total_centavos,
      cobranca_id,
      conta:credito_conexao_contas (
        tipo_conta,
        pessoa_titular_id,
        dia_vencimento,
        dia_vencimento_preferido
      )
    `,
    )
    .eq("id", faturaId)
    .maybeSingle<FaturaRow>();

  if (faturaErr || !fatura) {
    return NextResponse.json({ ok: false, error: "fatura_nao_encontrada" }, { status: 404 });
  }

  if (!fatura.conta?.pessoa_titular_id) {
    return NextResponse.json({ ok: false, error: "titular_indefinido" }, { status: 500 });
  }

  if (fatura.conta?.tipo_conta === "COLABORADOR") {
    return NextResponse.json(
      { ok: false, error: "conta_colaborador_sem_cobranca_externa" },
      { status: 409 },
    );
  }

  const competencia = String(fatura.periodo_referencia ?? "");
  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    return NextResponse.json({ ok: false, error: "periodo_referencia_invalido" }, { status: 400 });
  }

  const { data: cfgGlobal } = await supabase
    .from("financeiro_config_cobranca")
    .select("provider_ativo,dias_permitidos_vencimento")
    .is("unidade_id", null)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle<ConfigCobrancaRow>();

  const providerCode = (cfgGlobal?.provider_ativo ?? "NEOFIN") as CobrancaProviderCode;
  const diaBase =
    diaInput ??
    Number(fatura.conta?.dia_vencimento_preferido ?? fatura.conta?.dia_vencimento ?? 12);
  const diaEscolhido = selecionarDiaPermitido(clampDiaVencimento(diaBase), cfgGlobal?.dias_permitidos_vencimento);

  const vencimentoISO = calcularDataVencimento({
    competenciaAnoMes: competencia,
    diaPreferido: diaEscolhido,
    forcarUltimoVencimentoDia12: true,
  });

  if (salvarPreferencia && diaInput !== null) {
    const { error: prefErr } = await supabase
      .from("credito_conexao_contas")
      .update({ dia_vencimento_preferido: diaEscolhido })
      .eq("id", fatura.conta_conexao_id);
    if (prefErr) {
      return NextResponse.json(
        { ok: false, error: "erro_salvar_preferencia_vencimento", detail: prefErr.message },
        { status: 500 },
      );
    }
  }

  const totalCentavos = await calcularTotalFaturaCentavos(supabase, faturaId, fatura.valor_total_centavos);
  if (totalCentavos <= 0) {
    return NextResponse.json({ ok: false, error: "fatura_sem_valor_para_cobranca" }, { status: 400 });
  }

  let cobrancaId = fatura.cobranca_id ? Number(fatura.cobranca_id) : null;
  if (!cobrancaId || !Number.isFinite(cobrancaId)) {
    const { data: existente } = await supabase
      .from("cobrancas")
      .select("id")
      .in("origem_tipo", ORIGEM_TIPOS_COMPATIVEIS)
      .eq("origem_id", fatura.id)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle<{ id: number }>();
    cobrancaId = existente?.id ?? null;
  }

  const descricao = `Fatura Cartao Conexao ${competencia}`;

  if (cobrancaId && !force) {
    await supabase
      .from("cobrancas")
      .update({
        vencimento: vencimentoISO,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cobrancaId);

    await supabase
      .from("credito_conexao_faturas")
      .update({
        data_fechamento: fatura.data_fechamento ?? new Date().toISOString().slice(0, 10),
        data_vencimento: vencimentoISO,
        status: fatura.status === "PAGA" ? "PAGA" : "ABERTA",
        cobranca_id: cobrancaId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fatura.id);

    return NextResponse.json({
      ok: true,
      message: "cobranca_ja_existente",
      cobranca_id: cobrancaId,
      vencimento: vencimentoISO,
      provider: providerCode,
    });
  }

  if (cobrancaId) {
    const { error: updErr } = await supabase
      .from("cobrancas")
      .update({
        pessoa_id: fatura.conta.pessoa_titular_id,
        descricao,
        valor_centavos: totalCentavos,
        moeda: "BRL",
        vencimento: vencimentoISO,
        status: "PENDENTE",
        metodo_pagamento: "BOLETO",
        origem_tipo: ORIGEM_TIPO_CANONICA,
        origem_id: fatura.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cobrancaId);

    if (updErr) {
      return NextResponse.json({ ok: false, error: "erro_atualizar_cobranca", detail: updErr.message }, { status: 500 });
    }
  } else {
    const { data: created, error: insErr } = await supabase
      .from("cobrancas")
      .insert({
        pessoa_id: fatura.conta.pessoa_titular_id,
        descricao,
        valor_centavos: totalCentavos,
        moeda: "BRL",
        vencimento: vencimentoISO,
        status: "PENDENTE",
        metodo_pagamento: "BOLETO",
        origem_tipo: ORIGEM_TIPO_CANONICA,
        origem_id: fatura.id,
      })
      .select("id")
      .single<{ id: number }>();

    if (insErr || !created) {
      return NextResponse.json({ ok: false, error: "erro_criar_cobranca", detail: insErr?.message ?? null }, { status: 500 });
    }
    cobrancaId = created.id;
  }

  if (!cobrancaId) {
    return NextResponse.json({ ok: false, error: "cobranca_id_ausente" }, { status: 500 });
  }

  try {
    const provider = getCobrancaProvider(providerCode);
    const out = await provider.criarCobranca({
      pessoaId: Number(fatura.conta.pessoa_titular_id),
      descricao: `${descricao} (FATURA_CREDITO_CONEXAO:${fatura.id})`,
      valorCentavos: totalCentavos,
      vencimentoISO,
      referenciaInterna: { tipo: "FATURA_CREDITO_CONEXAO", id: fatura.id },
    });

    const { error: updCobrancaErr } = await supabase
      .from("cobrancas")
      .update({
        neofin_charge_id: out.providerCobrancaId,
        neofin_payload: out.payload ?? null,
        link_pagamento: out.linkPagamento ?? null,
        linha_digitavel: out.linhaDigitavel ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cobrancaId);

    if (updCobrancaErr) {
      return NextResponse.json({ ok: false, error: "erro_salvar_cobranca_provider", detail: updCobrancaErr.message }, { status: 500 });
    }

    const { error: updFaturaErr } = await supabase
      .from("credito_conexao_faturas")
      .update({
        cobranca_id: cobrancaId,
        data_fechamento: fatura.data_fechamento ?? new Date().toISOString().slice(0, 10),
        data_vencimento: vencimentoISO,
        status: fatura.status === "PAGA" ? "PAGA" : "ABERTA",
        valor_total_centavos: totalCentavos,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fatura.id);

    if (updFaturaErr) {
      return NextResponse.json({ ok: false, error: "erro_atualizar_fatura", detail: updFaturaErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      cobranca_id: cobrancaId,
      vencimento: vencimentoISO,
      provider: out.provider,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "erro_provider_desconhecido";
    return NextResponse.json({ ok: false, error: "erro_criar_cobranca_provider", detail }, { status: 502 });
  }
}
