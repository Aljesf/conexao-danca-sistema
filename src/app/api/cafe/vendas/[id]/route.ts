import { NextResponse, type NextRequest } from "next/server";
import { PUT } from "@/app/api/cafe/caixa/[id]/route";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { detalharComandaCafe } from "@/lib/cafe/caixa";
import { resolverCentroCustoCafe } from "@/lib/cafe/financeiro";
import {
  formatCafeFormaPagamento,
  formatCafePerfilResolvido,
  formatCafeVendaNumeroLegivel,
  type CafeVendaRecibo,
  type CafeVendaReciboItem,
} from "@/lib/cafe/venda-recibo";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type RouteContext = { params: Promise<{ id: string }> };

type VendaDetalheRow = Record<string, unknown> & {
  id: number;
  created_at?: string | null;
  data_operacao?: string | null;
  data_competencia?: string | null;
  competencia_ano_mes?: string | null;
  pagador_pessoa_id?: number | null;
  comprador_pessoa_id?: number | null;
  comprador_tipo?: string | null;
  colaborador_pessoa_id?: number | null;
  pagador_nome?: string | null;
  colaborador_nome?: string | null;
  forma_pagamento?: string | null;
  tabela_preco_id?: number | null;
  centro_custo_id?: number | null;
  valor_total_centavos?: number | null;
  cobranca_id?: number | null;
  conta_conexao_id?: number | null;
  fatura?: Record<string, unknown> | null;
  cafe_venda_itens?: Array<Record<string, unknown>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value.trim() || null : null;
}

function parseId(value: string): number {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) throw new Error("venda_id_invalido");
  return Math.trunc(id);
}

function statusFromError(message: string): number {
  switch (message) {
    case "venda_id_invalido":
      return 400;
    case "venda_nao_encontrada":
      return 404;
    default:
      return 500;
  }
}

function inferirPerfilResolvido(venda: VendaDetalheRow): string | null {
  const tipoComprador = asString(venda.comprador_tipo);
  if (tipoComprador) return formatCafePerfilResolvido(tipoComprador);
  if (asInt(venda.colaborador_pessoa_id)) return "Colaborador";
  if (asInt(venda.comprador_pessoa_id) ?? asInt(venda.pagador_pessoa_id)) return "Pessoa avulsa";
  return "Nao identificado";
}

function resolverComprador(venda: VendaDetalheRow) {
  const pessoaId =
    asInt(venda.comprador_pessoa_id) ??
    asInt(venda.pagador_pessoa_id) ??
    asInt(venda.colaborador_pessoa_id);
  const nome =
    asString(venda.colaborador_nome) ??
    asString(venda.pagador_nome) ??
    null;

  return {
    pessoa_id: pessoaId,
    nome,
  };
}

function resolverCompetencia(venda: VendaDetalheRow): string | null {
  const competenciaAnoMes = asString(venda.competencia_ano_mes);
  if (competenciaAnoMes) return competenciaAnoMes;

  const dataCompetencia = asString(venda.data_competencia);
  if (dataCompetencia && /^\d{4}-\d{2}-\d{2}$/.test(dataCompetencia)) {
    return dataCompetencia.slice(0, 7);
  }
  if (dataCompetencia && /^\d{4}-\d{2}$/.test(dataCompetencia)) {
    return dataCompetencia;
  }

  const fatura = isRecord(venda.fatura) ? venda.fatura : null;
  return asString(fatura?.periodo_referencia) ?? null;
}

async function resolverTabelaPrecoNome(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  tabelaPrecoId: number | null,
): Promise<string | null> {
  if (!tabelaPrecoId) return null;

  const { data, error } = await supabase
    .from("cafe_tabelas_preco")
    .select("id,nome")
    .eq("id", tabelaPrecoId)
    .maybeSingle();

  if (error) throw error;
  return data && isRecord(data) ? asString(data.nome) : null;
}

async function resolverCentroCusto(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  venda: VendaDetalheRow,
): Promise<{ id: number | null; nome: string | null }> {
  const centroCustoId = asInt(venda.centro_custo_id) ?? (await resolverCentroCustoCafe(supabase).catch(() => null));
  if (!centroCustoId) {
    return { id: null, nome: null };
  }

  const { data, error } = await supabase
    .from("centros_custo")
    .select("id,nome")
    .eq("id", centroCustoId)
    .maybeSingle();

  if (error) throw error;

  return {
    id: centroCustoId,
    nome: data && isRecord(data) ? asString(data.nome) : null,
  };
}

