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
};

type ContaConexaoPessoaRow = {
  id: number;
  pessoa_titular_id: number;
  responsavel_financeiro_pessoa_id: number | null;
  tipo_conta: string | null;
  descricao_exibicao: string | null;
  ativo: boolean | null;
  dia_vencimento: number | null;
  dia_vencimento_preferido: number | null;
};

type FaturaResumoRow = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string;
  data_vencimento: string | null;
  valor_total_centavos: number;
  status: string;
  cobranca_id: number | null;
  created_at: string | null;
};

type FaturaLancamentoRow = {
  fatura_id: number;
  lancamento_id: number;
};

type LancamentoContaInternaRow = {
  id: number;
  conta_conexao_id: number;
  competencia: string | null;
  data_lancamento: string | null;
  descricao: string | null;
  valor_centavos: number | null;
  status: string | null;
  origem_sistema: string | null;
  origem_id: number | null;
  referencia_item: string | null;
  cobranca_id: number | null;
  matricula_id: number | null;
};

type CobrancaResumoRow = {
  id: number;
  descricao: string | null;
  valor_centavos: number;
  vencimento: string | null;
  data_pagamento: string | null;
  status: string | null;
  expurgada: boolean | null;
  cancelada_em: string | null;
  competencia_ano_mes: string | null;
  conta_interna_id: number | null;
  origem_tipo: string | null;
  origem_subtipo: string | null;
  origem_item_tipo: string | null;
  origem_item_id: number | null;
  origem_label: string | null;
  created_at: string | null;
};

type RecebimentoResumoRow = {
  id: number;
  cobranca_id: number | null;
  valor_centavos: number | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  forma_pagamento_codigo: string | null;
  origem_sistema: string | null;
  observacoes: string | null;
  created_at: string | null;
};

const STATUSS_QUITADOS = new Set([
  "PAGO",
  "PAGA",
  "RECEBIDO",
  "RECEBIDA",
  "LIQUIDADO",
  "LIQUIDADA",
  "QUITADO",
  "QUITADA",
]);

function upper(value: unknown): string {
  return typeof value === "string"
    ? value
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
    : "";
}

