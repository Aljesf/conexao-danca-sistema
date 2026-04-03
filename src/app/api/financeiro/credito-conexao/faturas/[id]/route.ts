import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(_req as any);
  if (denied) return denied as any;
  const auth = await requireUser(_req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { id } = await params;
  const faturaId = Number(id);

  if (!faturaId || Number.isNaN(faturaId)) {
    return NextResponse.json({ ok: false, error: "id_invalido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("credito_conexao_faturas")
    .select(
      `
      id,
      conta_conexao_id,
      periodo_referencia,
      data_fechamento,
      data_vencimento,
      valor_total_centavos,
      valor_taxas_centavos,
      status,
      cobranca_id,
      created_at,
      updated_at,
      cobranca:cobrancas (
        id,
        pessoa_id,
        descricao,
        valor_centavos,
        vencimento,
        status,
        neofin_charge_id,
        link_pagamento,
        linha_digitavel,
        neofin_payload
      )
    `
    )
    .eq("id", faturaId)
    .single();

  if (error || !data) {
    console.error("Erro ao buscar fatura detalhe", error);
    return NextResponse.json({ ok: false, error: "fatura_nao_encontrada" }, { status: 404 });
  }

  let itens: Array<Record<string, unknown>> = [];
  const { data: itensData } = await supabase
    .from("vw_credito_conexao_fatura_itens_enriquecida")
    .select(
      "lancamento_id,descricao,valor_centavos,competencia_ano_mes,status_lancamento,aluno_pessoa_id,aluno_nome,responsavel_financeiro_nome,cobranca_fatura_id",
    )
    .eq("fatura_id", faturaId)
    .order("lancamento_id", { ascending: true });

  if (Array.isArray(itensData)) {
    itens = (itensData as Array<Record<string, unknown>>).filter((item) => {
      const status = String(item.status_lancamento ?? "").trim().toUpperCase();
      return !status.includes("CANCEL");
    });
  }

  const contaId = Number(data.conta_conexao_id ?? 0);
  let contexto_titular: Record<string, unknown> | null = null;

  if (Number.isFinite(contaId) && contaId > 0) {
    const { data: conta } = await supabase
      .from("credito_conexao_contas")
      .select("id,tipo_conta,pessoa_titular_id,descricao_exibicao")
      .eq("id", contaId)
      .maybeSingle();

    const tipoConta = String(conta?.tipo_conta ?? "").trim().toUpperCase();
    if (tipoConta === "COLABORADOR" && Number(conta?.pessoa_titular_id ?? 0) > 0) {
      const { data: colaborador } = await supabase
        .from("colaboradores")
        .select("id,pessoa_id,ativo")
        .eq("pessoa_id", Number(conta?.pessoa_titular_id))
        .order("ativo", { ascending: false })
        .order("id", { ascending: true })
        .limit(1)
        .maybeSingle();

      const competencia = String(data.periodo_referencia ?? "") || null;
      const { data: folhaColaborador } =
        colaborador?.id && competencia
          ? await supabase
              .from("folha_pagamento_colaborador")
              .select("id,status")
              .eq("colaborador_id", Number(colaborador.id))
              .eq("competencia_ano_mes", competencia)
              .order("id", { ascending: false })
              .limit(1)
              .maybeSingle()
          : { data: null };

      contexto_titular = {
        tipo: "COLABORADOR",
        titular_label: "Conta interna do colaborador",
        colaborador_id: colaborador?.id ?? null,
        competencia,
        folha_pagamento_colaborador_id: folhaColaborador?.id ?? null,
        status_importacao_folha: folhaColaborador?.id ? folhaColaborador.status ?? "IMPORTADA" : "PENDENTE_IMPORTACAO",
      };
    } else if (tipoConta === "ALUNO") {
      contexto_titular = {
        tipo: "ALUNO",
        titular_label: "Conta interna do aluno",
        colaborador_id: null,
        competencia: String(data.periodo_referencia ?? "") || null,
        folha_pagamento_colaborador_id: null,
        status_importacao_folha: null,
      };
    }
  }

  return NextResponse.json({ ok: true, fatura: data, itens, contexto_titular });
}


