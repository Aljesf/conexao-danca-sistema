import type { SupabaseClient } from "@supabase/supabase-js";
import {
  listarCarteiraOperacionalCanonica,
  type LinhaCarteiraCanonica,
} from "@/lib/financeiro/carteira-operacional-canonica";
import {
  formatarCompetenciaLabel,
  montarCobrancaKey,
  montarNeofinLabel,
  montarNeofinSituacaoLabel,
  type CobrancaOperacionalItem,
  type NeofinSituacaoOperacional,
  type NeofinStatusCobranca,
  type StatusOperacionalCobranca,
} from "@/lib/financeiro/creditoConexao/cobrancas";
import type { Database } from "@/types/supabase.generated";

type StatusNeofinFiltro = "TODOS" | "VINCULADA" | "NAO_VINCULADA" | "FALHA_INTEGRACAO";

export type ResolverCarteiraOperacionalPorCompetenciaInput = {
  competencia?: string | null;
  statusOperacional?: string | null;
  statusNeofin?: StatusNeofinFiltro;
  today?: Date;
};

function normalizarStatusOperacional(
  value: string | null | undefined,
): "PAGO" | "PENDENTE" | "VENCIDO" | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "PAGO") return "PAGO";
  if (normalized === "PENDENTE" || normalized === "PENDENTE_A_VENCER") return "PENDENTE";
  if (normalized === "VENCIDO" || normalized === "PENDENTE_VENCIDO") return "VENCIDO";
  return null;
}

function statusOperacionalLegado(value: LinhaCarteiraCanonica["statusOperacional"]): StatusOperacionalCobranca {
  if (value === "PAGO") return "PAGO";
  if (value === "VENCIDO") return "PENDENTE_VENCIDO";
  return "PENDENTE_A_VENCER";
}

function neofinSituacaoLegada(value: LinhaCarteiraCanonica["situacaoNeoFin"]): NeofinSituacaoOperacional {
  if (value === "EM_COBRANCA_NEOFIN") return "VINCULADA";
  return "NAO_VINCULADA";
}

function neofinStatusLegado(
  situacao: NeofinSituacaoOperacional,
  statusOperacional: StatusOperacionalCobranca,
): NeofinStatusCobranca {
  if (situacao === "VINCULADA") {
    return statusOperacional === "PAGO" ? "LIQUIDADA" : "EM_COBRANCA";
  }
  return "SEM_NEOFIN";
}

function aceitarLinhaPorStatusNeofin(
  linha: LinhaCarteiraCanonica,
  filtro: StatusNeofinFiltro | null | undefined,
): boolean {
  if (!filtro || filtro === "TODOS") return true;
  if (filtro === "VINCULADA") return linha.situacaoNeoFin === "EM_COBRANCA_NEOFIN";
  if (filtro === "NAO_VINCULADA") return linha.situacaoNeoFin !== "EM_COBRANCA_NEOFIN";
  return false;
}

function mapLinhaCanonica(item: LinhaCarteiraCanonica): CobrancaOperacionalItem {
  const statusOperacional = statusOperacionalLegado(item.statusOperacional);
  const neofinSituacao = neofinSituacaoLegada(item.situacaoNeoFin);
  const neofinStatus = neofinStatusLegado(neofinSituacao, statusOperacional);

  return {
    cobranca_id: item.cobrancaId,
    cobranca_fonte: "COBRANCA",
    cobranca_key: montarCobrancaKey("COBRANCA", item.cobrancaId),
    pessoa_id: item.pessoaId,
    pessoa_nome: item.pessoaNome,
    pessoa_label: item.pessoaLabel,
    competencia_ano_mes: item.competenciaAnoMes ?? "SEM_COMPETENCIA",
    competencia_label: item.competenciaLabel || formatarCompetenciaLabel(item.competenciaAnoMes),
    tipo_cobranca: "OUTRA",
    tipo_cobranca_label: "Cobranca oficial",
    data_vencimento: item.dataVencimento,
    valor_centavos: item.valorCentavos,
    valor_pago_centavos: item.valorPagoCentavos,
    saldo_centavos: item.saldoCentavos,
    saldo_aberto_centavos: item.saldoCentavos,
    valor_formatado: "",
    status_cobranca: item.statusCobranca,
    status_bruto: item.statusCobranca,
    status_operacional: statusOperacional,
    neofin_status: neofinStatus,
    neofin_label: montarNeofinLabel(neofinStatus),
    neofin_situacao_operacional: neofinSituacao,
    neofin_situacao_label: montarNeofinSituacaoLabel(neofinSituacao, neofinStatus),
    neofin_charge_id: null,
    neofin_invoice_id: item.neofinInvoiceId,
    origem_tipo: item.origemTipo,
    origem_subtipo: item.origemSubtipo,
    origem_referencia_label: item.origemLabel,
    dias_em_atraso: item.diasAtraso,
    fatura_id: item.faturaId,
    fatura_competencia: item.faturaCompetencia,
    fatura_status: item.faturaStatus,
    tipo_conta: "ALUNO",
    tipo_conta_label: "Conta Interna Aluno",
    permite_vinculo_manual: item.permiteVinculoManual,
    sugestao_competencia_vinculo: item.competenciaAnoMes,
    sugestao_fatura_ids: [],
    cobranca_url: item.cobrancaUrl,
    fatura_url: item.faturaUrl,
    data_pagamento: item.dataPagamento,
    link_pagamento: null,
    linha_digitavel: null,
  };
}

export async function resolverCarteiraOperacionalPorCompetencia(
  supabase: SupabaseClient<Database>,
  input: ResolverCarteiraOperacionalPorCompetenciaInput,
): Promise<CobrancaOperacionalItem[]> {
  const linhas = await listarCarteiraOperacionalCanonica(supabase, {
    competencia: input.competencia ?? undefined,
    statusOperacional: normalizarStatusOperacional(input.statusOperacional) ?? undefined,
  });

  return linhas
    .filter((linha) => aceitarLinhaPorStatusNeofin(linha, input.statusNeofin))
    .map((linha) => mapLinhaCanonica(linha));
}
