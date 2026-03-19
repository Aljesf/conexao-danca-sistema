import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { extractNeofinBillingDetails, firstNonEmptyString, looksLikeNeofinBillingNumber } from "@/lib/neofinBilling";
import { getNeofinBilling } from "@/lib/neofinClient";

type FaturaRow = {
  id: number;
  conta_conexao_id: number | null;
  cobranca_id: number | null;
  neofin_invoice_id: string | null;
} & Record<string, unknown>;

type PivotRow = {
  lancamento_id: number;
  created_at: string | null;
};

type LancamentoRow = {
  id: number;
  conta_conexao_id: number | null;
  origem_sistema: string | null;
  origem_id: number | null;
  descricao: string | null;
  valor_centavos: number | null;
  competencia: string | null;
  referencia_item: string | null;
  status: string | null;
  composicao_json: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  aluno_pessoa_id?: number | null;
  aluno_nome?: string | null;
  responsavel_financeiro_nome?: string | null;
  cobranca_fatura_id?: number | null;
};

type ContaRow = {
  id: number;
  tipo_conta: string | null;
  pessoa_titular_id: number | null;
  descricao_exibicao: string | null;
};

type PessoaRow = {
  id: number;
  nome: string | null;
  cpf: string | null;
  email: string | null;
};

type LancamentoEnriquecidoRow = {
  lancamento_id: number;
  aluno_pessoa_id: number | null;
  aluno_nome: string | null;
  responsavel_financeiro_nome: string | null;
  cobranca_fatura_id: number | null;
};

type CobrancaResumoRow = {
  id: number;
  pessoa_id: number | null;
  descricao: string | null;
  valor_centavos: number | null;
  vencimento: string | null;
  status: string | null;
  metodo_pagamento: string | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  neofin_payload: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

function isCanonicalOrigem(origemTipo: string | null | undefined): boolean {
  const normalized = String(origemTipo ?? "").trim().toUpperCase();
  return normalized === "FATURA_CREDITO_CONEXAO" || normalized === "CREDITO_CONEXAO_FATURA";
}

function coerceCobranca(value: unknown): CobrancaResumoRow | null {
  return value && typeof value === "object" ? (value as CobrancaResumoRow) : null;
}

function buildIntegrationIdentifier(faturaId: number): string {
  return `fatura-credito-conexao-${faturaId}`;
}

async function buscarCobrancaPorId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  cobrancaId: number | null,
): Promise<CobrancaResumoRow | null> {
  if (!cobrancaId || !Number.isFinite(cobrancaId)) return null;

  const { data } = await supabase
    .from("cobrancas")
    .select(
      "id,pessoa_id,descricao,valor_centavos,vencimento,status,metodo_pagamento,origem_tipo,origem_subtipo,origem_id,neofin_charge_id,link_pagamento,linha_digitavel,neofin_payload,created_at,updated_at",
    )
    .eq("id", cobrancaId)
    .maybeSingle();

  return coerceCobranca(data);
}

async function buscarCobrancaCanonica(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  faturaId: number,
): Promise<CobrancaResumoRow | null> {
  const { data } = await supabase
    .from("cobrancas")
    .select(
      "id,pessoa_id,descricao,valor_centavos,vencimento,status,metodo_pagamento,origem_tipo,origem_subtipo,origem_id,neofin_charge_id,link_pagamento,linha_digitavel,neofin_payload,created_at,updated_at",
    )
    .eq("origem_id", faturaId)
    .in("origem_tipo", ["FATURA_CREDITO_CONEXAO", "CREDITO_CONEXAO_FATURA"])
    .neq("status", "CANCELADA")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  return coerceCobranca(data);
}

