import { NextResponse, type NextRequest } from "next/server";
import { listarCobrancasEmAbertoPorPessoa } from "@/lib/financeiro/contas-receber-auditoria";
import { requireUser } from "@/lib/supabase/api-auth";

type RouteParams = {
  params: Promise<{ id?: string }>;
};

type PessoaResumoFinanceiroViewRow = {
  pessoa_id: number | null;
  responsavel_financeiro_id: number | null;
};

type PessoaBasicaRow = {
  id: number;
  nome: string | null;
};

type CobrancaCanceladaRow = {
  id: number;
  pessoa_id: number;
  vencimento: string | null;
  valor_centavos: number;
  status: string;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_id: number | null;
  created_at: string | null;
  expurgada?: boolean | null;
};

type ContaConexaoPessoaRow = {
  id: number;
  pessoa_titular_id: number;
  responsavel_financeiro_pessoa_id: number | null;
};

type FaturaResumoRow = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string;
  data_vencimento: string | null;
  valor_total_centavos: number;
  status: string;
  created_at: string | null;
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
  cobrancas_canceladas_expurgaveis: Array<{
    cobranca_id: number;
    devedor_pessoa_id: number;
    data_vencimento: string | null;
    valor_centavos: number;
    status: string;
    origem_tipo: string;
    origem_subtipo: string;
    origem_id: number | null;
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
  cobrancas_canonicas: Array<{
    cobranca_id: number;
    vencimento: string | null;
    valor_centavos: number;
    saldo_aberto_centavos: number;
    dias_atraso: number;
    status_cobranca: string;
    situacao_saas: string;
    bucket_vencimento: string | null;
    origem_tipo: string | null;
    origem_subtipo: string | null;
    origem_id: number | null;
    origem_label: string;
    origem_secundaria: string | null;
    origem_tecnica: string | null;
    origem_badge_label: string | null;
    origem_badge_tone: string;
    origemAgrupadorTipo: string | null;
    origemAgrupadorId: number | null;
    origemItemTipo: string | null;
    origemItemId: number | null;
    contaInternaId: number | null;
    alunoNome: string | null;
    matriculaId: number | null;
    origemLabel: string;
    migracaoContaInternaStatus: string | null;
    vencimentoOriginal: string | null;
    vencimentoAjustadoEm: string | null;
    vencimentoAjustadoPor: string | null;
    vencimentoAjusteMotivo: string | null;
    canceladaEm: string | null;
    canceladaPor: string | null;
    cancelamentoMotivo: string | null;
    cancelamentoTipo: string | null;
    matriculaStatus: string | null;
    matriculaCancelamentoTipo: string | null;
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
    .select("pessoa_id,responsavel_financeiro_id")
    .eq("pessoa_id", pessoaId)
    .maybeSingle<PessoaResumoFinanceiroViewRow>();

  if (resumoErr) {
    return NextResponse.json(
      { error: "erro_resumo_financeiro_view", details: resumoErr.message },
      { status: 500 },
    );
  }

  if (!resumo) {
    return NextResponse.json({ error: "pessoa_nao_encontrada" }, { status: 404 });
  }

  const responsavelId = Number(resumo.responsavel_financeiro_id ?? pessoaId) || pessoaId;
  const hojeISO = new Date().toISOString().slice(0, 10);

  const { data: responsavel } = await supabase
    .from("pessoas")
    .select("id,nome")
    .eq("id", responsavelId)
    .maybeSingle<PessoaBasicaRow>();

  let cobrancasCanonicas = await listarCobrancasEmAbertoPorPessoa(supabase, responsavelId);
  cobrancasCanonicas = cobrancasCanonicas.filter((item) => item.valor_aberto_centavos > 0);

  const cobrancas = cobrancasCanonicas.map((item) => ({
    id: item.cobranca_id,
    devedor_pessoa_id: item.pessoa_id ?? responsavelId,
    data_vencimento: item.vencimento,
    valor_centavos: item.valor_aberto_centavos,
    status: item.status_cobranca ?? "",
    origem_tipo: item.origem_tipo ?? "",
    origem_subtipo: item.origem_subtipo ?? "",
    vencida: item.status_interno === "VENCIDA" || isVencida(item.vencimento, hojeISO),
    created_at: null,
  }));

  const cobrancasMatricula = cobrancasCanonicas
    .filter((item) => item.origemItemTipo === "MATRICULA" || (item.origem_tipo ?? "").startsWith("MATRICULA"))
    .map((item) => ({
      cobranca_id: item.cobranca_id,
      vencimento: item.vencimento,
      valor_centavos: item.valor_centavos,
      saldo_aberto_centavos: item.valor_aberto_centavos,
      dias_atraso: item.atraso_dias,
      status_cobranca: item.status_cobranca ?? "",
      origem_tipo: item.origem_tipo ?? "",
      origem_id: item.origem_id,
      situacao_saas: item.status_interno ?? "",
      bucket_vencimento: item.bucket ?? "",
    }));

  const { data: canceladasRaw, error: canceladasErr } = await supabase
    .from("cobrancas")
    .select("id,pessoa_id,vencimento,valor_centavos,status,origem_tipo,origem_subtipo,origem_id,created_at,expurgada")
    .eq("pessoa_id", responsavelId)
    .eq("status", "CANCELADA")
    .or("expurgada.is.null,expurgada.eq.false")
    .order("origem_tipo", { ascending: true })
    .order("origem_id", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true, nullsFirst: false });

  if (canceladasErr) {
    return NextResponse.json(
      { error: "erro_listar_cobrancas_canceladas_expurgaveis", details: canceladasErr.message },
      { status: 500 },
    );
  }

  const cobrancasCanceladasExpurgaveis = ((canceladasRaw ?? []) as CobrancaCanceladaRow[]).map((cobranca) => ({
    cobranca_id: cobranca.id,
    devedor_pessoa_id: cobranca.pessoa_id,
    data_vencimento: cobranca.vencimento,
    valor_centavos: cobranca.valor_centavos,
    status: cobranca.status,
    origem_tipo: cobranca.origem_tipo ?? "",
    origem_subtipo: cobranca.origem_subtipo ?? "",
    origem_id: cobranca.origem_id ?? null,
    created_at: cobranca.created_at,
  }));

  const { data: contasRaw } = await supabase
    .from("credito_conexao_contas")
    .select("id,pessoa_titular_id,responsavel_financeiro_pessoa_id")
    .eq("tipo_conta", "ALUNO")
    .or(`responsavel_financeiro_pessoa_id.eq.${responsavelId},pessoa_titular_id.eq.${responsavelId}`)
    .order("id", { ascending: false });
  const conta =
    ((contasRaw ?? []) as ContaConexaoPessoaRow[]).find(
      (item) => Number(item.responsavel_financeiro_pessoa_id ?? 0) === responsavelId,
    ) ?? ((contasRaw ?? []) as ContaConexaoPessoaRow[])[0];

  let faturas: ResumoFinanceiroResponse["faturas_credito_conexao"] = [];
  if (conta?.id) {
    const { data: faturasRaw } = await supabase
      .from("credito_conexao_faturas")
      .select("id,conta_conexao_id,periodo_referencia,data_vencimento,valor_total_centavos,status,created_at")
      .eq("conta_conexao_id", conta.id)
      .in("status", ["ABERTA", "EM_ATRASO", "PENDENTE", "OPEN"])
      .order("data_vencimento", { ascending: true });

    faturas = ((faturasRaw ?? []) as FaturaResumoRow[]).map((fatura) => ({
      id: fatura.id,
      conta_conexao_id: fatura.conta_conexao_id,
      periodo_referencia: fatura.periodo_referencia,
      data_vencimento: fatura.data_vencimento,
      valor_total_centavos: fatura.valor_total_centavos,
      status: fatura.status,
      vencida: fatura.valor_total_centavos > 0 && isVencida(fatura.data_vencimento, hojeISO),
      created_at: fatura.created_at,
    }));
  }

  const payload: ResumoFinanceiroResponse = {
    pessoa_id: pessoaId,
    responsavel_financeiro_id: responsavelId,
    responsavel_financeiro: responsavel ? { id: responsavel.id, nome: responsavel.nome ?? null } : null,
    cobrancas: cobrancas.sort((left, right) => (left.data_vencimento ?? "").localeCompare(right.data_vencimento ?? "")),
    cobrancas_canceladas_expurgaveis: cobrancasCanceladasExpurgaveis,
    cobrancas_matricula: cobrancasMatricula,
    cobrancas_canonicas: cobrancasCanonicas.map((item) => ({
      cobranca_id: item.cobranca_id,
      vencimento: item.vencimento,
      valor_centavos: item.valor_centavos,
      saldo_aberto_centavos: item.valor_aberto_centavos,
      dias_atraso: item.atraso_dias,
      status_cobranca: item.status_cobranca ?? "",
      situacao_saas: item.status_interno ?? "",
      bucket_vencimento: item.bucket,
      origem_tipo: item.origem_tipo,
      origem_subtipo: item.origem_subtipo,
      origem_id: item.origem_id,
      origem_label: item.origem_label,
      origem_secundaria: item.origem_secundaria,
      origem_tecnica: item.origem_tecnica,
      origem_badge_label: item.origem_badge_label,
      origem_badge_tone: item.origem_badge_tone,
      origemAgrupadorTipo: item.origemAgrupadorTipo,
      origemAgrupadorId: item.origemAgrupadorId,
      origemItemTipo: item.origemItemTipo,
      origemItemId: item.origemItemId,
      contaInternaId: item.contaInternaId,
      alunoNome: item.alunoNome,
      matriculaId: item.matriculaId,
      origemLabel: item.origemLabel,
      migracaoContaInternaStatus: item.migracaoContaInternaStatus,
      vencimentoOriginal: item.vencimentoOriginal,
      vencimentoAjustadoEm: item.vencimentoAjustadoEm,
      vencimentoAjustadoPor: item.vencimentoAjustadoPor,
      vencimentoAjusteMotivo: item.vencimentoAjusteMotivo,
      canceladaEm: item.canceladaEm,
      canceladaPor: item.canceladaPor,
      cancelamentoMotivo: item.cancelamentoMotivo,
      cancelamentoTipo: item.cancelamentoTipo,
      matriculaStatus: item.matriculaStatus,
      matriculaCancelamentoTipo: item.matriculaCancelamentoTipo,
    })),
    faturas_credito_conexao: faturas,
    agregados: {
      cobrancas_pendentes_qtd: cobrancasCanonicas.length,
      cobrancas_pendentes_total_centavos: cobrancasCanonicas.reduce(
        (acc, item) => acc + Number(item.valor_aberto_centavos ?? 0),
        0,
      ),
      cobrancas_vencidas_qtd: cobrancasCanonicas.filter((item) => item.status_interno === "VENCIDA").length,
      faturas_pendentes_qtd: faturas.length,
      faturas_pendentes_total_centavos: faturas.reduce((acc, item) => acc + Number(item.valor_total_centavos ?? 0), 0),
      faturas_vencidas_qtd: faturas.filter((item) => item.vencida).length,
    },
  };

  return NextResponse.json(payload);
}
