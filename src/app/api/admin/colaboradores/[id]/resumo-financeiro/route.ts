import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type ColaboradorRow = {
  id: number;
  pessoa_id: number | null;
  ativo: boolean | null;
};

type PessoaRow = {
  id: number;
  nome: string | null;
  cpf: string | null;
};

type ContaConexaoRow = {
  id: number;
  pessoa_titular_id: number;
  tipo_conta: string;
  descricao_exibicao: string | null;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  ativo: boolean | null;
};

type FaturaRow = {
  id: number;
  conta_conexao_id: number;
  periodo_referencia: string;
  data_vencimento: string | null;
  valor_total_centavos: number;
  valor_taxas_centavos: number;
  status: string;
  folha_pagamento_id: number | null;
};

type LancamentoRow = {
  id: number;
  conta_conexao_id: number;
  origem_sistema: string;
  origem_id: number | null;
  descricao: string | null;
  valor_centavos: number;
  data_lancamento: string;
  status: string;
  competencia: string | null;
  cobranca_id: number | null;
};

type FolhaRow = {
  id: number;
  competencia_ano_mes: string;
  status: string;
  data_fechamento: string | null;
  data_pagamento: string | null;
};

type FolhaEventoRow = {
  folha_pagamento_id: number;
  tipo: "PROVENTO" | "DESCONTO";
  valor_centavos: number;
};