async function montarPagamentoExibivel(
  fatura: FaturaRow,
  cobrancaVinculada: CobrancaResumoRow | null,
  cobrancaCanonica: CobrancaResumoRow | null,
) {
  const cobrancaEscolhida = cobrancaCanonica ?? cobrancaVinculada;
  if (!cobrancaEscolhida) {
    return {
      cobranca_vinculada_id: cobrancaVinculada?.id ?? null,
      cobranca_canonica_id: cobrancaCanonica?.id ?? null,
      cobranca_exibida_id: null,
      usa_cobranca_canonica: false,
      invoice_valida: false,
      segunda_via_disponivel: false,
      tipo_exibido: "Nao informado",
      tipo_remoto: null,
      status_sincronizado: null,
      neofin_charge_id: null,
      invoice_id: null,
      integration_identifier: buildIntegrationIdentifier(fatura.id),
      link_pagamento: null,
      linha_digitavel: null,
      codigo_barras: null,
      qr_code_pix: null,
      pix_copia_e_cola: null,
    };
  }

  const integrationIdentifier = buildIntegrationIdentifier(fatura.id);
  const preferredLookupId =
    (looksLikeNeofinBillingNumber(fatura.neofin_invoice_id) ? fatura.neofin_invoice_id : null)
    ?? cobrancaEscolhida.neofin_charge_id
    ?? integrationIdentifier;

  const remote = await getNeofinBilling({ identifier: preferredLookupId });
  const detalhes = extractNeofinBillingDetails(
    remote.ok ? remote.body : cobrancaEscolhida.neofin_payload,
    {
      identifier: preferredLookupId,
      integrationIdentifier,
    },
  );

  const invoiceId =
    firstNonEmptyString(
      looksLikeNeofinBillingNumber(fatura.neofin_invoice_id) ? fatura.neofin_invoice_id : null,
      looksLikeNeofinBillingNumber(detalhes.billingId) ? detalhes.billingId : null,
    ) ?? null;

  const tipoExibido =
    isCanonicalOrigem(cobrancaEscolhida.origem_tipo) &&
    (cobrancaEscolhida.neofin_charge_id || invoiceId) &&
    (detalhes.displayType === "OUTROS_BANCOS" || detalhes.displayType === "NAO_INFORMADO")
      ? "Boleto/Pix"
      : detalhes.displayLabel;

  return {
    cobranca_vinculada_id: cobrancaVinculada?.id ?? null,
    cobranca_canonica_id: cobrancaCanonica?.id ?? null,
    cobranca_exibida_id: cobrancaEscolhida.id,
    usa_cobranca_canonica: Boolean(cobrancaCanonica && cobrancaCanonica.id === cobrancaEscolhida.id),
    invoice_valida: Boolean(invoiceId || cobrancaEscolhida.neofin_charge_id),
    segunda_via_disponivel: Boolean(
      detalhes.paymentLink ||
      detalhes.digitableLine ||
      detalhes.barcode ||
      detalhes.pixQrCode ||
      detalhes.pixCopyPaste,
    ),
    tipo_exibido: tipoExibido,
    tipo_remoto: detalhes.remoteType,
    status_sincronizado: detalhes.remoteStatus ?? cobrancaEscolhida.status ?? null,
    neofin_charge_id: cobrancaEscolhida.neofin_charge_id ?? null,
    invoice_id: invoiceId,
    integration_identifier: detalhes.integrationIdentifier ?? integrationIdentifier,
    link_pagamento: detalhes.paymentLink ?? cobrancaEscolhida.link_pagamento ?? null,
    linha_digitavel: detalhes.digitableLine ?? cobrancaEscolhida.linha_digitavel ?? null,
    codigo_barras: detalhes.barcode ?? null,
    qr_code_pix: detalhes.pixQrCode ?? null,
    pix_copia_e_cola: detalhes.pixCopyPaste ?? null,
  };
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as Request);
  if (denied) return denied as Response;

  const supabase = getSupabaseAdmin();
  const { id: rawId } = await ctx.params;
  const faturaId = Number(rawId);

  if (!Number.isFinite(faturaId)) {
    return NextResponse.json({ ok: false, error: "fatura_id_invalido" }, { status: 400 });
  }

  const { data: fatura, error: fatErr } = await supabase
    .from("credito_conexao_faturas")
    .select("*")
    .eq("id", faturaId)
    .maybeSingle();

  if (fatErr || !fatura) {
    return NextResponse.json({ ok: false, error: "fatura_nao_encontrada" }, { status: 404 });
  }

  const { data: pivots, error: pivErr } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("lancamento_id, created_at")
    .eq("fatura_id", faturaId);

  if (pivErr) {
    return NextResponse.json({ ok: false, error: "falha_buscar_pivot", detail: pivErr.message }, { status: 500 });
  }

  const lancamentoIds = (pivots ?? [])
    .map((pivot) => Number((pivot as PivotRow).lancamento_id))
    .filter((value) => Number.isFinite(value));

  let lancamentos: LancamentoRow[] = [];
  if (lancamentoIds.length > 0) {
    const { data: lancamentosRaw, error: lancamentosErr } = await supabase
      .from("credito_conexao_lancamentos")
      .select(
        "id,conta_conexao_id,origem_sistema,origem_id,descricao,valor_centavos,competencia,referencia_item,status,composicao_json,created_at,updated_at",
      )
      .in("id", lancamentoIds)
      .order("id", { ascending: true });

    if (lancamentosErr) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar_lancamentos", detail: lancamentosErr.message },
        { status: 500 },
      );
    }

    lancamentos = (lancamentosRaw ?? []) as LancamentoRow[];
  }

  if (lancamentos.length > 0) {
    const { data: enriquecidos, error: enriquecidosErr } = await supabase
      .from("vw_credito_conexao_fatura_itens_enriquecida")
      .select("lancamento_id,aluno_pessoa_id,aluno_nome,responsavel_financeiro_nome,cobranca_fatura_id")
      .eq("fatura_id", faturaId);

    if (!enriquecidosErr && enriquecidos) {
      const map = new Map<number, LancamentoEnriquecidoRow>();
      for (const row of enriquecidos as LancamentoEnriquecidoRow[]) {
        map.set(Number(row.lancamento_id), row);
      }

      lancamentos = lancamentos.map((row) => {
        const extra = map.get(Number(row.id));
        return extra
          ? {
              ...row,
              aluno_pessoa_id: extra.aluno_pessoa_id,
              aluno_nome: extra.aluno_nome,
              responsavel_financeiro_nome: extra.responsavel_financeiro_nome,
              cobranca_fatura_id: extra.cobranca_fatura_id,
            }
          : row;
      });
    }
  }

  const faturaRow = fatura as FaturaRow;
  const contaConexaoId = Number(faturaRow.conta_conexao_id);

  let conta: ContaRow | null = null;
  let pessoa: PessoaRow | null = null;

  if (Number.isFinite(contaConexaoId)) {
    const { data: contaRaw } = await supabase
      .from("credito_conexao_contas")
      .select("id,tipo_conta,pessoa_titular_id,descricao_exibicao")
      .eq("id", contaConexaoId)
      .maybeSingle();

    conta = (contaRaw ?? null) as ContaRow | null;

    const pessoaId = Number(conta?.pessoa_titular_id);
    if (Number.isFinite(pessoaId)) {
      const { data: pessoaRaw } = await supabase
        .from("pessoas")
        .select("id,nome,cpf,email")
        .eq("id", pessoaId)
        .maybeSingle();

      pessoa = (pessoaRaw ?? null) as PessoaRow | null;
    }
  }

  const cobrancaVinculada = await buscarCobrancaPorId(supabase, Number(faturaRow.cobranca_id ?? 0) || null);
  const cobrancaCanonica = await buscarCobrancaCanonica(supabase, faturaId);
  const pagamentoExibivel = await montarPagamentoExibivel(faturaRow, cobrancaVinculada, cobrancaCanonica);

  return NextResponse.json({
    ok: true,
    data: {
      fatura: faturaRow,
      conta,
      pessoa,
      pivot: (pivots ?? []) as PivotRow[],
      lancamentos,
      cobranca_vinculada: cobrancaVinculada,
      cobranca_canonica: cobrancaCanonica,
      pagamento_exibivel: pagamentoExibivel,
    },
  });
}
