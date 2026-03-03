import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type RouteParams = {
  params: Promise<{ id?: string }>;
};

type ResumoFinanceiroResponse = {
  pessoa_id: number;
  responsavel_financeiro_id: number;
  responsavel_financeiro?: {
    id: number;
    nome: string | null;
  } | null;
  cobrancas: Array<{
    id: number;
    devedor_pessoa_id: number;
    data_vencimento: string | null;
    valor_centavos: number;
    status: string;
    origem_tipo: string;
    origem_subtipo: string;
    vencida: boolean;
    created_at: string | null;
  }>;
  cobrancas_matricula: Array<{
    cobranca_id: number;
    vencimento: string | null;
    valor_centavos: number;
    saldo_aberto_centavos: number;
    dias_atraso: number;
    status_cobranca: string;
    origem_tipo: string;
    origem_id: number | null;
    situacao_saas: string;
    bucket_vencimento: string;
  }>;
  faturas_credito_conexao: Array<{
    id: number;
    conta_conexao_id: number;
    periodo_referencia: string;
    data_vencimento: string | null;
    valor_total_centavos: number;
    status: string;
    vencida: boolean;
    created_at: string | null;
  }>;
  agregados: {
    cobrancas_pendentes_qtd: number;
    cobrancas_pendentes_total_centavos: number;
    cobrancas_vencidas_qtd: number;
    faturas_pendentes_qtd: number;
    faturas_pendentes_total_centavos: number;
    faturas_vencidas_qtd: number;
  };
};

