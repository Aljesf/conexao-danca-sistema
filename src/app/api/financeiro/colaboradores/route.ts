import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type ColaboradorRow = {
  id: number;
  pessoa_id: number | null;
  tipo_vinculo_id: number | null;
  ativo: boolean | null;
};

type PessoaRow = {
  id: number;
  nome: string | null;
};

type TipoVinculoRow = {
  id: number;
  nome: string | null;
};

type FuncaoRelRow = {
  colaborador_id: number;
  funcao_id: number;
  ativo: boolean | null;
  principal: boolean | null;
};

type FuncaoRow = {
  id: number;
  nome: string | null;
};

type ContaInternaRow = {
  id: number;
  pessoa_titular_id: number;
  tipo_conta: string | null;
  ativo: boolean | null;
};

type FaturaRow = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string | null;
  valor_total_centavos: number | null;
  status: string | null;
  folha_pagamento_id: number | null;
  cobranca_id: number | null;
};

type FolhaRow = {
  id: number;
  colaborador_id: number;
  competencia_ano_mes: string | null;
  status: string | null;
};

type PagamentoRow = {
  colaborador_id: number;
  tipo: string | null;
  competencia_ano_mes: string | null;
  valor_centavos: number | null;
};

type FolhaEventoRow = {
  folha_pagamento_id: number;
  tipo: "PROVENTO" | "DESCONTO";
  valor_centavos: number | null;
};

const FATURA_STATUS_ABERTA = new Set(["ABERTA", "EM_ABERTO", "PENDENTE"]);

function compareCompetencia(a: string | null, b: string | null) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return b.localeCompare(a);
}

