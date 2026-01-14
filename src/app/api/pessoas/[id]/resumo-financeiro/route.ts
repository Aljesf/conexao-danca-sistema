import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

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

export async function GET(_: Request, { params }: RouteParams) {
  const { id } = await params;
  const pessoaId = Number(id);
  if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
    return NextResponse.json({ error: "pessoa_id_invalido" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();

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

  const { data: cobrancasRaw } = await supabase
    .from("cobrancas")
    .select(
      "id,pessoa_id,status,created_at,origem_tipo,origem_subtipo,data_vencimento,vencimento,valor_total_centavos,valor_centavos"
    )
    .eq("pessoa_id", responsavelId)
    .in("status", ["ABERTA", "PENDENTE", "EM_ABERTO", "OPEN"]);

  const hojeISO = new Date().toISOString().slice(0, 10);
  const cobrancas = (cobrancasRaw ?? []).map((c) => {
    const dataVenc = (c as any).data_vencimento ?? (c as any).vencimento ?? null;
    const valor = (c as any).valor_total_centavos ?? (c as any).valor_centavos ?? 0;

    return {
      id: Number((c as any).id),
      devedor_pessoa_id: Number((c as any).pessoa_id),
      data_vencimento: dataVenc ? String(dataVenc) : null,
      valor_centavos: Number(valor),
      status: String((c as any).status ?? ""),
      origem_tipo: String((c as any).origem_tipo ?? ""),
      origem_subtipo: String((c as any).origem_subtipo ?? ""),
      vencida: isVencida(dataVenc ? String(dataVenc) : null, hojeISO),
      created_at: (c as any).created_at ? String((c as any).created_at) : null,
    };
  });

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
    faturas_credito_conexao: faturas,
    agregados: {
      cobrancas_pendentes_qtd: Number(resumo.cobrancas_pendentes_qtd ?? 0),
      cobrancas_pendentes_total_centavos: Number(
        resumo.cobrancas_pendentes_total_centavos ?? 0
      ),
      cobrancas_vencidas_qtd: Number(resumo.cobrancas_vencidas_qtd ?? 0),
      faturas_pendentes_qtd: Number(resumo.faturas_pendentes_qtd ?? 0),
      faturas_pendentes_total_centavos: Number(
        resumo.faturas_pendentes_total_centavos ?? 0
      ),
      faturas_vencidas_qtd: Number(resumo.faturas_vencidas_qtd ?? 0),
    },
  };

  return NextResponse.json(payload);
}
