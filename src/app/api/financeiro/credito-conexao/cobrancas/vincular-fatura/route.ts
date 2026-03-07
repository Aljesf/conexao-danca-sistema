import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { logAuditoria } from "@/lib/auditoriaLog";
import {
  montarCobrancaOperacionalBase,
  type CobrancaFonteOperacional,
  type CobrancaOperacionalViewBase,
} from "@/lib/financeiro/creditoConexao/cobrancas";
import { requireUser } from "@/lib/supabase/api-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type Body = {
  cobranca_id?: number;
  cobranca_fonte?: CobrancaFonteOperacional | string | null;
  fatura_id?: number;
  confirmar_competencia_diferente?: boolean;
};

type CobrancaLookupRow = CobrancaOperacionalViewBase & {
  origem_tipo: string | null;
  origem_subtipo: string | null;
  descricao: string | null;
};

type FaturaAlvoRow = {
  id: number;
  periodo_referencia: string | null;
  status: string | null;
  cobranca_id: number | null;
  conta: {
    id: number;
    tipo_conta: string | null;
    pessoa_titular_id: number | null;
    descricao_exibicao: string | null;
  } | null;
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

function extractIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as Request);
  if (denied) return denied;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => null)) as Body | null;
  const cobrancaId = Number(body?.cobranca_id ?? Number.NaN);
  const faturaId = Number(body?.fatura_id ?? Number.NaN);
  const confirmarCompetenciaDiferente = body?.confirmar_competencia_diferente === true;
  const cobrancaFonteRaw = toText(body?.cobranca_fonte as string | null | undefined)?.toUpperCase() ?? null;
  const cobrancaFonte =
    cobrancaFonteRaw === "COBRANCA_AVULSA"
      ? "COBRANCA_AVULSA"
      : cobrancaFonteRaw === "COBRANCA"
        ? "COBRANCA"
        : null;

  if (!Number.isFinite(cobrancaId) || cobrancaId <= 0) {
    return NextResponse.json({ ok: false, error: "cobranca_id_invalido" }, { status: 400 });
  }

  if (!Number.isFinite(faturaId) || faturaId <= 0) {
    return NextResponse.json({ ok: false, error: "fatura_id_invalido" }, { status: 400 });
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
      { ok: false, error: "cobranca_sem_pessoa", message: "A cobranca nao possui pessoa vinculada." },
      { status: 400 },
    );
  }

  if (cobranca.status_operacional === "PAGO" || cobranca.saldo_centavos <= 0) {
    return NextResponse.json(
      { ok: false, error: "cobranca_quitada", message: "Nao e possivel vincular uma cobranca quitada integralmente." },
      { status: 409 },
    );
  }

  const { data: faturaData, error: faturaError } = await supabase
    .from("credito_conexao_faturas")
    .select(
      `
      id,
      periodo_referencia,
      status,
      cobranca_id,
      conta:credito_conexao_contas!inner(
        id,
        tipo_conta,
        pessoa_titular_id,
        descricao_exibicao
      )
      `,
    )
    .eq("id", Math.trunc(faturaId))
    .maybeSingle();

  if (faturaError) {
    return NextResponse.json(
      { ok: false, error: "erro_buscar_fatura", detail: faturaError.message },
      { status: 500 },
    );
  }

  const fatura = (faturaData as FaturaAlvoRow | null) ?? null;
  if (!fatura) {
    return NextResponse.json({ ok: false, error: "fatura_nao_encontrada" }, { status: 404 });
  }

  if (toText(fatura.conta?.tipo_conta)?.toUpperCase() !== "ALUNO") {
    return NextResponse.json(
      { ok: false, error: "fatura_fora_do_escopo", message: "A fatura informada nao pertence a Conta Interna Aluno." },
      { status: 400 },
    );
  }

  if (fatura.conta?.pessoa_titular_id !== cobranca.pessoa_id) {
    return NextResponse.json(
      { ok: false, error: "pessoa_incompativel", message: "A fatura nao pertence a mesma pessoa da cobranca." },
      { status: 409 },
    );
  }

  const statusFatura = toText(fatura.status)?.toUpperCase() ?? null;
  if (statusFatura === "PAGA" || statusFatura === "CANCELADA") {
    return NextResponse.json(
      { ok: false, error: "fatura_bloqueada", message: "A fatura escolhida nao aceita novo vinculo operacional." },
      { status: 409 },
    );
  }

  const competenciaFatura = toText(fatura.periodo_referencia);
  if (competenciaFatura && competenciaFatura !== cobranca.competencia_ano_mes && !confirmarCompetenciaDiferente) {
    return NextResponse.json(
      {
        ok: false,
        error: "confirmacao_competencia_diferente_necessaria",
        message: "A fatura pertence a outra competencia. Confirme explicitamente para prosseguir.",
      },
      { status: 409 },
    );
  }

  const timestamp = new Date().toISOString();
  const ip = extractIp(req);
  const userAgent = req.headers.get("user-agent");

  if (cobranca.cobranca_fonte === "COBRANCA") {
    if (typeof fatura.cobranca_id === "number" && fatura.cobranca_id !== cobranca.cobranca_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "fatura_ocupada_por_outra_cobranca",
          message: `A fatura ja esta vinculada a cobranca #${fatura.cobranca_id}.`,
        },
        { status: 409 },
      );
    }

    const { data: vinculosAtuais, error: vinculosAtuaisError } = await supabase
      .from("credito_conexao_faturas")
      .select("id")
      .eq("cobranca_id", cobranca.cobranca_id);

    if (vinculosAtuaisError) {
      return NextResponse.json(
        { ok: false, error: "erro_buscar_vinculos_atuais", detail: vinculosAtuaisError.message },
        { status: 500 },
      );
    }

    const faturasAnteriores = ((vinculosAtuais ?? []) as Array<{ id: number }>).map((item) => item.id);
    const faturasParaLimpar = faturasAnteriores.filter((id) => id !== fatura.id);

    if (faturasParaLimpar.length > 0) {
      const { error: limparError } = await supabase
        .from("credito_conexao_faturas")
        .update({ cobranca_id: null })
        .in("id", faturasParaLimpar);

      if (limparError) {
        return NextResponse.json(
          { ok: false, error: "erro_limpar_vinculos_anteriores", detail: limparError.message },
          { status: 500 },
        );
      }
    }

    if (fatura.cobranca_id !== cobranca.cobranca_id) {
      const { error: vincularError } = await supabase
        .from("credito_conexao_faturas")
        .update({ cobranca_id: cobranca.cobranca_id })
        .eq("id", fatura.id);

      if (vincularError) {
        return NextResponse.json(
          { ok: false, error: "erro_vincular_cobranca", detail: vincularError.message },
          { status: 500 },
        );
      }
    }
  } else {
    const { error: vincularAvulsaError } = await supabase
      .from("credito_conexao_faturas_cobrancas_avulsas")
      .upsert(
        {
          cobranca_avulsa_id: cobranca.cobranca_id,
          fatura_id: fatura.id,
          confirmado_competencia_diferente: confirmarCompetenciaDiferente,
          criado_por_user_id: auth.userId,
          updated_at: timestamp,
        },
        { onConflict: "cobranca_avulsa_id" },
      );

    if (vincularAvulsaError) {
      return NextResponse.json(
        { ok: false, error: "erro_vincular_cobranca_avulsa", detail: vincularAvulsaError.message },
        { status: 500 },
      );
    }
  }

  const auditoria = await logAuditoria({
    usuario_id: auth.userId,
    entidade: cobranca.cobranca_fonte === "COBRANCA_AVULSA" ? "financeiro_cobrancas_avulsas" : "cobrancas",
    entidade_id: cobranca.cobranca_id,
    acao: "VINCULAR_FATURA_CREDITO_CONEXAO",
    descricao: `Cobranca ${cobranca.cobranca_key} vinculada manualmente a fatura #${fatura.id}.`,
    dados_anteriores: {
      fatura_id_anterior: cobranca.fatura_id,
      competencia_anterior: cobranca.fatura_competencia,
    },
    dados_novos: {
      fatura_id_novo: fatura.id,
      competencia_nova: competenciaFatura,
      confirmar_competencia_diferente: confirmarCompetenciaDiferente,
    },
    ip,
    user_agent: userAgent,
  });

  if (auditoria.error) {
    return NextResponse.json(
      {
        ok: false,
        error: "erro_auditoria_vinculo",
        message: "O vinculo foi salvo, mas a auditoria falhou. Revise os logs antes de seguir.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      message: "Vinculo manual registrado com sucesso.",
      cobranca: {
        cobranca_id: cobranca.cobranca_id,
        cobranca_fonte: cobranca.cobranca_fonte,
        cobranca_key: cobranca.cobranca_key,
        pessoa_label: cobranca.pessoa_label,
        competencia_ano_mes: cobranca.competencia_ano_mes,
      },
      fatura: {
        fatura_id: fatura.id,
        competencia: competenciaFatura,
        status: fatura.status,
        conta_label: toText(fatura.conta?.descricao_exibicao),
      },
    },
    { status: 200 },
  );
}