function isVencida(dataVencimento: string | null, hojeISO: string): boolean {
  if (!dataVencimento) return false;
  const data = new Date(`${dataVencimento}T00:00:00`);
  const hoje = new Date(`${hojeISO}T00:00:00`);
  return data < hoje;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const pessoaId = Number(id);
  if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
    return NextResponse.json({ error: "pessoa_id_invalido" }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data: resumo, error: resumoErr } = await supabase
    .from("vw_pessoa_resumo_financeiro")
    .select("*")
    .eq("pessoa_id", pessoaId)
    .maybeSingle();

  if (resumoErr) {
    return NextResponse.json(
      { error: "erro_resumo_financeiro_view", details: resumoErr.message },
      { status: 500 }
    );
  }

  if (!resumo) {
    return NextResponse.json({ error: "pessoa_nao_encontrada" }, { status: 404 });
  }

  const responsavelId = Number(resumo.responsavel_financeiro_id) || pessoaId;

  const { data: responsavel } = await supabase
    .from("pessoas")
    .select("id,nome")
    .eq("id", responsavelId)
    .maybeSingle();

  const { data: cobrancasRaw, error: cobrancasErr } = await supabase
    .from("vw_financeiro_contas_receber_flat")
    .select(
      "cobranca_id,pessoa_id,vencimento,status_cobranca,origem_tipo,origem_id,created_at,valor_centavos,saldo_aberto_centavos,situacao_saas,bucket_vencimento"
    )
    .eq("pessoa_id", responsavelId)
    .gt("saldo_aberto_centavos", 0)
    .not("status_cobranca", "ilike", "CANCELADA")
    .order("vencimento", { ascending: true, nullsFirst: false });

  if (cobrancasErr) {
    return NextResponse.json(
      { error: "erro_listar_cobrancas_saas", details: cobrancasErr.message },
      { status: 500 }
    );
  }

  const hojeISO = new Date().toISOString().slice(0, 10);
  const cobrancas = (cobrancasRaw ?? []).map((c) => {
    const dataVenc = (c as any).vencimento ?? null;
    const saldoAberto = Number((c as any).saldo_aberto_centavos ?? 0);
    const situacaoSaas = String((c as any).situacao_saas ?? "");

    return {
      id: Number((c as any).cobranca_id),
      devedor_pessoa_id: Number((c as any).pessoa_id),
      data_vencimento: dataVenc ? String(dataVenc) : null,
      valor_centavos: saldoAberto,
      status: String((c as any).status_cobranca ?? ""),
      origem_tipo: String((c as any).origem_tipo ?? ""),
      origem_subtipo: String((c as any).origem_id ?? ""),
      vencida: situacaoSaas === "VENCIDA" || isVencida(dataVenc ? String(dataVenc) : null, hojeISO),
      created_at: (c as any).created_at ? String((c as any).created_at) : null,
    };
  });

  const { data: cobrancasMatriculaRaw, error: errM } = await supabase
    .from("vw_financeiro_contas_receber_flat")
    .select(
      "cobranca_id,vencimento,valor_centavos,saldo_aberto_centavos,dias_atraso,status_cobranca,origem_tipo,origem_id,situacao_saas,bucket_vencimento"
    )
    .eq("pessoa_id", responsavelId)
    .eq("origem_tipo", "MATRICULA")
    .gt("saldo_aberto_centavos", 0)
    .not("status_cobranca", "ilike", "CANCELADA")
    .order("vencimento", { ascending: true, nullsFirst: false });

  if (errM) {
    return NextResponse.json(
      { error: "erro_listar_cobrancas_matricula", details: errM.message },
      { status: 500 }
    );
  }

  const cobrancasMatricula = (cobrancasMatriculaRaw ?? []).map((c) => ({
    cobranca_id: Number((c as any).cobranca_id),
    vencimento: (c as any).vencimento ? String((c as any).vencimento) : null,
    valor_centavos: Number((c as any).valor_centavos ?? 0),
    saldo_aberto_centavos: Number((c as any).saldo_aberto_centavos ?? 0),
    dias_atraso: Number((c as any).dias_atraso ?? 0),
    status_cobranca: String((c as any).status_cobranca ?? ""),
    origem_tipo: String((c as any).origem_tipo ?? ""),
    origem_id: Number((c as any).origem_id ?? 0) || null,
    situacao_saas: String((c as any).situacao_saas ?? ""),
    bucket_vencimento: String((c as any).bucket_vencimento ?? ""),
  }));

  const { data: conta } = await supabase
    .from("credito_conexao_contas")
    .select("id,pessoa_titular_id")
    .eq("pessoa_titular_id", responsavelId)
    .maybeSingle();

  let faturas: ResumoFinanceiroResponse["faturas_credito_conexao"] = [];
  if (conta?.id) {
    const { data: faturasRaw } = await supabase
      .from("credito_conexao_faturas")
      .select("id,conta_conexao_id,periodo_referencia,data_vencimento,valor_total_centavos,status,created_at")
      .eq("conta_conexao_id", conta.id)
      .in("status", ["ABERTA", "EM_ATRASO", "PENDENTE", "OPEN"])
      .order("data_vencimento", { ascending: true });

    faturas = (faturasRaw ?? []).map((f) => {
      const dataVenc = (f as any).data_vencimento ?? null;
      const valorTotal = Number((f as any).valor_total_centavos ?? 0);
      return {
        id: Number((f as any).id),
        conta_conexao_id: Number((f as any).conta_conexao_id),
        periodo_referencia: String((f as any).periodo_referencia ?? ""),
        data_vencimento: dataVenc ? String(dataVenc) : null,
        valor_total_centavos: valorTotal,
        status: String((f as any).status ?? ""),
        vencida: valorTotal > 0 && isVencida(dataVenc ? String(dataVenc) : null, hojeISO),
        created_at: (f as any).created_at ? String((f as any).created_at) : null,
      };
    });
  }

  const payload: ResumoFinanceiroResponse = {
    pessoa_id: pessoaId,
    responsavel_financeiro_id: responsavelId,
    responsavel_financeiro: responsavel
      ? { id: responsavel.id, nome: responsavel.nome ?? null }
      : null,
    cobrancas: cobrancas.sort((a, b) =>
      (a.data_vencimento ?? "").localeCompare(b.data_vencimento ?? "")
    ),
    cobrancas_matricula: cobrancasMatricula,
    faturas_credito_conexao: faturas,
    agregados: {
      cobrancas_pendentes_qtd: cobrancas.length,
      cobrancas_pendentes_total_centavos: cobrancas.reduce(
        (acc, c) => acc + Number(c.valor_centavos ?? 0),
        0
      ),
      cobrancas_vencidas_qtd: cobrancas.filter((c) => c.vencida).length,
      faturas_pendentes_qtd: faturas.length,
      faturas_pendentes_total_centavos: faturas.reduce(
        (acc, f) => acc + Number(f.valor_total_centavos ?? 0),
        0
      ),
      faturas_vencidas_qtd: faturas.filter((f) => f.vencida).length,
    },
  };

  return NextResponse.json(payload);
}

