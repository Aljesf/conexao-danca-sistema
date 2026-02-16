import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { upsertNeofinBilling } from "@/lib/neofinClient";
import { calcularDataVencimento } from "@/lib/financeiro/creditoConexao/vencimento";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type RouteContext = { params: Promise<{ id: string }> };

type Fatura = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string;
  data_fechamento: string | null;
  data_vencimento: string | null;
  valor_total_centavos: number;
  valor_taxas_centavos: number;
  status: string;
  cobranca_id: number | null;
  conta?: {
    tipo_conta: string;
    dia_fechamento: number | null;
    dia_vencimento: number | null;
    pessoa_titular_id: number;
  } | null;
  lancamentos?: Array<{
    lancamento: {
      valor_centavos: number;
      numero_parcelas: number | null;
      origem_sistema: string | null;
      origem_id: number | null;
    } | null;
  }> | null;
};

type RegraParcelas = {
  id: number;
  numero_parcelas_min: number;
  numero_parcelas_max: number;
  valor_minimo_centavos: number;
  taxa_percentual: number;
  taxa_fixa_centavos: number;
  centro_custo_id: number | null;
};

type PessoaTitular = {
  id: number;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
};

const ORIGEM_TIPO_CANONICA = "FATURA_CREDITO_CONEXAO";
const ORIGEM_TIPOS_COMPATIVEIS = [ORIGEM_TIPO_CANONICA, "CREDITO_CONEXAO_FATURA"];

function firstNonEmptyString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

function extractBillingInfo(body: any, fallbackId?: string) {
  const candidates: any[] = [];
  if (Array.isArray(body)) candidates.push(...body);
  if (body && typeof body === "object") {
    if (Array.isArray(body.billings)) candidates.push(...body.billings);
    if (Array.isArray(body.data)) candidates.push(...body.data);
    if (Array.isArray(body.data?.billings)) candidates.push(...body.data.billings);
  }
  const billing = candidates.find((b) => b && typeof b === "object") ?? (body && typeof body === "object" ? body : null);

  const chargeId =
    firstNonEmptyString(
      billing?.id,
      billing?.billing_id,
      billing?.charge_id,
      billing?.integration_identifier,
      billing?.integrationIdentifier,
      body?.billing_id,
      body?.charge_id,
      body?.integration_identifier,
      fallbackId
    ) ?? null;

  const paymentLink =
    firstNonEmptyString(
      billing?.payment_link,
      billing?.payment_url,
      billing?.link_pagamento,
      billing?.url,
      billing?.link,
      billing?.billet_url,
      billing?.boleto_url,
      body?.payment_link,
      body?.payment_url
    ) ?? null;

  const digitableLine =
    firstNonEmptyString(
      billing?.digitable_line,
      billing?.linha_digitavel,
      billing?.digitableLine,
      billing?.boleto_linha_digitavel,
      billing?.boleto_digitable_line,
      billing?.barcode,
      billing?.bar_code,
      body?.digitable_line,
      body?.linha_digitavel
    ) ?? null;

  return { chargeId, paymentLink, digitableLine };
}

