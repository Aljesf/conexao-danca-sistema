import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import {
  ensureFaturaAberta,
  getPeriodoReferencia,
  recalcularComprasFatura,
  vincularLancamentoNaFatura,
} from "@/lib/financeiro/creditoConexaoFaturas";

type IncluirPendenciasPayload = {
  conta_conexao_id?: number;
  periodo_referencia?: string | null;
  incluir_origens?: string[] | null;
};

const DEFAULT_ORIGENS = ["LOJA"];

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "usuario_nao_autenticado" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as IncluirPendenciasPayload | null;
    const contaId = body?.conta_conexao_id ? Number(body.conta_conexao_id) : NaN;
    if (!contaId || Number.isNaN(contaId)) {
      return NextResponse.json({ ok: false, error: "conta_conexao_id_obrigatorio" }, { status: 400 });
    }

    const periodoReferencia =
      typeof body?.periodo_referencia === "string" && body.periodo_referencia.trim()
        ? body.periodo_referencia.trim()
        : getPeriodoReferencia();

    const incluirOrigens =
      Array.isArray(body?.incluir_origens) && body?.incluir_origens.length
        ? body.incluir_origens
        : DEFAULT_ORIGENS;

    const { data: conta, error: contaErr } = await supabase
      .from("credito_conexao_contas")
      .select("id, ativo, pessoa_titular_id, tipo_conta")
      .eq("id", contaId)
      .maybeSingle();

    if (contaErr || !conta) {
      return NextResponse.json({ ok: false, error: "conta_conexao_nao_encontrada" }, { status: 404 });
    }
    if (conta.ativo === false) {
      return NextResponse.json({ ok: false, error: "conta_conexao_inativa" }, { status: 400 });
    }

    let fatura;
    let periodo_usado = periodoReferencia;
    try {
      const resultado = await ensureFaturaAberta(supabase, contaId, periodoReferencia);
      fatura = resultado.fatura;
      periodo_usado = resultado.periodo_usado;
    } catch (err: any) {
      console.error("[incluir-pendencias] erro ao garantir fatura aberta:", err);
      return NextResponse.json(
        { ok: false, error: "erro_buscar_ou_criar_fatura", details: err?.message ?? null },
        { status: 500 }
      );
    }

    const { data: pendentes, error: pendErr } = await supabase
      .from("credito_conexao_lancamentos")
      .select("id, valor_centavos, numero_parcelas, origem_sistema, origem_id")
      .eq("conta_conexao_id", contaId)
      .eq("competencia", periodoReferencia)
      .not("cobranca_id", "is", null)
      .eq("status", "PENDENTE_FATURA")
      .in("origem_sistema", incluirOrigens);

    if (pendErr) {
      console.error("[incluir-pendencias] erro ao buscar pendentes:", pendErr);
      return NextResponse.json({ ok: false, error: "erro_buscar_pendencias" }, { status: 500 });
    }

    const pendentesList = pendentes ?? [];
    if (pendentesList.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          aviso: "sem_pendencias",
          fatura_id: fatura.id,
          conta_conexao_id: contaId,
          periodo_referencia: periodo_usado,
          pendencias_incluidas: 0,
          compras_centavos: fatura?.valor_total_centavos ?? 0,
        },
        { status: 200 }
      );
    }

    const pendentesIds = pendentesList.map((p) => p.id);

    for (const id of pendentesIds) {
      const vinc = await vincularLancamentoNaFatura(supabase, fatura.id, id);
      if (!vinc.ok) {
        console.error("[incluir-pendencias] erro ao vincular lancamento:", vinc.error);
        return NextResponse.json({ ok: false, error: "erro_vincular_pendencias" }, { status: 500 });
      }
    }

    const { error: updErr } = await supabase
      .from("credito_conexao_lancamentos")
      .update({ status: "FATURADO" })
      .in("id", pendentesIds);

    if (updErr) {
      console.error("[incluir-pendencias] erro ao atualizar status pendentes:", updErr);
      return NextResponse.json({ ok: false, error: "erro_atualizar_status_pendentes" }, { status: 500 });
    }

    let comprasCentavos = 0;
    try {
      comprasCentavos = await recalcularComprasFatura(supabase, fatura.id);
    } catch (errCalc: any) {
      console.error("[incluir-pendencias] erro ao recalcular compras da fatura:", errCalc?.message ?? errCalc);
      return NextResponse.json(
        { ok: false, error: "erro_recalcular_fatura", details: errCalc?.message ?? null },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        fatura_id: fatura.id,
        conta_conexao_id: contaId,
        periodo_referencia: periodo_usado,
        pendencias_incluidas: pendentesIds.length,
        compras_centavos: comprasCentavos,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[incluir-pendencias] erro inesperado:", err);
    return NextResponse.json({ ok: false, error: "erro_interno_incluir_pendencias" }, { status: 500 });
  }
}