async function resolverContaInternaId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  venda: VendaDetalheRow,
): Promise<number | null> {
  const contaIdDireta = asInt(venda.conta_conexao_id);
  if (contaIdDireta) return contaIdDireta;

  const cobrancaId = asInt(venda.cobranca_id);
  if (!cobrancaId) return null;

  const { data, error } = await supabase
    .from("credito_conexao_lancamentos")
    .select("conta_conexao_id")
    .eq("cobranca_id", cobrancaId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data && isRecord(data) ? asInt(data.conta_conexao_id) : null;
}

async function resolverItens(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  venda: VendaDetalheRow,
): Promise<CafeVendaReciboItem[]> {
  const itensBrutos = Array.isArray(venda.cafe_venda_itens)
    ? venda.cafe_venda_itens.filter(isRecord)
    : [];

  const produtoIds = Array.from(
    new Set(
      itensBrutos
        .map((item) => asInt(item.produto_id))
        .filter((value): value is number => typeof value === "number" && value > 0),
    ),
  );

  const produtosPorId = new Map<number, string>();
  if (produtoIds.length > 0) {
    const { data, error } = await supabase
      .from("cafe_produtos")
      .select("id,nome")
      .in("id", produtoIds);

    if (error) throw error;

    for (const produto of (data ?? []).filter(isRecord)) {
      const produtoId = asInt(produto.id);
      const nome = asString(produto.nome);
      if (produtoId && nome) produtosPorId.set(produtoId, nome);
    }
  }

  return itensBrutos.map((item) => {
    const produtoId = asInt(item.produto_id);
    const quantidade = asInt(item.quantidade) ?? 0;
    const valorUnitarioCentavos = asInt(item.valor_unitario_centavos) ?? 0;
    const subtotalCentavos =
      asInt(item.valor_total_centavos) ?? quantidade * valorUnitarioCentavos;
    const produtoNome =
      (produtoId ? produtosPorId.get(produtoId) : null) ??
      asString(item.descricao_snapshot) ??
      (produtoId ? `Produto #${produtoId}` : "Item do Cafe");

    return {
      produto_id: produtoId,
      produto_nome: produtoNome,
      quantidade,
      valor_unitario_centavos: valorUnitarioCentavos,
      subtotal_centavos: subtotalCentavos,
    };
  });
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  const denied = await guardApiByRole(request);
  if (denied) return denied;

  try {
    const { id } = await ctx.params;
    const supabase = getSupabaseAdmin();
    const venda = (await detalharComandaCafe(supabase, parseId(id))) as VendaDetalheRow;

    const [itens, tabelaPrecoNome, centroCusto, contaInternaId] = await Promise.all([
      resolverItens(supabase, venda),
      resolverTabelaPrecoNome(supabase, asInt(venda.tabela_preco_id)),
      resolverCentroCusto(supabase, venda),
      resolverContaInternaId(supabase, venda),
    ]);

    const comprador = resolverComprador(venda);
    const fatura = isRecord(venda.fatura) ? venda.fatura : null;
    const response: CafeVendaRecibo = {
      id: venda.id,
      numero_legivel: formatCafeVendaNumeroLegivel(venda.id),
      created_at: asString(venda.created_at) ?? asString(venda.data_operacao) ?? new Date().toISOString(),
      competencia: resolverCompetencia(venda),
      comprador,
      perfil_resolvido: inferirPerfilResolvido(venda),
      forma_pagamento: formatCafeFormaPagamento(asString(venda.forma_pagamento)),
      tabela_preco: tabelaPrecoNome,
      centro_custo: centroCusto,
      total_centavos: asInt(venda.valor_total_centavos) ?? 0,
      cobranca_id: asInt(venda.cobranca_id),
      fatura_id: asInt(fatura?.id),
      conta_interna_id: contaInternaId,
      itens,
    };

    return NextResponse.json({ ok: true, venda: response }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_buscar_venda_cafe";
    console.error("[CAFE_VENDAS][DETALHE][ERRO]", error);
    return NextResponse.json(
      { ok: false, error: message, detalhe: message },
      { status: statusFromError(message) },
    );
  }
}

export { PUT };