function normalize(text: string | null | undefined) {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function competenciaAtual() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isPagamentoAdiantamento(tipo: string | null | undefined) {
  const normalized = String(tipo ?? "").trim().toUpperCase();
  return normalized === "ADIANTAMENTO" || normalized === "SAQUE";
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const competenciaMesAtual = competenciaAtual();
  const q = searchParams.get("q")?.trim() ?? "";
  const status = (searchParams.get("status") ?? "").trim().toUpperCase();
  const contaInternaFiltro = (searchParams.get("conta_interna") ?? "").trim().toUpperCase();
  const folhaFiltro = (searchParams.get("folha") ?? "").trim().toUpperCase();
  const somenteDebito = searchParams.get("somente_debito") === "1";
  const somenteImportacaoPendente = searchParams.get("somente_importacao_pendente") === "1";

  const { data: colaboradoresData, error: colaboradoresError } = await supabase
    .from("colaboradores")
    .select("id,pessoa_id,tipo_vinculo_id,ativo")
    .order("id", { ascending: true });

  if (colaboradoresError) {
    return NextResponse.json(
      { ok: false, error: "falha_listar_colaboradores", detail: colaboradoresError.message },
      { status: 500 },
    );
  }

  const colaboradores = (colaboradoresData ?? []) as ColaboradorRow[];
  if (colaboradores.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        indicadores: {
          total_colaboradores: 0,
          com_conta_interna_ativa: 0,
          com_debito_em_aberto: 0,
          com_competencia_em_aberto: 0,
          com_folha_aberta: 0,
          com_importacao_pendente: 0,
        },
        data: [],
      },
      { status: 200 },
    );
  }

  const colaboradorIds = colaboradores.map((item) => item.id);
  const pessoaIds = Array.from(
    new Set(
      colaboradores
        .map((item) => item.pessoa_id)
        .filter((value): value is number => typeof value === "number" && value > 0),
    ),
  );
  const tipoVinculoIds = Array.from(
    new Set(
      colaboradores
        .map((item) => item.tipo_vinculo_id)
        .filter((value): value is number => typeof value === "number" && value > 0),
    ),
  );

  const [
    { data: pessoasData, error: pessoasError },
    { data: tiposVinculoData, error: tiposVinculoError },
    { data: funcoesRelData, error: funcoesRelError },
    { data: contasData, error: contasError },
    { data: folhasData, error: folhasError },
    { data: pagamentosData, error: pagamentosError },
  ] = await Promise.all([
    pessoaIds.length
      ? supabase.from("pessoas").select("id,nome").in("id", pessoaIds)
      : Promise.resolve({ data: [] as PessoaRow[], error: null }),
    tipoVinculoIds.length
      ? supabase.from("tipos_vinculo_colaborador").select("id,nome").in("id", tipoVinculoIds)
      : Promise.resolve({ data: [] as TipoVinculoRow[], error: null }),
    supabase
      .from("colaborador_funcoes")
      .select("colaborador_id,funcao_id,ativo,principal")
      .in("colaborador_id", colaboradorIds),
    pessoaIds.length
      ? supabase
          .from("credito_conexao_contas")
          .select("id,pessoa_titular_id,tipo_conta,ativo")
          .eq("tipo_conta", "COLABORADOR")
          .in("pessoa_titular_id", pessoaIds)
          .order("ativo", { ascending: false })
          .order("id", { ascending: true })
      : Promise.resolve({ data: [] as ContaInternaRow[], error: null }),
    supabase
      .from("folha_pagamento_colaborador")
      .select("id,colaborador_id,competencia_ano_mes,status")
      .in("colaborador_id", colaboradorIds)
      .order("competencia_ano_mes", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("colaborador_pagamentos")
      .select("colaborador_id,tipo,competencia_ano_mes,valor_centavos")
      .in("colaborador_id", colaboradorIds)
      .eq("competencia_ano_mes", competenciaMesAtual),
  ]);

  if (pessoasError || tiposVinculoError || funcoesRelError || contasError || folhasError || pagamentosError) {
    const detail =
      pessoasError?.message ??
      tiposVinculoError?.message ??
      funcoesRelError?.message ??
      contasError?.message ??
      folhasError?.message ??
      pagamentosError?.message ??
      "falha_carregar_relacoes_financeiras";

    return NextResponse.json({ ok: false, error: "falha_carregar_relacoes_financeiras", detail }, { status: 500 });
  }

  const funcoesRel = (funcoesRelData ?? []) as FuncaoRelRow[];
  const funcaoIds = Array.from(
    new Set(
      funcoesRel
        .map((item) => item.funcao_id)
        .filter((value): value is number => typeof value === "number" && value > 0),
    ),
  );

  const { data: funcoesData, error: funcoesError } = funcaoIds.length
    ? await supabase.from("funcoes_colaborador").select("id,nome").in("id", funcaoIds)
    : { data: [] as FuncaoRow[], error: null };

  if (funcoesError) {
    return NextResponse.json(
      { ok: false, error: "falha_listar_funcoes_colaborador", detail: funcoesError.message },
      { status: 500 },
    );
  }

  const contas = (contasData ?? []) as ContaInternaRow[];
  const contaByPessoa = new Map<number, ContaInternaRow>();
  for (const conta of contas) {
    if (!contaByPessoa.has(conta.pessoa_titular_id)) {
      contaByPessoa.set(conta.pessoa_titular_id, conta);
    }
  }

  const contaIds = Array.from(new Set(Array.from(contaByPessoa.values()).map((item) => item.id)));

  const { data: faturasData, error: faturasError } = contaIds.length
    ? await supabase
        .from("credito_conexao_faturas")
        .select("id,conta_conexao_id,periodo_referencia,valor_total_centavos,status,folha_pagamento_id,cobranca_id")
        .in("conta_conexao_id", contaIds)
        .order("periodo_referencia", { ascending: false })
        .order("id", { ascending: false })
    : { data: [] as FaturaRow[], error: null };

  if (faturasError) {
    return NextResponse.json(
      { ok: false, error: "falha_listar_faturas_conta_interna", detail: faturasError.message },
      { status: 500 },
    );
  }

  const pessoaNomeById = new Map<number, string>();
  for (const pessoa of (pessoasData ?? []) as PessoaRow[]) {
    pessoaNomeById.set(pessoa.id, pessoa.nome?.trim() || `Pessoa #${pessoa.id}`);
  }

  const tipoVinculoById = new Map<number, string>();
  for (const tipo of (tiposVinculoData ?? []) as TipoVinculoRow[]) {
    tipoVinculoById.set(tipo.id, tipo.nome?.trim() || `Vinculo #${tipo.id}`);
  }

  const funcaoNomeById = new Map<number, string>();
  for (const funcao of (funcoesData ?? []) as FuncaoRow[]) {
    funcaoNomeById.set(funcao.id, funcao.nome?.trim() || `Funcao #${funcao.id}`);
  }

  const funcoesByColaborador = new Map<number, FuncaoRelRow[]>();
  for (const rel of funcoesRel) {
    const list = funcoesByColaborador.get(rel.colaborador_id) ?? [];
    list.push(rel);
    funcoesByColaborador.set(rel.colaborador_id, list);
  }

  const faturasByConta = new Map<number, FaturaRow[]>();
  for (const fatura of (faturasData ?? []) as FaturaRow[]) {
    const list = faturasByConta.get(fatura.conta_conexao_id) ?? [];
    list.push(fatura);
    faturasByConta.set(fatura.conta_conexao_id, list);
  }

  const folhasByColaborador = new Map<number, FolhaRow[]>();
  for (const folha of (folhasData ?? []) as FolhaRow[]) {
    const list = folhasByColaborador.get(folha.colaborador_id) ?? [];
    list.push(folha);
    folhasByColaborador.set(folha.colaborador_id, list);
  }

  const pagamentosByColaborador = new Map<number, PagamentoRow[]>();
  for (const pagamento of (pagamentosData ?? []) as PagamentoRow[]) {
    const list = pagamentosByColaborador.get(pagamento.colaborador_id) ?? [];
    list.push(pagamento);
    pagamentosByColaborador.set(pagamento.colaborador_id, list);
  }

  const folhasMesAtual = ((folhasData ?? []) as FolhaRow[]).filter(
    (item) => item.competencia_ano_mes === competenciaMesAtual,
  );
  const folhaMesAtualIds = folhasMesAtual.map((item) => item.id);
  const { data: eventosMesAtualData, error: eventosMesAtualError } = folhaMesAtualIds.length
    ? await supabase
        .from("folha_pagamento_eventos")
        .select("folha_pagamento_id,tipo,valor_centavos")
        .in("folha_pagamento_id", folhaMesAtualIds)
    : { data: [] as FolhaEventoRow[], error: null };

  if (eventosMesAtualError) {
    return NextResponse.json(
      { ok: false, error: "falha_listar_eventos_mes_atual", detail: eventosMesAtualError.message },
      { status: 500 },
    );
  }

  const eventosByFolhaId = new Map<number, FolhaEventoRow[]>();
  for (const evento of (eventosMesAtualData ?? []) as FolhaEventoRow[]) {
    const list = eventosByFolhaId.get(evento.folha_pagamento_id) ?? [];
    list.push(evento);
    eventosByFolhaId.set(evento.folha_pagamento_id, list);
  }

  const rows = colaboradores.map((colaborador) => {
    const pessoaId = colaborador.pessoa_id ?? null;
    const contaInterna = pessoaId ? contaByPessoa.get(pessoaId) ?? null : null;
    const faturas = contaInterna ? faturasByConta.get(contaInterna.id) ?? [] : [];
    const folhas = folhasByColaborador.get(colaborador.id) ?? [];
    const pagamentosMesAtual = pagamentosByColaborador.get(colaborador.id) ?? [];
    const faturasAbertas = faturas.filter((item) => FATURA_STATUS_ABERTA.has(String(item.status ?? "").toUpperCase()));
    const faturaMesAtual =
      faturas.find((item) => item.periodo_referencia === competenciaMesAtual) ?? null;
    const folhaMesAtual =
      folhas.find((item) => item.competencia_ano_mes === competenciaMesAtual) ?? null;
    const eventosMesAtual = folhaMesAtual ? eventosByFolhaId.get(folhaMesAtual.id) ?? [] : [];
    const proventosMesAtual = eventosMesAtual
      .filter((item) => item.tipo === "PROVENTO")
      .reduce((acc, item) => acc + Math.max(Number(item.valor_centavos ?? 0), 0), 0);
    const descontosMesAtual = eventosMesAtual
      .filter((item) => item.tipo === "DESCONTO")
      .reduce((acc, item) => acc + Math.max(Number(item.valor_centavos ?? 0), 0), 0);
    const adiantamentosMesAtual = pagamentosMesAtual
      .filter((item) => isPagamentoAdiantamento(item.tipo))
      .reduce((acc, item) => acc + Math.max(Number(item.valor_centavos ?? 0), 0), 0);
    const importadoContaInternaMesAtual = Math.max(Number(faturaMesAtual?.valor_total_centavos ?? 0), 0);
    const saldoLiquidoEstimadoMesAtual =
      proventosMesAtual > 0
        ? proventosMesAtual - descontosMesAtual - importadoContaInternaMesAtual
        : -adiantamentosMesAtual - importadoContaInternaMesAtual;
    const saldoEmAbertoCentavos = faturasAbertas.reduce(
      (acc, item) => acc + Math.max(Number(item.valor_total_centavos ?? 0), 0),
      0,
    );
    const competenciasAbertas = Array.from(
      new Set(
        faturasAbertas
          .map((item) => item.periodo_referencia)
          .filter((value): value is string => typeof value === "string" && value.trim() !== ""),
      ),
    );
    competenciasAbertas.sort(compareCompetencia);

    const ultimaFatura = [...faturas].sort((a, b) => {
      const byCompetencia = compareCompetencia(a.periodo_referencia, b.periodo_referencia);
      if (byCompetencia !== 0) return byCompetencia;
      return b.id - a.id;
    })[0] ?? null;

    const ultimaFolha = [...folhas].sort((a, b) => {
      const byCompetencia = compareCompetencia(a.competencia_ano_mes, b.competencia_ano_mes);
      if (byCompetencia !== 0) return byCompetencia;
      return b.id - a.id;
    })[0] ?? null;

    const ultimaCompetencia = [ultimaFatura?.periodo_referencia ?? null, ultimaFolha?.competencia_ano_mes ?? null]
      .filter((value): value is string => typeof value === "string" && value.trim() !== "")
      .sort(compareCompetencia)[0] ?? null;

    const folhaDaUltimaCompetencia =
      ultimaCompetencia
        ? folhas.find((item) => item.competencia_ano_mes === ultimaCompetencia) ?? ultimaFolha
        : ultimaFolha;

    const importacaoPendente = faturasAbertas.some((item) => !item.folha_pagamento_id);
    const folhaAberta = folhas.some((item) => String(item.status ?? "").toUpperCase() === "ABERTA");

    let statusFolha = folhaDaUltimaCompetencia?.status ?? null;
    if (!statusFolha) {
      if (importacaoPendente) statusFolha = "PENDENTE_IMPORTACAO";
      else if (saldoEmAbertoCentavos > 0) statusFolha = "SEM_FOLHA";
      else statusFolha = "SEM_DEBITO";
    }

    const relacoesFuncao = funcoesByColaborador.get(colaborador.id) ?? [];
    const relacoesAtivas = relacoesFuncao.filter((item) => item.ativo !== false);
    const relacaoPrincipal = relacoesAtivas.find((item) => item.principal) ?? relacoesAtivas[0] ?? relacoesFuncao[0] ?? null;
    const funcaoPrincipal = relacaoPrincipal?.funcao_id ? funcaoNomeById.get(relacaoPrincipal.funcao_id) ?? null : null;

    return {
      colaborador_id: colaborador.id,
      pessoa_id: pessoaId,
      nome: pessoaId ? pessoaNomeById.get(pessoaId) ?? `Colaborador #${colaborador.id}` : `Colaborador #${colaborador.id}`,
      tipo_vinculo: colaborador.tipo_vinculo_id ? tipoVinculoById.get(colaborador.tipo_vinculo_id) ?? null : null,
      funcao_principal: funcaoPrincipal,
      status: colaborador.ativo !== false ? "ATIVO" : "INATIVO",
      conta_interna_ativa: Boolean(contaInterna?.id) && contaInterna?.ativo !== false,
      saldo_em_aberto_centavos: saldoEmAbertoCentavos,
      ultima_competencia: ultimaCompetencia,
      status_folha: statusFolha,
      quantidade_faturas_abertas: faturasAbertas.length,
      quantidade_competencias_abertas: competenciasAbertas.length,
      importacao_pendente: importacaoPendente,
      folha_aberta: folhaAberta,
      competencia_atual: competenciaMesAtual,
      conta_interna_id: contaInterna?.id ?? null,
      total_adiantamentos_mes_centavos: adiantamentosMesAtual,
      total_importado_conta_interna_mes_centavos: importadoContaInternaMesAtual,
      saldo_liquido_estimado_centavos: saldoLiquidoEstimadoMesAtual,
      ultima_fatura_id: ultimaFatura?.id ?? null,
      ultima_fatura_status: ultimaFatura?.status ?? null,
      ultima_folha_id: folhaDaUltimaCompetencia?.id ?? ultimaFolha?.id ?? null,
      ultima_folha_status: folhaDaUltimaCompetencia?.status ?? ultimaFolha?.status ?? null,
      ultima_cobranca_id: ultimaFatura?.cobranca_id ?? null,
    };
  });

  const filtered = rows
    .filter((item) => {
      if (status === "ATIVO" && item.status !== "ATIVO") return false;
      if (status === "INATIVO" && item.status !== "INATIVO") return false;

      if (contaInternaFiltro === "ATIVA" && !item.conta_interna_ativa) return false;
      if (contaInternaFiltro === "SEM_CONTA" && item.conta_interna_ativa) return false;

      if (folhaFiltro === "ABERTA" && !item.folha_aberta) return false;
      if (folhaFiltro === "PENDENTE_IMPORTACAO" && !item.importacao_pendente) return false;

      if (somenteDebito && item.saldo_em_aberto_centavos <= 0) return false;
      if (somenteImportacaoPendente && !item.importacao_pendente) return false;

      if (!q) return true;
      const haystack = normalize(
        [item.nome, item.tipo_vinculo, item.funcao_principal, item.status_folha, item.ultima_competencia]
          .filter(Boolean)
          .join(" "),
      );
      return haystack.includes(normalize(q));
    })
    .sort((a, b) => {
      if (b.saldo_em_aberto_centavos !== a.saldo_em_aberto_centavos) {
        return b.saldo_em_aberto_centavos - a.saldo_em_aberto_centavos;
      }
      const byCompetencia = compareCompetencia(a.ultima_competencia, b.ultima_competencia);
      if (byCompetencia !== 0) return byCompetencia;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });

  return NextResponse.json(
    {
      ok: true,
      indicadores: {
        total_colaboradores: filtered.length,
        com_conta_interna_ativa: filtered.filter((item) => item.conta_interna_ativa).length,
        com_debito_em_aberto: filtered.filter((item) => item.saldo_em_aberto_centavos > 0).length,
        com_competencia_em_aberto: filtered.filter((item) => item.quantidade_competencias_abertas > 0).length,
        com_folha_aberta: filtered.filter((item) => item.folha_aberta).length,
        com_importacao_pendente: filtered.filter((item) => item.importacao_pendente).length,
      },
      data: filtered,
    },
    { status: 200 },
  );
}
