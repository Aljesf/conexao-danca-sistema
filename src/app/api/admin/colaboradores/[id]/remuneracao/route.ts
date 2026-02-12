import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type RemuneracaoRow = {
  id: number;
  colaborador_id: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  salario_base_centavos: number;
  moeda: string;
  dia_pagamento_padrao: number | null;
  conta_financeira_padrao_id: number | null;
  ativo: boolean;
  created_at: string;
};

type ContaFinanceiraRow = {
  id: number;
  nome: string;
  codigo: string;
};

type RemuneracaoResponse = RemuneracaoRow & {
  conta_financeira_padrao: ContaFinanceiraRow | null;
};

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function colaboradorExiste(supabase: ReturnType<typeof getSupabaseAdmin>, colaboradorId: number): Promise<boolean> {
  const { data, error } = await supabase.from("colaboradores").select("id").eq("id", colaboradorId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function carregarContas(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  contaIds: number[],
): Promise<Map<number, ContaFinanceiraRow>> {
  if (contaIds.length === 0) return new Map<number, ContaFinanceiraRow>();

  const { data, error } = await supabase
    .from("contas_financeiras")
    .select("id,nome,codigo")
    .in("id", contaIds);

  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.id as number, row as ContaFinanceiraRow]));
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const colaboradorId = toInt(ctx.params.id);

  if (!colaboradorId || colaboradorId <= 0) {
    return NextResponse.json({ ok: false, error: "colaborador_id_invalido" }, { status: 400 });
  }

  try {
    const existe = await colaboradorExiste(supabase, colaboradorId);
    if (!existe) {
      return NextResponse.json({ ok: false, error: "colaborador_nao_encontrado" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("colaborador_remuneracoes")
      .select(
        "id,colaborador_id,vigencia_inicio,vigencia_fim,salario_base_centavos,moeda,dia_pagamento_padrao,conta_financeira_padrao_id,ativo,created_at",
      )
      .eq("colaborador_id", colaboradorId)
      .order("ativo", { ascending: false })
      .order("vigencia_inicio", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: "falha_listar_remuneracoes", detail: error.message },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as RemuneracaoRow[];
    const contaIds = Array.from(
      new Set(rows.map((row) => row.conta_financeira_padrao_id).filter((id): id is number => typeof id === "number")),
    );

    const contasMap = await carregarContas(supabase, contaIds);

    const historico: RemuneracaoResponse[] = rows.map((row) => ({
      ...row,
      conta_financeira_padrao:
        typeof row.conta_financeira_padrao_id === "number"
          ? (contasMap.get(row.conta_financeira_padrao_id) ?? null)
          : null,
    }));

    const ativa = historico.find((row) => row.ativo) ?? null;

    return NextResponse.json({ ok: true, data: { ativa, historico } });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: "falha_listar_remuneracoes", detail }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const colaboradorId = toInt(ctx.params.id);

  if (!colaboradorId || colaboradorId <= 0) {
    return NextResponse.json({ ok: false, error: "colaborador_id_invalido" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const vigenciaInicio = typeof body.vigencia_inicio === "string" ? body.vigencia_inicio : "";
  const vigenciaFimRaw = typeof body.vigencia_fim === "string" ? body.vigencia_fim : null;
  const vigenciaFim = vigenciaFimRaw && vigenciaFimRaw.trim() !== "" ? vigenciaFimRaw : null;
  const salarioBaseCentavos = toInt(body.salario_base_centavos);
  const diaPagamentoPadrao = toInt(body.dia_pagamento_padrao);
  const contaFinanceiraPadraoId = toInt(body.conta_financeira_padrao_id);

  if (!isIsoDate(vigenciaInicio)) {
    return NextResponse.json({ ok: false, error: "vigencia_inicio_invalida" }, { status: 400 });
  }

  if (vigenciaFim && !isIsoDate(vigenciaFim)) {
    return NextResponse.json({ ok: false, error: "vigencia_fim_invalida" }, { status: 400 });
  }

  if (vigenciaFim && vigenciaFim < vigenciaInicio) {
    return NextResponse.json({ ok: false, error: "vigencia_fim_menor_que_inicio" }, { status: 400 });
  }

  if (salarioBaseCentavos === null || salarioBaseCentavos < 0) {
    return NextResponse.json({ ok: false, error: "salario_base_centavos_invalido" }, { status: 400 });
  }

  if (diaPagamentoPadrao !== null && (diaPagamentoPadrao < 1 || diaPagamentoPadrao > 31)) {
    return NextResponse.json({ ok: false, error: "dia_pagamento_padrao_invalido" }, { status: 400 });
  }

  try {
    const existe = await colaboradorExiste(supabase, colaboradorId);
    if (!existe) {
      return NextResponse.json({ ok: false, error: "colaborador_nao_encontrado" }, { status: 404 });
    }

    if (contaFinanceiraPadraoId !== null) {
      const { data: conta, error: contaError } = await supabase
        .from("contas_financeiras")
        .select("id")
        .eq("id", contaFinanceiraPadraoId)
        .maybeSingle();

      if (contaError) {
        return NextResponse.json(
          { ok: false, error: "falha_validar_conta_financeira", detail: contaError.message },
          { status: 500 },
        );
      }

      if (!conta) {
        return NextResponse.json({ ok: false, error: "conta_financeira_invalida" }, { status: 409 });
      }
    }

    const { error: desativarError } = await supabase
      .from("colaborador_remuneracoes")
      .update({ ativo: false })
      .eq("colaborador_id", colaboradorId)
      .eq("ativo", true);

    if (desativarError) {
      return NextResponse.json(
        { ok: false, error: "falha_desativar_remuneracao_ativa", detail: desativarError.message },
        { status: 500 },
      );
    }

    const { data: novaRemuneracao, error: insertError } = await supabase
      .from("colaborador_remuneracoes")
      .insert({
        colaborador_id: colaboradorId,
        vigencia_inicio: vigenciaInicio,
        vigencia_fim: vigenciaFim,
        salario_base_centavos: salarioBaseCentavos,
        dia_pagamento_padrao: diaPagamentoPadrao,
        conta_financeira_padrao_id: contaFinanceiraPadraoId,
        ativo: true,
      })
      .select(
        "id,colaborador_id,vigencia_inicio,vigencia_fim,salario_base_centavos,moeda,dia_pagamento_padrao,conta_financeira_padrao_id,ativo,created_at",
      )
      .single();

    if (insertError || !novaRemuneracao) {
      const detail = insertError?.message ?? "sem_retorno";
      const status = detail.includes("idx_colaborador_remuneracoes_unica_ativa") ? 409 : 500;
      return NextResponse.json(
        { ok: false, error: "falha_criar_remuneracao", detail },
        { status },
      );
    }

    let conta: ContaFinanceiraRow | null = null;
    if (typeof novaRemuneracao.conta_financeira_padrao_id === "number") {
      const { data: contaRow } = await supabase
        .from("contas_financeiras")
        .select("id,nome,codigo")
        .eq("id", novaRemuneracao.conta_financeira_padrao_id)
        .maybeSingle();
      conta = (contaRow as ContaFinanceiraRow | null) ?? null;
    }

    const data: RemuneracaoResponse = {
      ...(novaRemuneracao as RemuneracaoRow),
      conta_financeira_padrao: conta,
    };

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro_desconhecido";
    return NextResponse.json({ ok: false, error: "falha_salvar_remuneracao", detail }, { status: 500 });
  }
}