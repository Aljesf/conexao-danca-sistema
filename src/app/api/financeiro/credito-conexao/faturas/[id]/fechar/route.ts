import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { calcularDataVencimento } from "@/lib/financeiro/creditoConexao/vencimento";
import { getCobrancaProvider } from "@/lib/financeiro/cobranca/providers";
import type { CobrancaProviderCode } from "@/lib/financeiro/cobranca/providers/types";
import { buildDescricaoCobranca } from "@/lib/financeiro/cobranca/descricao";

type RouteContext = { params: Promise<{ id: string }> };

type Body = {
  vencimento_iso?: string;
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

type CobrancaRow = {
  id: number;
  neofin_charge_id: string | null;
};

const ORIGEM_TIPO_CANONICA = "FATURA_CREDITO_CONEXAO";
const ORIGEM_TIPOS_COMPATIVEIS = [ORIGEM_TIPO_CANONICA, "CREDITO_CONEXAO_FATURA"];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isStatusCheckError(errorMessage: string | null | undefined): boolean {
  const msg = (errorMessage ?? "").toLowerCase();
  return msg.includes("credito_conexao_faturas_status_chk") || msg.includes("check constraint");
}

function localTodayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function isValidIsoDate(input: string): boolean {
  if (!ISO_DATE_RE.test(input)) return false;
  const parsed = new Date(`${input}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === input;
}

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

async function calcularTotalEItens(supabase: any, faturaId: number, fallbackValorTotal: number) {
  const { data: vinculos, error: vincErr } = await supabase
    .from("credito_conexao_fatura_lancamentos")
    .select("lancamento:credito_conexao_lancamentos(valor_centavos,descricao)")
    .eq("fatura_id", faturaId);

  if (vincErr) throw new Error(vincErr.message);

  const itensDescricao: string[] = [];
  const totalVinculos = (vinculos ?? []).reduce((acc: number, row: any) => {
    const valor = Number(row?.lancamento?.valor_centavos ?? 0);
    const descricao = String(row?.lancamento?.descricao ?? "").trim();
    if (descricao) itensDescricao.push(descricao);
    return acc + (Number.isFinite(valor) ? valor : 0);
  }, 0);

  const valorFallback = Number(fallbackValorTotal);
  const total = totalVinculos > 0 ? Math.trunc(totalVinculos) : Math.max(Math.trunc(valorFallback || 0), 0);

  return {
    totalCentavos: total,
    itensDescricao,
  };
}

async function resolveCobrancaExistente(supabase: any, fatura: FaturaRow): Promise<CobrancaRow | null> {
  if (fatura.cobranca_id && Number.isFinite(Number(fatura.cobranca_id))) {
    const { data } = await supabase
      .from("cobrancas")
      .select("id,neofin_charge_id")
      .eq("id", Number(fatura.cobranca_id))
      .maybeSingle<CobrancaRow>();
    if (data) return data;
  }

  const { data } = await supabase
    .from("cobrancas")
    .select("id,neofin_charge_id")
    .in("origem_tipo", ORIGEM_TIPOS_COMPATIVEIS)
    .eq("origem_id", fatura.id)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle<CobrancaRow>();

  return data ?? null;
}

async function upsertCobrancaLocal(supabase: any, args: {
  cobrancaExistente: CobrancaRow | null;
  pessoaId: number;
  descricao: string;
  valorCentavos: number;
  vencimentoIso: string;
  faturaId: number;
}) {
  const payload = {
    pessoa_id: args.pessoaId,
    descricao: args.descricao,
    valor_centavos: args.valorCentavos,
    moeda: "BRL",
    vencimento: args.vencimentoIso,
    status: "PENDENTE",
    metodo_pagamento: "BOLETO",
    origem_tipo: ORIGEM_TIPO_CANONICA,
    origem_id: args.faturaId,
    updated_at: new Date().toISOString(),
  };

  if (args.cobrancaExistente?.id) {
    const { error } = await supabase
      .from("cobrancas")
      .update(payload)
      .eq("id", args.cobrancaExistente.id);
    if (error) throw new Error(`erro_atualizar_cobranca:${error.message}`);
    return args.cobrancaExistente.id;
  }

  const { data, error } = await supabase
    .from("cobrancas")
    .insert(payload)
    .select("id")
    .single<{ id: number }>();

  if (error || !data?.id) throw new Error(`erro_criar_cobranca:${error?.message ?? "sem_id"}`);
  return data.id;
}

async function updateFaturaComStatusCompativel(
  supabase: any,
  faturaId: number,
  payload: {
    cobranca_id: number;
    data_fechamento: string;
    data_vencimento: string;
    valor_total_centavos: number;
    updated_at: string;
  },
  statusDesejado: "FECHADA" | "ABERTA" | "PAGA",
): Promise<{ ok: true; statusAplicado: string } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("credito_conexao_faturas")
    .update({ ...payload, status: statusDesejado })
    .eq("id", faturaId)
    .select("status")
    .single();

  if (!error) {
    return { ok: true, statusAplicado: data?.status ?? statusDesejado };
  }

  if (statusDesejado === "FECHADA" && isStatusCheckError(error.message)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("credito_conexao_faturas")
      .update({ ...payload, status: "ABERTA" })
      .eq("id", faturaId)
      .select("status")
      .single();

    if (!fallbackError) {
      return { ok: true, statusAplicado: fallbackData?.status ?? "ABERTA" };
    }
    return { ok: false, error: fallbackError.message };
  }

  return { ok: false, error: error.message };
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  console.log("[HIT] POST /fechar", { id, ts: new Date().toISOString(), pid: process.pid });

  if (process.env.NODE_ENV !== "production") {
    const cookieStore = await cookies();
    console.log("[api fechar] cookies keys:", cookieStore.getAll().map((c) => c.name));
    console.log("[api fechar] request cookies keys:", request.cookies.getAll().map((c) => c.name));
  }

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "Sessao expirada. Faca login novamente." },
      { status: 401 },
    );
  }

  const denied = await guardApiByRole(request as any);
  if (denied) {
    if (denied.status === 401) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[api fechar] guardApiByRole retornou 401 apos requireUser bem-sucedido; seguindo com sessao valida.");
      }
    } else {
      return denied as any;
    }
  }

  const { supabase } = auth;
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "Sessao expirada. Faca login novamente." },
      { status: 401 },
    );
  }

  const faturaId = Number(id);
  if (!faturaId || Number.isNaN(faturaId)) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  const force = body.force === true;
  const salvarPreferencia = body.salvar_preferencia === true;
  const vencimentoManual = typeof body.vencimento_iso === "string" ? body.vencimento_iso.trim() : "";

  if (vencimentoManual && !isValidIsoDate(vencimentoManual)) {
    return NextResponse.json(
      { ok: false, error: "vencimento_iso_invalido", message: "Use o formato YYYY-MM-DD." },
      { status: 400 },
    );
  }

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

  const diaBody = Number(body.dia_vencimento);
  const diaInput = Number.isFinite(diaBody) ? clampDiaVencimento(diaBody) : null;
  const diaBase = diaInput ?? Number(fatura.conta?.dia_vencimento_preferido ?? fatura.conta?.dia_vencimento ?? 12);
  const diaCalculado = selecionarDiaPermitido(clampDiaVencimento(diaBase), cfgGlobal?.dias_permitidos_vencimento);
  const vencimentoCalculado = calcularDataVencimento({
    competenciaAnoMes: competencia,
    diaPreferido: diaCalculado,
    forcarUltimoVencimentoDia12: true,
  });

  const hojeIso = localTodayIso();
  if (!vencimentoManual && !force && vencimentoCalculado < hojeIso) {
    return NextResponse.json(
      {
        ok: false,
        error: "vencimento_calculado_no_passado",
        message: "Vencimento calculado ja passou. Informe vencimento_iso futuro para operacao manual.",
      },
      { status: 400 },
    );
  }

  const vencimentoEfetivo = vencimentoManual || vencimentoCalculado;
  if (!force && vencimentoEfetivo < hojeIso) {
    return NextResponse.json(
      {
        ok: false,
        error: "vencimento_iso_no_passado",
        message: "Informe um vencimento futuro para operacao manual.",
      },
      { status: 400 },
    );
  }

  if (salvarPreferencia) {
    const diaPreferencia =
      diaInput ??
      (vencimentoEfetivo ? Number(vencimentoEfetivo.split("-")[2]) : null);

    if (!diaPreferencia || diaPreferencia < 1 || diaPreferencia > 28) {
      return NextResponse.json(
        {
          ok: false,
          error: "dia_vencimento_preferencia_invalido",
          message: "Para salvar preferencia, o dia deve estar entre 1 e 28.",
        },
        { status: 400 },
      );
    }

    const { error: prefErr } = await supabase
      .from("credito_conexao_contas")
      .update({ dia_vencimento_preferido: diaPreferencia })
      .eq("id", fatura.conta_conexao_id);

    if (prefErr) {
      return NextResponse.json(
        { ok: false, error: "erro_salvar_preferencia_vencimento", detail: prefErr.message },
        { status: 500 },
      );
    }
  }

  let totalEItens: { totalCentavos: number; itensDescricao: string[] };
  try {
    totalEItens = await calcularTotalEItens(supabase, fatura.id, fatura.valor_total_centavos);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "erro_buscar_lancamentos_fatura", detail: err instanceof Error ? err.message : null },
      { status: 500 },
    );
  }

  if (totalEItens.totalCentavos <= 0) {
    return NextResponse.json({ ok: false, error: "fatura_sem_valor_para_cobranca" }, { status: 400 });
  }

  const descricao = buildDescricaoCobranca({
    contexto: "FATURA_CREDITO_CONEXAO",
    faturaId: fatura.id,
    periodo: competencia,
    itensDescricao: totalEItens.itensDescricao,
  });

  const providerCode = (cfgGlobal?.provider_ativo ?? "NEOFIN") as CobrancaProviderCode;
  let cobrancaExistente = await resolveCobrancaExistente(supabase, fatura);

  const cobrancaId = await upsertCobrancaLocal(supabase, {
    cobrancaExistente,
    pessoaId: Number(fatura.conta.pessoa_titular_id),
    descricao,
    valorCentavos: totalEItens.totalCentavos,
    vencimentoIso: vencimentoEfetivo,
    faturaId: fatura.id,
  });

  if (!cobrancaExistente || cobrancaExistente.id !== cobrancaId) {
    const { data: recarregada } = await supabase
      .from("cobrancas")
      .select("id,neofin_charge_id")
      .eq("id", cobrancaId)
      .maybeSingle<CobrancaRow>();
    cobrancaExistente = recarregada ?? null;
  }

  let neofinChargeId = cobrancaExistente?.neofin_charge_id ?? null;
  if (!neofinChargeId || force) {
    try {
      const provider = getCobrancaProvider(providerCode);
      const out = await provider.criarCobranca({
        pessoaId: Number(fatura.conta.pessoa_titular_id),
        descricao,
        valorCentavos: totalEItens.totalCentavos,
        vencimentoISO: vencimentoEfetivo,
        referenciaInterna: { tipo: "FATURA_CREDITO_CONEXAO", id: fatura.id },
      });
      neofinChargeId = out.providerCobrancaId;

      const { error: updProviderErr } = await supabase
        .from("cobrancas")
        .update({
          neofin_charge_id: out.providerCobrancaId,
          neofin_payload: out.payload ?? null,
          link_pagamento: out.linkPagamento ?? null,
          linha_digitavel: out.linhaDigitavel ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", cobrancaId);

      if (updProviderErr) {
        return NextResponse.json(
          { ok: false, error: "erro_salvar_cobranca_provider", detail: updProviderErr.message },
          { status: 500 },
        );
      }
    } catch (err) {
      return NextResponse.json(
        {
          ok: false,
          error: "erro_criar_cobranca_provider",
          detail: err instanceof Error ? err.message : "erro_provider_desconhecido",
        },
        { status: 502 },
      );
    }
  }

  const statusDesejado = fatura.status === "PAGA" ? "PAGA" : "FECHADA";
  const statusFatura = await updateFaturaComStatusCompativel(
    supabase,
    fatura.id,
    {
      cobranca_id: cobrancaId,
      data_fechamento: fatura.data_fechamento ?? localTodayIso(),
      data_vencimento: vencimentoEfetivo,
      valor_total_centavos: totalEItens.totalCentavos,
      updated_at: new Date().toISOString(),
    },
    statusDesejado,
  );

  if (!statusFatura.ok) {
    return NextResponse.json(
      { ok: false, error: "erro_atualizar_fatura", detail: statusFatura.error },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    fatura_id: fatura.id,
    status_fatura: statusFatura.statusAplicado,
    cobranca_id: cobrancaId,
    neofin_charge_id: neofinChargeId,
    vencimento_iso: vencimentoEfetivo,
  });
}
