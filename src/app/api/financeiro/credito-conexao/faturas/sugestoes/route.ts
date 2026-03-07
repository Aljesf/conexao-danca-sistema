import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import {
  formatarCompetenciaLabel,
  montarCobrancaOperacionalBase,
  type CobrancaFonteOperacional,
  type CobrancaOperacionalViewBase,
} from "@/lib/financeiro/creditoConexao/cobrancas";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type CobrancaLookupRow = CobrancaOperacionalViewBase & {
  origem_tipo: string | null;
  origem_subtipo: string | null;
  descricao: string | null;
};

type FaturaSugestaoRow = {
  id: number;
  periodo_referencia: string | null;
  status: string | null;
  data_vencimento: string | null;
  cobranca_id: number | null;
  neofin_invoice_id: string | null;
  conta: {
    id: number;
    tipo_conta: string | null;
    pessoa_titular_id: number | null;
    descricao_exibicao: string | null;
  } | null;
};

type SugestaoPayload = {
  fatura_id: number;
  competencia: string;
  competencia_label: string;
  status: string | null;
  data_vencimento: string | null;
  mesma_competencia: boolean;
  competencia_diferente: boolean;
  conta_label: string | null;
  neofin_invoice_id: string | null;
  cobranca_vinculada_id: number | null;
  ja_vinculada_nesta_fatura: boolean;
  pode_vincular: boolean;
  motivo_bloqueio: string | null;
};

const COBRANCA_SELECT = [
  "cobranca_id",
  "cobranca_fonte",
  "pessoa_id",
  "pessoa_nome",
  "pessoa_label",
  "competencia_ano_mes",
  "competencia_label",
  "tipo_cobranca",
  "data_vencimento",
  "valor_centavos",
  "valor_pago_centavos",
  "saldo_centavos",
  "saldo_aberto_centavos",
  "status_cobranca",
  "status_bruto",
  "status_operacional",
  "neofin_charge_id",
  "neofin_invoice_id",
  "neofin_situacao_operacional",
  "origem_tipo",
  "origem_subtipo",
  "origem_referencia_label",
  "dias_atraso",
  "fatura_id",
  "fatura_competencia",
  "fatura_status",
  "tipo_conta",
  "tipo_conta_label",
  "permite_vinculo_manual",
  "data_pagamento",
  "link_pagamento",
  "linha_digitavel",
  "descricao",
].join(",");