function chooseRegraParcelas(
  regras: RegraParcelas[],
  numeroParcelas: number,
  valorTotal: number
): RegraParcelas | null {
  const candidatas = regras.filter((r) => {
    const min = Number(r.numero_parcelas_min ?? 0);
    const max = Number(r.numero_parcelas_max ?? 0);
    const vmin = Number(r.valor_minimo_centavos ?? 0);
    return numeroParcelas >= min && numeroParcelas <= max && valorTotal >= vmin;
  });

  candidatas.sort((a, b) => {
    const vminA = Number(a.valor_minimo_centavos ?? 0);
    const vminB = Number(b.valor_minimo_centavos ?? 0);
    if (vminA !== vminB) return vminB - vminA; // maior valor_minimo primeiro
    const faixaA =
      Number(a.numero_parcelas_max ?? 0) - Number(a.numero_parcelas_min ?? 0);
    const faixaB =
      Number(b.numero_parcelas_max ?? 0) - Number(b.numero_parcelas_min ?? 0);
    if (faixaA !== faixaB) return faixaA - faixaB; // faixa mais estreita primeiro
    return Number(b.numero_parcelas_max ?? 0) - Number(a.numero_parcelas_max ?? 0);
  });

  return candidatas[0] ?? null;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const force = new URL(request.url).searchParams.get("force") === "true";
  const { id } = await params;
  const faturaId = Number(id);

  if (!faturaId || Number.isNaN(faturaId)) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  console.log("[fechar fatura] iniciando", { faturaId, force });

  const { data: fatura, error: faturaError } = await supabase
    .from("credito_conexao_faturas")
    .select(
      `
      id,
      conta_conexao_id,
      periodo_referencia,
      data_fechamento,
      data_vencimento,
      valor_total_centavos,
      valor_taxas_centavos,
      status,
      cobranca_id,
      conta:credito_conexao_contas (
        tipo_conta,
        dia_fechamento,
        dia_vencimento,
        pessoa_titular_id
      ),
      lancamentos:credito_conexao_fatura_lancamentos (
        lancamento:credito_conexao_lancamentos (
          valor_centavos,
          numero_parcelas,
          origem_sistema,
          origem_id
        )
      )
    `
    )
    .eq("id", faturaId)
    .maybeSingle<Fatura>();

  if (faturaError || !fatura) {
    console.error("[fechar fatura] fatura_nao_encontrada", faturaError);
    return NextResponse.json({ ok: false, error: "fatura_nao_encontrada" }, { status: 404 });
  }

  if (fatura.status === "PAGA") {
    return NextResponse.json({ ok: false, error: "fatura_ja_paga" }, { status: 400 });
  }

  if (!fatura.conta?.pessoa_titular_id) {
    return NextResponse.json(
      { ok: false, error: "titular_indefinido" },
      { status: 500 }
    );
  }

  const lancamentos = (fatura.lancamentos ?? []).map((l) => l.lancamento).filter(Boolean) as any[];
  if (!lancamentos.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "fatura_sem_lancamentos",
        message: "Nao e possivel fechar a fatura do Credito Conexao sem lancamentos de consumo.",
      },
      { status: 400 }
    );
  }

  const compras_centavos = lancamentos.reduce(
    (sum, l) => sum + Number(l?.valor_centavos ?? 0),
    0
  );
  const numero_parcelas = Math.max(
    1,
    ...lancamentos
      .map((l) => Number(l?.numero_parcelas || 0))
      .filter((n) => Number.isFinite(n) && n > 0)
  );

  const tipoConta = fatura.conta?.tipo_conta ?? null;
  if (!tipoConta) {
    return NextResponse.json({ ok: false, error: "tipo_conta_indefinido" }, { status: 500 });
  }

  const { data: regras, error: regrasError } = await supabase
    .from("credito_conexao_regras_parcelas")
    .select(
      `
      id,
      numero_parcelas_min,
      numero_parcelas_max,
      valor_minimo_centavos,
      taxa_percentual,
      taxa_fixa_centavos,
      centro_custo_id
    `
    )
    .eq("tipo_conta", tipoConta)
    .eq("ativo", true);

  if (regrasError) {
    console.error("[fechar fatura] erro ao buscar regras de parcelamento:", regrasError);
    return NextResponse.json(
      { ok: false, error: "erro_buscar_regras_parcelamento" },
      { status: 500 }
    );
  }

  const regra = chooseRegraParcelas((regras as RegraParcelas[]) ?? [], numero_parcelas, compras_centavos);
  if (!regra) {
    console.warn("[fechar fatura] regra de parcelamento nao encontrada; taxa = 0", {
      faturaId,
      tipoConta,
      numero_parcelas,
      compras_centavos,
    });
  }

  const taxa_centavos =
    regra && compras_centavos > 0
      ? Math.max(
          Math.round(compras_centavos * Number(regra.taxa_percentual ?? 0) / 100) +
            Number(regra.taxa_fixa_centavos ?? 0),
          0
        )
      : 0;

  const total_centavos = compras_centavos + taxa_centavos;

  const now = new Date();
  let vencimento = fatura.data_vencimento ?? null;
  if (!vencimento) {
    if (tipoConta === "ALUNO" && /^\d{4}-\d{2}$/.test(fatura.periodo_referencia)) {
      const diaPreferido = Number(fatura.conta?.dia_vencimento ?? 12);
      vencimento = calcularDataVencimento({
        competenciaAnoMes: fatura.periodo_referencia,
        diaPreferido,
        forcarUltimoVencimentoDia12: true,
      });
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      vencimento = d.toISOString().slice(0, 10);
    }
  }

  // Regra hard: conta COLABORADOR nao gera cobranca externa.
  if (tipoConta === "COLABORADOR") {
    const { error: faturaUpdateError } = await supabase
      .from("credito_conexao_faturas")
      .update({
        valor_total_centavos: total_centavos,
        valor_taxas_centavos: taxa_centavos,
        data_fechamento: fatura.data_fechamento ?? new Date().toISOString().slice(0, 10),
        data_vencimento: vencimento,
        status: "ABERTA",
        updated_at: new Date().toISOString(),
      })
      .eq("id", fatura.id);

    if (faturaUpdateError) {
      console.error("[fechar fatura] erro ao atualizar fatura COLABORADOR:", faturaUpdateError);
      return NextResponse.json(
        { ok: false, error: "erro_atualizar_fatura_colaborador" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        fatura_id: fatura.id,
        cobranca_id: null,
        cobranca_externa_gerada: false,
        compras_centavos,
        taxa_centavos,
        total_centavos,
        numero_parcelas,
        regra_id: regra?.id ?? null,
      },
      { status: 200 }
    );
  }

  // Upsert da cobranca
  let cobrancaId = fatura.cobranca_id ?? null;
  if (!cobrancaId) {
    const { data: cobrancaOrigem } = await supabase
      .from("cobrancas")
      .select("id")
      .in("origem_tipo", ORIGEM_TIPOS_COMPATIVEIS)
      .eq("origem_id", fatura.id)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cobrancaOrigem?.id) {
      cobrancaId = Number(cobrancaOrigem.id);
    }
  }
  const descricao = `Fatura Credito Conexao #${fatura.id} (${fatura.periodo_referencia})`;

  if (!cobrancaId || force) {
    if (cobrancaId && force) {
      const { data: cobrancaAtualizada, error: updateCobrancaError } = await supabase
        .from("cobrancas")
        .update({
          pessoa_id: fatura.conta.pessoa_titular_id,
          descricao,
          valor_centavos: total_centavos,
          moeda: "BRL",
          vencimento,
          status: "PENDENTE",
          origem_tipo: ORIGEM_TIPO_CANONICA,
          origem_id: fatura.id,
        })
        .eq("id", cobrancaId)
        .select("id")
        .maybeSingle();

      if (updateCobrancaError || !cobrancaAtualizada) {
        console.error("[fechar fatura] erro ao atualizar cobranca existente:", updateCobrancaError);
        return NextResponse.json(
          { ok: false, error: "erro_atualizar_cobranca" },
          { status: 500 }
        );
      }
    } else {
      const { data: novaCobranca, error: cobrancaError } = await supabase
        .from("cobrancas")
        .insert({
          pessoa_id: fatura.conta.pessoa_titular_id,
          descricao,
          valor_centavos: total_centavos,
          moeda: "BRL",
          vencimento,
          status: "PENDENTE",
          origem_tipo: ORIGEM_TIPO_CANONICA,
          origem_id: fatura.id,
        })
        .select("id")
        .maybeSingle();

      if (cobrancaError || !novaCobranca) {
        console.error("[fechar fatura] erro ao criar cobranca:", cobrancaError);
        return NextResponse.json(
          { ok: false, error: "erro_criar_cobranca" },
          { status: 500 }
        );
      }
      cobrancaId = novaCobranca.id;
    }
  }

  const { data: cobrancaRow, error: cobrancaRowErr } = await supabase
    .from("cobrancas")
    .select("id, neofin_charge_id, link_pagamento, linha_digitavel, neofin_payload, descricao, valor_centavos, vencimento")
    .eq("id", cobrancaId)
    .maybeSingle();

  if (cobrancaRowErr || !cobrancaRow) {
    console.error("[fechar fatura] erro ao buscar cobranca para integracao:", cobrancaRowErr);
    return NextResponse.json({ ok: false, error: "cobranca_nao_encontrada" }, { status: 500 });
  }

  // Integracao de cobranca (provedor atual: Neofin): garantir charge/links
  if (!cobrancaId) {
    return NextResponse.json({ ok: false, error: "cobranca_nao_criada" }, { status: 500 });
  }

  const { data: pessoaTitular, error: pessoaErr } = await supabase
    .from("pessoas")
    .select("id, nome, cpf, email, telefone")
    .eq("id", fatura.conta.pessoa_titular_id)
    .maybeSingle<PessoaTitular>();

  if (pessoaErr || !pessoaTitular || !pessoaTitular.cpf) {
    console.error("[fechar fatura] pessoa titular sem CPF ou erro ao buscar:", pessoaErr);
    return NextResponse.json(
      { ok: false, error: "titular_sem_cpf", details: pessoaErr?.message ?? null },
      { status: 500 }
    );
  }

  const cpfLimpo = (pessoaTitular.cpf || "").replace(/\D/g, "");
  const integrationIdentifier = `cobranca-${cobrancaId}`;

  if (!cobrancaRow.neofin_charge_id || force) {
    const neofinResult = await upsertNeofinBilling({
      integrationIdentifier,
      amountCentavos: total_centavos,
      dueDate: vencimento,
      description: cobrancaRow.descricao ?? descricao,
      customer: {
        nome: pessoaTitular.nome,
        cpf: cpfLimpo,
        email: pessoaTitular.email ?? undefined,
        telefone: pessoaTitular.telefone ?? undefined,
      },
    });

    if (!neofinResult.ok) {
      console.error("[fechar fatura] erro ao criar charge na Neofin:", neofinResult);
      return NextResponse.json(
        { ok: false, error: "erro_neofin_criar_cobranca", details: neofinResult },
        { status: 502 }
      );
    }

    const info = extractBillingInfo(neofinResult.body, integrationIdentifier);
    const { error: updCobrancaNeofin } = await supabase
      .from("cobrancas")
      .update({
        neofin_charge_id: info.chargeId ?? integrationIdentifier,
        link_pagamento: info.paymentLink ?? null,
        linha_digitavel: info.digitableLine ?? null,
        neofin_payload: neofinResult.body ?? null,
      })
      .eq("id", cobrancaId);

    if (updCobrancaNeofin) {
      console.error("[fechar fatura] erro ao salvar dados da Neofin na cobranca:", updCobrancaNeofin);
      return NextResponse.json(
        { ok: false, error: "erro_salvar_dados_neofin", details: updCobrancaNeofin?.message ?? null },
        { status: 500 }
      );
    }
  }

  const { error: faturaUpdateError } = await supabase
    .from("credito_conexao_faturas")
    .update({
      valor_total_centavos: total_centavos,
      valor_taxas_centavos: taxa_centavos,
      data_fechamento: fatura.data_fechamento ?? new Date().toISOString().slice(0, 10),
      data_vencimento: vencimento,
      status: "ABERTA",
      cobranca_id: cobrancaId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fatura.id);

  if (faturaUpdateError) {
    console.error("[fechar fatura] erro ao atualizar fatura:", faturaUpdateError);
    return NextResponse.json(
      { ok: false, error: "erro_atualizar_fatura" },
      { status: 500 }
    );
  }

  console.log("[fechar fatura] concluido", {
    faturaId,
    cobrancaId,
    compras_centavos,
    taxa_centavos,
    total_centavos,
    numero_parcelas,
    regra_id: regra?.id ?? null,
  });

  return NextResponse.json(
    {
      ok: true,
      fatura_id: fatura.id,
      cobranca_id: cobrancaId,
      compras_centavos,
      taxa_centavos,
      total_centavos,
      numero_parcelas,
      regra_id: regra?.id ?? null,
    },
    { status: 200 }
  );
}