function numberOrZero(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function isQuitado(status: string | null | undefined) {
  return STATUSS_QUITADOS.has(upper(status));
}

function isVencida(dataVencimento: string | null, hojeISO: string) {
  if (!dataVencimento) return false;
  return new Date(`${dataVencimento}T00:00:00`) < new Date(`${hojeISO}T00:00:00`);
}

function grupoOrigem(origemItemTipo: string | null, origemTipo: string | null) {
  const origem = upper(origemItemTipo ?? origemTipo);
  if (origem.includes("MATRICULA")) return { grupo: "MATRICULAS", label: "Matriculas" };
  if (origem.includes("EVENTO") || origem.includes("INSCRICAO")) {
    return { grupo: "INSCRICOES_EVENTO", label: "Inscricoes em evento" };
  }
  if (origem.includes("LOJA") || origem.includes("VENDA") || origem.includes("COMPRA")) {
    return { grupo: "LOJA_COMPRAS_INTERNAS", label: "Loja / compras internas" };
  }
  return { grupo: "OUTROS", label: "Outros lancamentos elegiveis" };
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
    return NextResponse.json({ error: "erro_resumo_financeiro_view", details: resumoErr.message }, { status: 500 });
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
    .select("id,pessoa_id,vencimento,valor_centavos,status,origem_tipo,origem_subtipo,origem_id,created_at")
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
    .select("id,pessoa_titular_id,responsavel_financeiro_pessoa_id,tipo_conta,descricao_exibicao,ativo,dia_vencimento,dia_vencimento_preferido")
    .eq("tipo_conta", "ALUNO")
    .or(`responsavel_financeiro_pessoa_id.eq.${responsavelId},pessoa_titular_id.eq.${responsavelId}`)
    .order("id", { ascending: false });

  const conta =
    ((contasRaw ?? []) as ContaConexaoPessoaRow[]).find((item) => Number(item.responsavel_financeiro_pessoa_id ?? 0) === responsavelId) ??
    ((contasRaw ?? []) as ContaConexaoPessoaRow[])[0] ??
    null;

  const payloadBase = {
    pessoa_id: pessoaId,
    responsavel_financeiro_id: responsavelId,
    responsavel_financeiro: responsavel ? { id: responsavel.id, nome: responsavel.nome ?? null } : null,
    conta_interna: conta
      ? {
          id: conta.id,
          pessoa_titular_id: conta.pessoa_titular_id,
          responsavel_financeiro_pessoa_id: conta.responsavel_financeiro_pessoa_id,
          tipo_conta: conta.tipo_conta ?? null,
          descricao_exibicao: conta.descricao_exibicao ?? null,
          ativo: conta.ativo !== false,
          dia_vencimento: conta.dia_vencimento ?? null,
          dia_vencimento_preferido: conta.dia_vencimento_preferido ?? null,
        }
      : null,
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
  };

  if (!conta?.id) {
    return NextResponse.json({
      ...payloadBase,
      resumo_geral: {
        aberto_hoje_centavos: cobrancasCanonicas.reduce((acc, item) => acc + numberOrZero(item.valor_aberto_centavos), 0),
        em_atraso_centavos: cobrancasCanonicas.reduce((acc, item) => acc + (Number(item.atraso_dias ?? 0) > 0 ? numberOrZero(item.valor_aberto_centavos) : 0), 0),
        pago_confirmado_centavos: 0,
        quitado_na_conta_interna_centavos: 0,
        recebimentos_confirmados_qtd: 0,
        cobrancas_pagas_qtd: 0,
        proximo_vencimento: null,
      },
      fatura_atual: null,
      cobrancas_pagas: [],
      recebimentos_confirmados: [],
      historico_operacional: [],
      faturas_credito_conexao: [],
      faturas_detalhadas: [],
      agregados: {
        cobrancas_pendentes_qtd: cobrancasCanonicas.length,
        cobrancas_pendentes_total_centavos: cobrancasCanonicas.reduce((acc, item) => acc + numberOrZero(item.valor_aberto_centavos), 0),
        cobrancas_vencidas_qtd: cobrancasCanonicas.filter((item) => item.status_interno === "VENCIDA").length,
        faturas_pendentes_qtd: 0,
        faturas_pendentes_total_centavos: 0,
        faturas_vencidas_qtd: 0,
      },
    });
  }

  const { data: faturasRaw } = await supabase
    .from("credito_conexao_faturas")
    .select("id,conta_conexao_id,periodo_referencia,data_vencimento,valor_total_centavos,status,cobranca_id,created_at")
    .eq("conta_conexao_id", conta.id)
    .order("periodo_referencia", { ascending: false })
    .limit(12);

  const faturasBase = ((faturasRaw ?? []) as FaturaResumoRow[]).sort((left, right) =>
    (right.periodo_referencia ?? "").localeCompare(left.periodo_referencia ?? ""),
  );

  const faturaIds = faturasBase.map((item) => item.id);
  const { data: pivotsRaw } = faturaIds.length
    ? await supabase.from("credito_conexao_fatura_lancamentos").select("fatura_id,lancamento_id").in("fatura_id", faturaIds)
    : { data: [] as FaturaLancamentoRow[] };

  const pivots = (pivotsRaw ?? []) as FaturaLancamentoRow[];
  const lancamentoIds = Array.from(
    new Set(pivots.map((row) => Number(row.lancamento_id)).filter((row) => Number.isFinite(row) && row > 0)),
  );
  const { data: lancamentosRaw } = lancamentoIds.length
    ? await supabase
        .from("credito_conexao_lancamentos")
        .select("id,conta_conexao_id,competencia,data_lancamento,descricao,valor_centavos,status,origem_sistema,origem_id,referencia_item,cobranca_id,matricula_id")
        .in("id", lancamentoIds)
    : { data: [] as LancamentoContaInternaRow[] };

  const lancamentos = new Map<number, LancamentoContaInternaRow>(
    ((lancamentosRaw ?? []) as LancamentoContaInternaRow[]).map((row) => [row.id, row]),
  );

  const cobrancaIdsDetalhe = Array.from(
    new Set(
      Array.from(lancamentos.values())
        .map((row) => Number(row.cobranca_id ?? 0))
        .filter((row) => Number.isFinite(row) && row > 0),
    ),
  );
  const { data: cobrancasDetalheRaw } = cobrancaIdsDetalhe.length
    ? await supabase
        .from("cobrancas")
        .select("id,descricao,valor_centavos,vencimento,data_pagamento,status,expurgada,cancelada_em,competencia_ano_mes,conta_interna_id,origem_tipo,origem_subtipo,origem_item_tipo,origem_item_id,origem_label,created_at")
        .in("id", cobrancaIdsDetalhe)
    : { data: [] as CobrancaResumoRow[] };

  const cobrancasDetalhe = new Map<number, CobrancaResumoRow>(
    ((cobrancasDetalheRaw ?? []) as CobrancaResumoRow[]).map((row) => [row.id, row]),
  );

  const lancamentoIdsPorFatura = new Map<number, number[]>();
  for (const pivot of pivots) {
    const atuais = lancamentoIdsPorFatura.get(Number(pivot.fatura_id)) ?? [];
    atuais.push(Number(pivot.lancamento_id));
    lancamentoIdsPorFatura.set(Number(pivot.fatura_id), atuais);
  }

  const faturasDetalhadas = faturasBase.map((fatura) => {
    const itens = (lancamentoIdsPorFatura.get(fatura.id) ?? [])
      .map((lancamentoId) => lancamentos.get(lancamentoId))
      .filter((item): item is LancamentoContaInternaRow => Boolean(item))
      .sort((left, right) => (left.data_lancamento ?? "").localeCompare(right.data_lancamento ?? "") || left.id - right.id)
      .map((lancamento) => {
        const cobrancaDetalhe =
          typeof lancamento.cobranca_id === "number" ? cobrancasDetalhe.get(lancamento.cobranca_id) ?? null : null;
        return {
          lancamento_id: lancamento.id,
          cobranca_id: lancamento.cobranca_id ?? null,
          descricao: lancamento.descricao ?? cobrancaDetalhe?.descricao ?? null,
          valor_centavos: numberOrZero(lancamento.valor_centavos),
          status_lancamento: lancamento.status ?? null,
          referencia_item: lancamento.referencia_item ?? null,
          origem_sistema: lancamento.origem_sistema ?? null,
          origem_id: lancamento.origem_id ?? null,
          matricula_id: lancamento.matricula_id ?? null,
          data_lancamento: lancamento.data_lancamento ?? null,
          cobranca_status: cobrancaDetalhe?.status ?? null,
          cobranca_vencimento: cobrancaDetalhe?.vencimento ?? null,
          data_pagamento: cobrancaDetalhe?.data_pagamento ?? null,
        };
      });

    const valorPago = itens.reduce((acc, item) => acc + (isQuitado(item.cobranca_status) ? item.valor_centavos : 0), 0);
    const quantidadeCobrancas = new Set(
      itens.map((item) => item.cobranca_id).filter((item): item is number => typeof item === "number" && item > 0),
    ).size;

    return {
      id: fatura.id,
      conta_conexao_id: fatura.conta_conexao_id,
      periodo_referencia: fatura.periodo_referencia,
      data_vencimento: fatura.data_vencimento,
      valor_total_centavos: fatura.valor_total_centavos,
      valor_pago_centavos: valorPago,
      saldo_aberto_centavos: Math.max(fatura.valor_total_centavos - valorPago, 0),
      status: fatura.status,
      vencida: fatura.valor_total_centavos > 0 && isVencida(fatura.data_vencimento, hojeISO),
      cobranca_id: fatura.cobranca_id ?? null,
      quantidade_itens: itens.length,
      quantidade_cobrancas: quantidadeCobrancas,
      created_at: fatura.created_at,
      itens,
    };
  });

  const faturasPendentes = faturasDetalhadas
    .filter((item) => !["PAGA", "CANCELADA"].includes(upper(item.status)))
    .map((item) => ({
      id: item.id,
      conta_conexao_id: item.conta_conexao_id,
      periodo_referencia: item.periodo_referencia,
      data_vencimento: item.data_vencimento,
      valor_total_centavos: item.valor_total_centavos,
      status: item.status,
      vencida: item.vencida,
      created_at: item.created_at,
    }));

  const { data: cobrancasPagasRaw } = await supabase
    .from("cobrancas")
    .select("id,descricao,valor_centavos,vencimento,data_pagamento,status,expurgada,cancelada_em,competencia_ano_mes,conta_interna_id,origem_tipo,origem_subtipo,origem_item_tipo,origem_item_id,origem_label,created_at")
    .eq("pessoa_id", responsavelId)
    .not("data_pagamento", "is", null)
    .order("data_pagamento", { ascending: false, nullsFirst: false })
    .limit(100);

  const cobrancasPagasBase = ((cobrancasPagasRaw ?? []) as CobrancaResumoRow[]).filter(
    (item) =>
      (isQuitado(item.status) || Boolean(item.data_pagamento)) &&
      upper(item.status) !== "CANCELADA" &&
      item.expurgada !== true &&
      !item.cancelada_em,
  );
  const cobrancasPagas = cobrancasPagasBase.map((item) => ({
    cobranca_id: item.id,
    descricao: item.descricao ?? null,
    valor_centavos: numberOrZero(item.valor_centavos),
    data_pagamento: item.data_pagamento ?? null,
    vencimento: item.vencimento ?? null,
    status: item.status ?? null,
    competencia: item.competencia_ano_mes ?? null,
    conta_interna_id: item.conta_interna_id ?? null,
    origem_label: item.origem_label ?? item.descricao ?? null,
    origem_tipo: item.origem_tipo ?? null,
    origem_item_tipo: item.origem_item_tipo ?? null,
    origem_item_id: item.origem_item_id ?? null,
  }));

  const recebimentoCobrancaIds = Array.from(
    new Set(cobrancasPagas.map((item) => item.cobranca_id).filter((item) => Number.isFinite(item) && item > 0)),
  );
  const { data: recebimentosRaw } = recebimentoCobrancaIds.length
    ? await supabase
        .from("recebimentos")
        .select("id,cobranca_id,valor_centavos,data_pagamento,metodo_pagamento,forma_pagamento_codigo,origem_sistema,observacoes,created_at")
        .in("cobranca_id", recebimentoCobrancaIds)
        .order("data_pagamento", { ascending: false, nullsFirst: false })
        .order("id", { ascending: false })
        .limit(100)
    : { data: [] as RecebimentoResumoRow[] };

  const cobrancasPagasById = new Map<number, CobrancaResumoRow>(cobrancasPagasBase.map((row) => [row.id, row]));
  const recebimentosConfirmados = ((recebimentosRaw ?? []) as RecebimentoResumoRow[]).map((row) => {
    const cobranca = typeof row.cobranca_id === "number" ? cobrancasPagasById.get(row.cobranca_id) ?? null : null;
    return {
      recebimento_id: row.id,
      cobranca_id: row.cobranca_id ?? null,
      valor_centavos: numberOrZero(row.valor_centavos),
      data_pagamento: row.data_pagamento ?? null,
      metodo_pagamento: row.metodo_pagamento ?? null,
      forma_pagamento_codigo: row.forma_pagamento_codigo ?? null,
      origem_sistema: row.origem_sistema ?? null,
      observacoes: row.observacoes ?? null,
      cobranca_descricao: cobranca?.descricao ?? null,
      cobranca_competencia: cobranca?.competencia_ano_mes ?? null,
      conta_interna_id: cobranca?.conta_interna_id ?? null,
      em_conta_interna: Boolean(cobranca?.conta_interna_id),
    };
  });
  const quitadoNaContaInternaCentavos = recebimentosConfirmados
    .filter((item) => item.em_conta_interna)
    .reduce((acc, item) => acc + item.valor_centavos, 0);

  const historicoGroups = new Map<string, { grupo: string; label: string; quantidade_itens: number; total_aberto_centavos: number; total_pago_centavos: number; itens: Array<{ cobranca_id: number; origem_label: string | null; competencia: string | null; valor_centavos: number; saldo_aberto_centavos: number; status: string | null; conta_interna_id: number | null }> }>();
  const registrarHistorico = (input: { cobranca_id: number; origem_item_tipo: string | null; origem_tipo: string | null; origem_label: string | null; competencia: string | null; valor_centavos: number; saldo_aberto_centavos: number; status: string | null; conta_interna_id: number | null; }) => {
    const { grupo, label } = grupoOrigem(input.origem_item_tipo, input.origem_tipo);
    const atual = historicoGroups.get(grupo) ?? { grupo, label, quantidade_itens: 0, total_aberto_centavos: 0, total_pago_centavos: 0, itens: [] };
    atual.quantidade_itens += 1;
    atual.total_aberto_centavos += input.saldo_aberto_centavos;
    atual.total_pago_centavos += Math.max(input.valor_centavos - input.saldo_aberto_centavos, 0);
    atual.itens.push({
      cobranca_id: input.cobranca_id,
      origem_label: input.origem_label,
      competencia: input.competencia,
      valor_centavos: input.valor_centavos,
      saldo_aberto_centavos: input.saldo_aberto_centavos,
      status: input.status,
      conta_interna_id: input.conta_interna_id,
    });
    historicoGroups.set(grupo, atual);
  };

  for (const item of cobrancasCanonicas) {
    registrarHistorico({
      cobranca_id: item.cobranca_id,
      origem_item_tipo: item.origemItemTipo,
      origem_tipo: item.origem_tipo,
      origem_label: item.origem_label ?? item.origemLabel ?? null,
      competencia: item.competencia_ano_mes ?? item.vencimento ?? null,
      valor_centavos: numberOrZero(item.valor_centavos),
      saldo_aberto_centavos: numberOrZero(item.valor_aberto_centavos),
      status: item.status_cobranca ?? null,
      conta_interna_id: item.contaInternaId ?? null,
    });
  }
  for (const item of cobrancasPagas) {
    registrarHistorico({
      cobranca_id: item.cobranca_id,
      origem_item_tipo: item.origem_item_tipo,
      origem_tipo: item.origem_tipo,
      origem_label: item.origem_label,
      competencia: item.competencia,
      valor_centavos: item.valor_centavos,
      saldo_aberto_centavos: 0,
      status: item.status,
      conta_interna_id: item.conta_interna_id,
    });
  }

  const historicoOperacional = Array.from(historicoGroups.values())
    .map((item) => ({
      ...item,
      itens: item.itens.sort((left, right) => (right.competencia ?? "").localeCompare(left.competencia ?? "") || right.cobranca_id - left.cobranca_id),
    }))
    .sort((left, right) => right.total_aberto_centavos - left.total_aberto_centavos || right.total_pago_centavos - left.total_pago_centavos);

  const faturaAtual =
    faturasDetalhadas.find((item) => !["PAGA", "CANCELADA"].includes(upper(item.status))) ?? faturasDetalhadas[0] ?? null;

  return NextResponse.json({
    ...payloadBase,
    resumo_geral: {
      aberto_hoje_centavos: cobrancasCanonicas.reduce((acc, item) => acc + numberOrZero(item.valor_aberto_centavos), 0),
      em_atraso_centavos: cobrancasCanonicas.reduce((acc, item) => acc + (Number(item.atraso_dias ?? 0) > 0 ? numberOrZero(item.valor_aberto_centavos) : 0), 0),
      pago_confirmado_centavos: recebimentosConfirmados.reduce((acc, item) => acc + item.valor_centavos, 0),
      quitado_na_conta_interna_centavos: quitadoNaContaInternaCentavos,
      recebimentos_confirmados_qtd: recebimentosConfirmados.length,
      cobrancas_pagas_qtd: cobrancasPagas.length,
      proximo_vencimento: faturasPendentes.map((item) => item.data_vencimento).filter((item): item is string => Boolean(item)).sort()[0] ?? null,
    },
    fatura_atual: faturaAtual
      ? {
          id: faturaAtual.id,
          competencia: faturaAtual.periodo_referencia,
          data_vencimento: faturaAtual.data_vencimento,
          status: faturaAtual.status,
          valor_total_centavos: faturaAtual.valor_total_centavos,
          saldo_aberto_centavos: faturaAtual.saldo_aberto_centavos,
          quantidade_itens: faturaAtual.quantidade_itens,
          cobranca_id: faturaAtual.cobranca_id,
        }
      : null,
    cobrancas_pagas: cobrancasPagas,
    recebimentos_confirmados: recebimentosConfirmados,
    historico_operacional: historicoOperacional,
    faturas_credito_conexao: faturasPendentes,
    faturas_detalhadas: faturasDetalhadas,
    agregados: {
      cobrancas_pendentes_qtd: cobrancasCanonicas.length,
      cobrancas_pendentes_total_centavos: cobrancasCanonicas.reduce((acc, item) => acc + numberOrZero(item.valor_aberto_centavos), 0),
      cobrancas_vencidas_qtd: cobrancasCanonicas.filter((item) => item.status_interno === "VENCIDA").length,
      faturas_pendentes_qtd: faturasPendentes.length,
      faturas_pendentes_total_centavos: faturasPendentes.reduce((acc, item) => acc + numberOrZero(item.valor_total_centavos), 0),
      faturas_vencidas_qtd: faturasPendentes.filter((item) => item.vencida).length,
    },
  });
}