function toText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function isCompetencia(value: string | null | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

function competenciaToIndex(competencia: string): number {
  const [yearRaw, monthRaw] = competencia.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return Number.MAX_SAFE_INTEGER;
  return year * 12 + (month - 1);
}

function distanciaCompetencia(base: string, target: string): number {
  return Math.abs(competenciaToIndex(base) - competenciaToIndex(target));
}

function prioridadeStatusFatura(status: string | null): number {
  switch (toText(status)?.toUpperCase()) {
    case "ABERTA":
      return 0;
    case "FECHADA":
      return 1;
    case "EM_ATRASO":
      return 2;
    case "PAGA":
      return 3;
    case "CANCELADA":
      return 4;
    default:
      return 9;
  }
}

async function buscarCobranca(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  cobrancaId: number,
  cobrancaFonte: CobrancaFonteOperacional | null,
): Promise<CobrancaLookupRow | null> {
  let query = supabase
    .from("vw_financeiro_cobrancas_operacionais")
    .select(COBRANCA_SELECT)
    .eq("cobranca_id", cobrancaId)
    .eq("tipo_conta", "ALUNO");

  if (cobrancaFonte) {
    query = query.eq("cobranca_fonte", cobrancaFonte);
  }

  const { data, error } = await query.limit(cobrancaFonte ? 1 : 3);
  if (error) {
    throw new Error(`erro_buscar_cobranca:${error.message}`);
  }

  const rows = ((data ?? []) as unknown[]) as CobrancaLookupRow[];
  if (rows.length === 0) return null;
  if (!cobrancaFonte && rows.length > 1) {
    throw new Error("cobranca_fonte_obrigatoria");
  }

  return rows[0] ?? null;
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as Request);
  if (denied) return denied;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const cobrancaId = Number(url.searchParams.get("cobranca_id") ?? Number.NaN);
  const cobrancaFonteRaw = toText(url.searchParams.get("cobranca_fonte"))?.toUpperCase() ?? null;
  const cobrancaFonte =
    cobrancaFonteRaw === "COBRANCA_AVULSA"
      ? "COBRANCA_AVULSA"
      : cobrancaFonteRaw === "COBRANCA"
        ? "COBRANCA"
        : null;

  if (!Number.isFinite(cobrancaId) || cobrancaId <= 0) {
    return NextResponse.json({ ok: false, error: "cobranca_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  let cobrancaRow: CobrancaLookupRow | null = null;
  try {
    cobrancaRow = await buscarCobranca(supabase, Math.trunc(cobrancaId), cobrancaFonte);
  } catch (error) {
    if (error instanceof Error && error.message === "cobranca_fonte_obrigatoria") {
      return NextResponse.json(
        { ok: false, error: "cobranca_fonte_obrigatoria", message: "Informe a fonte da cobranca para evitar ambiguidade." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        error: "erro_buscar_cobranca",
        detail: error instanceof Error ? error.message : "erro_desconhecido",
      },
      { status: 500 },
    );
  }

  if (!cobrancaRow) {
    return NextResponse.json({ ok: false, error: "cobranca_nao_encontrada" }, { status: 404 });
  }

  const cobranca = montarCobrancaOperacionalBase(cobrancaRow);
  if (!cobranca.pessoa_id) {
    return NextResponse.json(
      { ok: false, error: "cobranca_sem_pessoa", message: "A cobranca nao possui pessoa vinculada para sugerir faturas." },
      { status: 400 },
    );
  }

  const { data: faturasData, error: faturasError } = await supabase
    .from("credito_conexao_faturas")
    .select(
      `
      id,
      periodo_referencia,
      status,
      data_vencimento,
      cobranca_id,
      neofin_invoice_id,
      conta:credito_conexao_contas!inner(
        id,
        tipo_conta,
        pessoa_titular_id,
        descricao_exibicao
      )
      `,
    )
    .eq("conta.tipo_conta", "ALUNO")
    .eq("conta.pessoa_titular_id", cobranca.pessoa_id)
    .order("periodo_referencia", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  if (faturasError) {
    return NextResponse.json(
      { ok: false, error: "erro_buscar_faturas", detail: faturasError.message },
      { status: 500 },
    );
  }

  const faturas = ((faturasData ?? []) as unknown[]) as FaturaSugestaoRow[];

  const sugestoes = [...faturas]
    .sort((a, b) => {
      const aCompetencia = isCompetencia(a.periodo_referencia)
        ? a.periodo_referencia
        : a.data_vencimento?.slice(0, 7) ?? cobranca.competencia_ano_mes;
      const bCompetencia = isCompetencia(b.periodo_referencia)
        ? b.periodo_referencia
        : b.data_vencimento?.slice(0, 7) ?? cobranca.competencia_ano_mes;
      const aMesmaCompetencia = aCompetencia === cobranca.competencia_ano_mes ? 0 : 1;
      const bMesmaCompetencia = bCompetencia === cobranca.competencia_ano_mes ? 0 : 1;
      if (aMesmaCompetencia !== bMesmaCompetencia) return aMesmaCompetencia - bMesmaCompetencia;

      const byDistance = distanciaCompetencia(cobranca.competencia_ano_mes, aCompetencia)
        - distanciaCompetencia(cobranca.competencia_ano_mes, bCompetencia);
      if (byDistance !== 0) return byDistance;

      const byStatus = prioridadeStatusFatura(a.status) - prioridadeStatusFatura(b.status);
      if (byStatus !== 0) return byStatus;

      return b.id - a.id;
    })
    .map<SugestaoPayload>((fatura) => {
      const competenciaFatura = isCompetencia(fatura.periodo_referencia)
        ? fatura.periodo_referencia
        : fatura.data_vencimento?.slice(0, 7) ?? cobranca.competencia_ano_mes;
      const mesmaCompetencia = competenciaFatura === cobranca.competencia_ano_mes;
      const statusNormalizado = toText(fatura.status)?.toUpperCase() ?? null;
      const jaVinculadaNestaFatura = cobranca.fatura_id === fatura.id;
      const podeVincular = statusNormalizado !== "CANCELADA" && statusNormalizado !== "PAGA";
      const motivoBloqueio =
        !podeVincular
          ? "Fatura fechada para vinculo operacional."
          : typeof fatura.cobranca_id === "number"
            && fatura.cobranca_id !== cobranca.cobranca_id
            && cobranca.cobranca_fonte === "COBRANCA"
              ? `Fatura ja vinculada a cobranca #${fatura.cobranca_id}.`
              : null;

      return {
        fatura_id: fatura.id,
        competencia: competenciaFatura,
        competencia_label: formatarCompetenciaLabel(competenciaFatura),
        status: fatura.status,
        data_vencimento: fatura.data_vencimento,
        mesma_competencia: mesmaCompetencia,
        competencia_diferente: !mesmaCompetencia,
        conta_label: toText(fatura.conta?.descricao_exibicao),
        neofin_invoice_id: toText(fatura.neofin_invoice_id),
        cobranca_vinculada_id: typeof fatura.cobranca_id === "number" ? fatura.cobranca_id : null,
        ja_vinculada_nesta_fatura: jaVinculadaNestaFatura,
        pode_vincular: podeVincular && motivoBloqueio === null,
        motivo_bloqueio: motivoBloqueio,
      };
    });

  return NextResponse.json(
    {
      ok: true,
      cobranca: {
        cobranca_id: cobranca.cobranca_id,
        cobranca_fonte: cobranca.cobranca_fonte,
        cobranca_key: cobranca.cobranca_key,
        pessoa_label: cobranca.pessoa_label,
        competencia_ano_mes: cobranca.competencia_ano_mes,
        competencia_label: cobranca.competencia_label,
        tipo_cobranca_label: cobranca.tipo_cobranca_label,
        valor_centavos: cobranca.valor_centavos,
        saldo_centavos: cobranca.saldo_centavos,
        fatura_id_atual: cobranca.fatura_id,
      },
      sugestoes,
    },
    { status: 200 },
  );
}