function toInt(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function competenciaAtual(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${mm}`;
}

function monthBounds(competencia: string): { inicio: string; fim: string } {
  const [anoRaw, mesRaw] = competencia.split("-");
  const ano = Number(anoRaw);
  const mes = Number(mesRaw);
  const inicio = `${anoRaw}-${mesRaw}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const fim = `${anoRaw}-${mesRaw}-${String(ultimoDia).padStart(2, "0")}`;
  return { inicio, fim };
}

function uniqueLancamentos(rows: LancamentoRow[]): LancamentoRow[] {
  const map = new Map<number, LancamentoRow>();
  for (const row of rows) {
    map.set(row.id, row);
  }
  return Array.from(map.values());
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const colaboradorId = toInt(ctx.params.id);
  if (!colaboradorId || colaboradorId <= 0) {
    return NextResponse.json({ ok: false, error: "colaborador_id_invalido" }, { status: 400 });
  }

  const { data: colaborador, error: colaboradorError } = await supabase
    .from("colaboradores")
    .select("id,pessoa_id,ativo")
    .eq("id", colaboradorId)
    .maybeSingle();

  if (colaboradorError) {
    return NextResponse.json(
      { ok: false, error: "falha_buscar_colaborador", detail: colaboradorError.message },
      { status: 500 },
    );
  }

  if (!colaborador) {
    return NextResponse.json({ ok: false, error: "colaborador_nao_encontrado" }, { status: 404 });
  }

  const colaboradorRow = colaborador as ColaboradorRow;

  let pessoa: PessoaRow | null = null;
  if (typeof colaboradorRow.pessoa_id === "number") {
    const { data: pessoaData, error: pessoaError } = await supabase
      .from("pessoas")
      .select("id,nome,cpf")
      .eq("id", colaboradorRow.pessoa_id)
      .maybeSingle();

    if (pessoaError) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar_pessoa", detail: pessoaError.message },
        { status: 500 },
      );
    }

    if (pessoaData) {
      pessoa = pessoaData as PessoaRow;
    }
  }

  let conta: ContaConexaoRow | null = null;
  if (pessoa?.id) {
    const { data: contasData, error: contaError } = await supabase
      .from("credito_conexao_contas")
      .select("id,pessoa_titular_id,tipo_conta,descricao_exibicao,dia_fechamento,dia_vencimento,ativo")
      .eq("tipo_conta", "COLABORADOR")
      .eq("pessoa_titular_id", pessoa.id)
      .order("ativo", { ascending: false })
      .order("id", { ascending: true })
      .limit(1);

    if (contaError) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar_conta_conexao", detail: contaError.message },
        { status: 500 },
      );
    }

    conta = ((contasData ?? [])[0] as ContaConexaoRow | undefined) ?? null;
  }

  const compAtual = competenciaAtual();
  const { inicio, fim } = monthBounds(compAtual);

  let faturaAbertaAtual: FaturaRow | null = null;
  let lancamentosMes: LancamentoRow[] = [];
  let ultimasDespesas: LancamentoRow[] = [];

  if (conta?.id) {
    const { data: faturasData, error: faturaError } = await supabase
      .from("credito_conexao_faturas")
      .select(
        "id,conta_conexao_id,periodo_referencia,data_vencimento,valor_total_centavos,valor_taxas_centavos,status,folha_pagamento_id",
      )
      .eq("conta_conexao_id", conta.id)
      .eq("periodo_referencia", compAtual)
      .in("status", ["ABERTA", "PENDENTE", "EM_ABERTO"])
      .order("id", { ascending: false })
      .limit(1);

    if (faturaError) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar_fatura_aberta", detail: faturaError.message },
        { status: 500 },
      );
    }

    faturaAbertaAtual = ((faturasData ?? [])[0] as FaturaRow | undefined) ?? null;

    const { data: lancamentosCompetencia, error: lancCompError } = await supabase
      .from("credito_conexao_lancamentos")
      .select(
        "id,conta_conexao_id,origem_sistema,origem_id,descricao,valor_centavos,data_lancamento,status,competencia,cobranca_id",
      )
      .eq("conta_conexao_id", conta.id)
      .eq("competencia", compAtual)
      .not("status", "eq", "CANCELADO")
      .order("id", { ascending: false });

    if (lancCompError) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar_lancamentos_competencia", detail: lancCompError.message },
        { status: 500 },
      );
    }

    const { data: lancamentosSemCompetencia, error: lancSemCompError } = await supabase
      .from("credito_conexao_lancamentos")
      .select(
        "id,conta_conexao_id,origem_sistema,origem_id,descricao,valor_centavos,data_lancamento,status,competencia,cobranca_id",
      )
      .eq("conta_conexao_id", conta.id)
      .is("competencia", null)
      .gte("data_lancamento", inicio)
      .lte("data_lancamento", fim)
      .not("status", "eq", "CANCELADO")
      .order("id", { ascending: false });

    if (lancSemCompError) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar_lancamentos_mes_sem_competencia", detail: lancSemCompError.message },
        { status: 500 },
      );
    }

    lancamentosMes = uniqueLancamentos([
      ...((lancamentosCompetencia ?? []) as LancamentoRow[]),
      ...((lancamentosSemCompetencia ?? []) as LancamentoRow[]),
    ]);

    const { data: ultimosLancamentos, error: ultimosError } = await supabase
      .from("credito_conexao_lancamentos")
      .select(
        "id,conta_conexao_id,origem_sistema,origem_id,descricao,valor_centavos,data_lancamento,status,competencia,cobranca_id",
      )
      .eq("conta_conexao_id", conta.id)
      .not("status", "eq", "CANCELADO")
      .order("data_lancamento", { ascending: false })
      .order("id", { ascending: false })
      .limit(10);

    if (ultimosError) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar_ultimas_despesas", detail: ultimosError.message },
        { status: 500 },
      );
    }

    ultimasDespesas = (ultimosLancamentos ?? []) as LancamentoRow[];
  }

  const { data: folhasData, error: folhasError } = await supabase
    .from("folha_pagamento_colaborador")
    .select("id,competencia_ano_mes,status,data_fechamento,data_pagamento")
    .eq("colaborador_id", colaboradorId)
    .order("competencia_ano_mes", { ascending: false })
    .order("id", { ascending: false })
    .limit(6);

  if (folhasError) {
    return NextResponse.json(
      { ok: false, error: "falha_buscar_folhas", detail: folhasError.message },
      { status: 500 },
    );
  }

  const folhas = (folhasData ?? []) as FolhaRow[];
  const folhaIds = folhas.map((f) => f.id);

  const eventosMap = new Map<number, { proventos: number; descontos: number }>();
  if (folhaIds.length > 0) {
    const { data: eventosData, error: eventosError } = await supabase
      .from("folha_pagamento_eventos")
      .select("folha_pagamento_id,tipo,valor_centavos")
      .in("folha_pagamento_id", folhaIds);

    if (eventosError) {
      return NextResponse.json(
        { ok: false, error: "falha_buscar_eventos_folha", detail: eventosError.message },
        { status: 500 },
      );
    }

    for (const evento of (eventosData ?? []) as FolhaEventoRow[]) {
      const acc = eventosMap.get(evento.folha_pagamento_id) ?? { proventos: 0, descontos: 0 };
      if (evento.tipo === "PROVENTO") {
        acc.proventos += Number(evento.valor_centavos ?? 0);
      } else {
        acc.descontos += Number(evento.valor_centavos ?? 0);
      }
      eventosMap.set(evento.folha_pagamento_id, acc);
    }
  }

  const folhasRecentes = folhas.map((folha) => {
    const totais = eventosMap.get(folha.id) ?? { proventos: 0, descontos: 0 };
    return {
      ...folha,
      proventos_centavos: totais.proventos,
      descontos_centavos: totais.descontos,
      liquido_centavos: totais.proventos - totais.descontos,
    };
  });

  const totalMesCentavos = lancamentosMes.reduce((acc, row) => acc + Number(row.valor_centavos ?? 0), 0);

  return NextResponse.json({
    ok: true,
    data: {
      colaborador: {
        id: colaboradorRow.id,
        ativo: colaboradorRow.ativo !== false,
        pessoa_id: colaboradorRow.pessoa_id,
        pessoa_nome: pessoa?.nome ?? null,
        pessoa_cpf: pessoa?.cpf ?? null,
      },
      conta_conexao: conta
        ? {
            id: conta.id,
            tipo_conta: conta.tipo_conta,
            descricao_exibicao: conta.descricao_exibicao,
            dia_fechamento: conta.dia_fechamento,
            dia_vencimento: conta.dia_vencimento,
            ativo: conta.ativo !== false,
          }
        : null,
      periodo_atual: compAtual,
      fatura_aberta_atual: faturaAbertaAtual,
      lancamentos_mes: {
        competencia: compAtual,
        quantidade: lancamentosMes.length,
        total_centavos: totalMesCentavos,
      },
      ultimas_despesas: ultimasDespesas,
      folhas_recentes: folhasRecentes,
    },
  });
}
