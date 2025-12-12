import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type RouteContext = { params: { id: string } };

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

function nextDateForDay(day: number | null | undefined, from: Date): string {
  if (!day || day < 1 || day > 31) {
    const d = new Date(from);
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  d.setDate(day);
  if (d < from) {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request, { params }: RouteContext) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "usuario_nao_autenticado" }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.get("force") === "true";
  const faturaId = Number(params.id);

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
    if (tipoConta === "ALUNO" && fatura.conta?.dia_vencimento) {
      vencimento = nextDateForDay(fatura.conta.dia_vencimento, now);
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      vencimento = d.toISOString().slice(0, 10);
    }
  }

  // Upsert da cobranca
  let cobrancaId = fatura.cobranca_id ?? null;
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
          origem_tipo: "CREDITO_CONEXAO_FATURA",
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
          origem_tipo: "CREDITO_CONEXAO_FATURA",
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
