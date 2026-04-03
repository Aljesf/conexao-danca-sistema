import { NextResponse } from "next/server";
import { validarFaturasCreditoConexao } from "@/lib/credito-conexao/validarCadeiaOrigem";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { resolverPagamentoExibivel } from "@/lib/financeiro/cobranca/resolverPagamentoExibivel";
import { enriquecerLancamentosOperacionaisFatura } from "@/lib/financeiro/colaboradoresFinanceiro";

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

type FolhaColaboradorRow = {
  id: number;
  competencia_ano_mes: string | null;
  status: string | null;
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
  competencia_ano_mes?: string | null;
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
  parcela_numero?: number | null;
  total_parcelas?: number | null;
  created_at: string | null;
  updated_at: string | null;
};

function coerceCobranca(value: unknown): CobrancaResumoRow | null {
  return value && typeof value === "object" ? (value as CobrancaResumoRow) : null;
}

function buildIntegrationIdentifier(faturaId: number): string {
  return `fatura-credito-conexao-${faturaId}`;
}

async function buscarRecebimentosResumo(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  cobrancaId: number | null,
) {
  if (!cobrancaId || !Number.isFinite(cobrancaId)) {
    return {
      quantidade: 0,
      total_centavos: 0,
      ultimo_pagamento: null,
      ultimo_recebimento_id: null,
    };
  }

  const { data } = await supabase
    .from("recebimentos")
    .select("id,valor_centavos,data_pagamento")
    .eq("cobranca_id", cobrancaId)
    .order("data_pagamento", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  const rows = (data ?? []) as Array<{
    id?: number | null;
    valor_centavos?: number | null;
    data_pagamento?: string | null;
  }>;

  return {
    quantidade: rows.length,
    total_centavos: rows.reduce((acc, row) => acc + Number(row.valor_centavos ?? 0), 0),
    ultimo_pagamento: typeof rows[0]?.data_pagamento === "string" ? rows[0].data_pagamento : null,
    ultimo_recebimento_id:
      typeof rows[0]?.id === "number" && Number.isFinite(rows[0].id) ? rows[0].id : null,
  };
}

async function buscarCobrancaPorId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  cobrancaId: number | null,
): Promise<CobrancaResumoRow | null> {
  if (!cobrancaId || !Number.isFinite(cobrancaId)) return null;

  const { data } = await supabase
    .from("cobrancas")
    .select(
      "id,pessoa_id,descricao,valor_centavos,vencimento,status,metodo_pagamento,origem_tipo,origem_subtipo,origem_id,neofin_charge_id,link_pagamento,linha_digitavel,neofin_payload,parcela_numero,total_parcelas,created_at,updated_at",
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
      "id,pessoa_id,descricao,valor_centavos,vencimento,status,metodo_pagamento,origem_tipo,origem_subtipo,origem_id,neofin_charge_id,link_pagamento,linha_digitavel,neofin_payload,parcela_numero,total_parcelas,created_at,updated_at",
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
      tipo_exibicao: "Nao informado",
      tipo_remoto: null,
      status_sincronizado: null,
      neofin_charge_id: null,
      invoice_id: null,
      integration_identifier: buildIntegrationIdentifier(fatura.id),
      link_pagamento: null,
      link_pagamento_validado: false,
      link_pagamento_origem: "indisponivel",
      correspondencia_confirmada: false,
      tipo_correspondencia: "none",
      payment_number: null,
      linha_digitavel: null,
      codigo_barras: null,
      pix_copia_cola: null,
      qr_code_url: null,
      qr_code_bruto: null,
      origem_dos_dados: "legado",
      link_historico_informativo: false,
      charge_id_textual_legado: false,
      mensagem_operacional: "Nao existe cobranca NeoFin resolvida para esta fatura.",
      observacao_validacao: "Sem cobranca vinculada para validar URL publica.",
    };
  }

  const integrationIdentifier = buildIntegrationIdentifier(fatura.id);
  const pagamento = await resolverPagamentoExibivel({
    cobranca: cobrancaEscolhida,
    neofinInvoiceId: fatura.neofin_invoice_id,
    integrationIdentifier,
  });

  return {
    cobranca_vinculada_id: cobrancaVinculada?.id ?? null,
    cobranca_canonica_id: cobrancaCanonica?.id ?? null,
    cobranca_exibida_id: cobrancaEscolhida.id,
    usa_cobranca_canonica: Boolean(cobrancaCanonica && cobrancaCanonica.id === cobrancaEscolhida.id),
    ...pagamento,
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

  const composicaoOperacional = await enriquecerLancamentosOperacionaisFatura(supabase, lancamentos);

  const faturaRow = fatura as FaturaRow;
  const contaConexaoId = Number(faturaRow.conta_conexao_id);

  let conta: ContaRow | null = null;
  let pessoa: PessoaRow | null = null;
  let contextoTitular:
    | {
        tipo: "COLABORADOR" | "ALUNO" | "OUTRO";
        colaborador_id: number | null;
        competencia: string | null;
        folha_pagamento_colaborador_id: number | null;
        status_importacao_folha: string | null;
        titular_label: string;
      }
    | null = null;

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

    const tipoConta = String(conta?.tipo_conta ?? "").trim().toUpperCase();
    if (tipoConta === "COLABORADOR" && Number.isFinite(pessoaId)) {
      const { data: colaboradorTitular } = await supabase
        .from("colaboradores")
        .select("id,pessoa_id,ativo")
        .eq("pessoa_id", pessoaId)
        .order("ativo", { ascending: false })
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      const competenciaFatura =
        typeof faturaRow.periodo_referencia === "string" ? faturaRow.periodo_referencia : null;
      let folhaColaborador: FolhaColaboradorRow | null = null;

      if (colaboradorTitular?.id && competenciaFatura) {
        const { data: folhaColaboradorRaw } = await supabase
          .from("folha_pagamento_colaborador")
          .select("id,competencia_ano_mes,status")
          .eq("colaborador_id", Number(colaboradorTitular.id))
          .eq("competencia_ano_mes", competenciaFatura)
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();
        folhaColaborador = (folhaColaboradorRaw ?? null) as FolhaColaboradorRow | null;
      }

      contextoTitular = {
        tipo: "COLABORADOR",
        conta_interna_id: conta?.id ?? null,
        colaborador_id: colaboradorTitular?.id ?? null,
        competencia: competenciaFatura,
        folha_pagamento_colaborador_id: folhaColaborador?.id ?? null,
        status_importacao_folha: folhaColaborador?.id ? folhaColaborador.status ?? "IMPORTADA" : "PENDENTE_IMPORTACAO",
        titular_label: "Conta interna do colaborador",
      };
    } else if (tipoConta === "ALUNO") {
      contextoTitular = {
        tipo: "ALUNO",
        conta_interna_id: conta?.id ?? null,
        colaborador_id: null,
        competencia: typeof faturaRow.periodo_referencia === "string" ? faturaRow.periodo_referencia : null,
        folha_pagamento_colaborador_id: null,
        status_importacao_folha: null,
        titular_label: "Conta interna do aluno",
      };
    } else {
      contextoTitular = {
        tipo: "OUTRO",
        conta_interna_id: conta?.id ?? null,
        colaborador_id: null,
        competencia: typeof faturaRow.periodo_referencia === "string" ? faturaRow.periodo_referencia : null,
        folha_pagamento_colaborador_id: null,
        status_importacao_folha: null,
        titular_label: "Conta interna",
      };
    }
  }

  const cobrancaVinculada = await buscarCobrancaPorId(supabase, Number(faturaRow.cobranca_id ?? 0) || null);
  const cobrancaCanonica = await buscarCobrancaCanonica(supabase, faturaId);
  const [recebimentosCobrancaCanonica, recebimentosCobrancaVinculada] = await Promise.all([
    buscarRecebimentosResumo(supabase, cobrancaCanonica?.id ?? null),
    buscarRecebimentosResumo(supabase, cobrancaVinculada?.id ?? null),
  ]);
  const pagamentoExibivel = await montarPagamentoExibivel(faturaRow, cobrancaVinculada, cobrancaCanonica);
  const validacaoOrigem = (
    await validarFaturasCreditoConexao(
      supabase as unknown as { from: (table: string) => any },
      [faturaId],
    )
  ).get(faturaId) ?? null;

  return NextResponse.json({
    ok: true,
    data: {
      fatura: faturaRow,
      conta,
      pessoa,
      contexto_titular: contextoTitular,
      pivot: (pivots ?? []) as PivotRow[],
      lancamentos: composicaoOperacional.ativos,
      lancamentos_auditoria: composicaoOperacional.auditoria,
      cobranca_vinculada: cobrancaVinculada
        ? {
            ...cobrancaVinculada,
            recebimentos_resumo: recebimentosCobrancaVinculada,
          }
        : null,
      cobranca_canonica: cobrancaCanonica
        ? {
            ...cobrancaCanonica,
            recebimentos_resumo: recebimentosCobrancaCanonica,
          }
        : null,
      pagamento_exibivel: pagamentoExibivel,
      validacao_origem: validacaoOrigem,
    },
  });
}
