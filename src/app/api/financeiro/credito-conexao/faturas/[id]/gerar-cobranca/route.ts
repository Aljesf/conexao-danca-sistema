import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { calcularDataVencimento } from "@/lib/financeiro/creditoConexao/vencimento";
import type { CobrancaProviderCode } from "@/lib/financeiro/cobranca/providers/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { processarCobrancaCanonicaFatura } from "@/lib/credito-conexao/processarCobrancaCanonicaFatura";

type RouteContext = { params: Promise<{ id: string }> };

type Body = {
  vencimento_iso?: string;
  dia_vencimento?: number;
  salvar_preferencia?: boolean;
  force?: boolean;
};

type ContaRow = {
  tipo_conta: string | null;
  pessoa_titular_id: number | null;
  dia_vencimento: number | null;
  dia_vencimento_preferido: number | null;
};

type FaturaRow = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string;
  status: string;
  data_fechamento: string | null;
  data_vencimento: string | null;
  valor_total_centavos: number;
  cobranca_id: number | null;
};

type ConfigCobrancaRow = {
  provider_ativo: string | null;
  dias_permitidos_vencimento: number[] | null;
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;

  const auth = await requireUser(request);
  if (auth instanceof NextResponse) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "Sessao expirada. Faca login novamente." },
      { status: 401 },
    );
  }

  let denied: NextResponse | null = null;
  try {
    denied = await guardApiByRole(request as any);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "forbidden",
        message: "Sem permissao para gerar cobranca neste contexto/role.",
      },
      { status: 403 },
    );
  }

  if (denied) {
    if (denied.status === 401) {
      return NextResponse.json(
        { ok: false, error: "unauthorized", message: "Sessao expirada. Faca login novamente." },
        { status: 401 },
      );
    }
    return denied as any;
  }

  const supabaseUser = auth.supabase;
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "Sessao expirada. Faca login novamente." },
      { status: 401 },
    );
  }
  const supabaseAdmin = createAdminClient();

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

  const { data: fatura, error: faturaErr } = await supabaseAdmin
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
      cobranca_id
    `,
    )
    .eq("id", faturaId)
    .maybeSingle<FaturaRow>();

  if (faturaErr) {
    return NextResponse.json(
      { ok: false, error: "erro_buscar_fatura", detail: faturaErr.message },
      { status: 500 },
    );
  }

  if (!fatura) {
    return NextResponse.json(
      { ok: false, error: "not_found", message: "Fatura nao encontrada" },
      { status: 404 },
    );
  }

  const { data: conta, error: contaErr } = await supabaseAdmin
    .from("credito_conexao_contas")
    .select("tipo_conta,pessoa_titular_id,dia_vencimento,dia_vencimento_preferido")
    .eq("id", fatura.conta_conexao_id)
    .maybeSingle<ContaRow>();

  if (contaErr) {
    return NextResponse.json(
      { ok: false, error: "erro_buscar_conta_fatura", detail: contaErr.message },
      { status: 500 },
    );
  }

  if (!conta?.pessoa_titular_id) {
    return NextResponse.json({ ok: false, error: "titular_indefinido" }, { status: 500 });
  }

  if (conta?.tipo_conta === "COLABORADOR") {
    return NextResponse.json(
      { ok: false, error: "conta_colaborador_sem_cobranca_externa" },
      { status: 409 },
    );
  }

  const competencia = String(fatura.periodo_referencia ?? "");
  if (!/^\d{4}-\d{2}$/.test(competencia)) {
    return NextResponse.json({ ok: false, error: "periodo_referencia_invalido" }, { status: 400 });
  }

  const { data: cfgGlobal } = await supabaseAdmin
    .from("financeiro_config_cobranca")
    .select("provider_ativo,dias_permitidos_vencimento")
    .is("unidade_id", null)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle<ConfigCobrancaRow>();

  const diaBody = Number(body.dia_vencimento);
  const diaInput = Number.isFinite(diaBody) ? clampDiaVencimento(diaBody) : null;
  const diaBase = diaInput ?? Number(conta?.dia_vencimento_preferido ?? conta?.dia_vencimento ?? 12);
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

    const { error: prefErr } = await supabaseAdmin
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

  const providerCode = (cfgGlobal?.provider_ativo ?? "NEOFIN") as CobrancaProviderCode;
  const resultado = await processarCobrancaCanonicaFatura({
    supabase: supabaseAdmin,
    fatura: {
      id: fatura.id,
      status: fatura.status,
      valor_total_centavos: fatura.valor_total_centavos,
    },
    conta: {
      pessoa_titular_id: conta.pessoa_titular_id,
    },
    competencia,
    vencimentoEfetivo,
    providerCode,
    force,
  });

  if (!resultado.ok) {
    return NextResponse.json(resultado.body, { status: resultado.status });
  }

  return NextResponse.json({
    ok: true,
    ...resultado.data,
  });
}
