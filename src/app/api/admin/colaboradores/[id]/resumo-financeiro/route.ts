import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type Params = { id: string };

type FolhaEventoRow = {
  folha_pagamento_id: number;
  tipo: "PROVENTO" | "DESCONTO";
  valor_centavos: number;
};

function toInt(value: string): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const out = Math.trunc(n);
  return out > 0 ? out : null;
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

function competenciaAtual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function isSchemaMissingError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  if (code === "42P01" || code === "42703") return true;
  const message = (err as { message?: unknown }).message;
  return typeof message === "string" && message.toLowerCase().includes("does not exist");
}

export async function GET(req: Request, ctx: { params: Params }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const colaboradorId = toInt(ctx.params.id);
  if (!colaboradorId) return NextResponse.json({ error: "colaborador_id_invalido" }, { status: 400 });

  const { data: colab, error: colErr } = await supabase
    .from("colaboradores")
    .select("id,pessoa_id,tipo_vinculo_id,ativo")
    .eq("id", colaboradorId)
    .maybeSingle();

  if (colErr || !colab) return NextResponse.json({ error: "colaborador_nao_encontrado" }, { status: 404 });

  const pessoaId = Number(colab.pessoa_id);
  if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
    return NextResponse.json({ error: "pessoa_nao_encontrada" }, { status: 404 });
  }

  const { data: pessoa, error: pesErr } = await supabase
    .from("pessoas")
    .select("id,nome,cpf,telefone,email")
    .eq("id", pessoaId)
    .maybeSingle();

  if (pesErr || !pessoa) return NextResponse.json({ error: pesErr?.message ?? "pessoa_nao_encontrada" }, { status: 500 });

  let configFinanceira: Record<string, unknown> | null = null;
  const { data: cfgData, error: cfgErr } = await supabase
    .from("colaborador_config_financeira")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .maybeSingle();

  if (!cfgErr) {
    configFinanceira = (cfgData as Record<string, unknown> | null) ?? null;
  } else if (!isSchemaMissingError(cfgErr)) {
    return NextResponse.json({ error: cfgErr.message }, { status: 500 });
  }

  const { data: conta } = await supabase
    .from("credito_conexao_contas")
    .select("id,tipo_conta,descricao_exibicao,dia_fechamento,dia_vencimento,ativo,pessoa_titular_id")
    .eq("pessoa_titular_id", pessoaId)
    .eq("tipo_conta", "COLABORADOR")
    .order("ativo", { ascending: false })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  const contaId = conta ? Number(conta.id) : null;
  const periodoAtual = competenciaAtual();
  const { inicio, fim } = monthBounds(periodoAtual);

  let faturasRecentes: Array<Record<string, unknown>> = [];
  let faturaAbertaAtual: Record<string, unknown> | null = null;
  let lancamentosMes: Array<Record<string, unknown>> = [];
  let ultimasDespesas: Array<Record<string, unknown>> = [];

  if (contaId && Number.isFinite(contaId)) {
    const { data: faturasAtual } = await supabase
      .from("credito_conexao_faturas")
      .select("id,periodo_referencia,valor_total_centavos,status,data_fechamento,data_vencimento,folha_pagamento_id")
      .eq("conta_conexao_id", contaId)
      .eq("periodo_referencia", periodoAtual)
      .in("status", ["ABERTA", "PENDENTE", "EM_ABERTO"])
      .order("id", { ascending: false })
      .limit(1);

    faturaAbertaAtual = ((faturasAtual ?? [])[0] as Record<string, unknown> | undefined) ?? null;

    const { data: faturas } = await supabase
      .from("credito_conexao_faturas")
      .select("id,periodo_referencia,valor_total_centavos,status,data_fechamento,data_vencimento,folha_pagamento_id")
      .eq("conta_conexao_id", contaId)
      .order("id", { ascending: false })
      .limit(6);
    faturasRecentes = (faturas ?? []) as Array<Record<string, unknown>>;

    const { data: lancamentosComComp } = await supabase
      .from("credito_conexao_lancamentos")
      .select("id,descricao,origem_sistema,valor_centavos,data_lancamento,competencia,cobranca_id,status")
      .eq("conta_conexao_id", contaId)
      .eq("competencia", periodoAtual)
      .not("status", "eq", "CANCELADO")
      .order("id", { ascending: false });

    const { data: lancamentosSemComp } = await supabase
      .from("credito_conexao_lancamentos")
      .select("id,descricao,origem_sistema,valor_centavos,data_lancamento,competencia,cobranca_id,status")
      .eq("conta_conexao_id", contaId)
      .is("competencia", null)
      .gte("data_lancamento", inicio)
      .lte("data_lancamento", fim)
      .not("status", "eq", "CANCELADO")
      .order("id", { ascending: false });

    const unicos = new Map<number, Record<string, unknown>>();
    for (const row of [...(lancamentosComComp ?? []), ...(lancamentosSemComp ?? [])]) {
      const id = Number((row as { id?: unknown }).id);
      if (Number.isFinite(id) && id > 0) unicos.set(id, row as Record<string, unknown>);
    }
    lancamentosMes = Array.from(unicos.values());

    const { data: ultimos } = await supabase
      .from("credito_conexao_lancamentos")
      .select("id,descricao,origem_sistema,valor_centavos,data_lancamento,competencia,cobranca_id,status")
      .eq("conta_conexao_id", contaId)
      .not("status", "eq", "CANCELADO")
      .order("data_lancamento", { ascending: false })
      .order("id", { ascending: false })
      .limit(10);
    ultimasDespesas = (ultimos ?? []) as Array<Record<string, unknown>>;
  }

  let folhasRecentes: Array<Record<string, unknown>> = [];
  const { data: folhasData, error: folhasError } = await supabase
    .from("folha_pagamento_colaborador")
    .select("id,competencia_ano_mes,status,data_fechamento,data_pagamento")
    .eq("colaborador_id", colaboradorId)
    .order("competencia_ano_mes", { ascending: false })
    .order("id", { ascending: false })
    .limit(6);

  if (folhasError && !isSchemaMissingError(folhasError)) {
    return NextResponse.json({ error: folhasError.message }, { status: 500 });
  }

  const folhas = ((folhasData ?? []) as Array<Record<string, unknown>>).map((f) => ({
    id: Number(f.id),
    competencia_ano_mes: String(f.competencia_ano_mes ?? ""),
    status: String(f.status ?? ""),
    data_fechamento: (f.data_fechamento as string | null) ?? null,
    data_pagamento: (f.data_pagamento as string | null) ?? null,
  }));

  const folhaIds = folhas.map((f) => f.id).filter((id) => Number.isFinite(id) && id > 0);
  const eventosMap = new Map<number, { proventos: number; descontos: number }>();
  if (folhaIds.length > 0) {
    const { data: eventosData, error: eventosError } = await supabase
      .from("folha_pagamento_eventos")
      .select("folha_pagamento_id,tipo,valor_centavos")
      .in("folha_pagamento_id", folhaIds);

    if (eventosError && !isSchemaMissingError(eventosError)) {
      return NextResponse.json({ error: eventosError.message }, { status: 500 });
    }

    for (const evento of (eventosData ?? []) as FolhaEventoRow[]) {
      const acc = eventosMap.get(evento.folha_pagamento_id) ?? { proventos: 0, descontos: 0 };
      if (evento.tipo === "PROVENTO") acc.proventos += Number(evento.valor_centavos ?? 0);
      else acc.descontos += Number(evento.valor_centavos ?? 0);
      eventosMap.set(evento.folha_pagamento_id, acc);
    }
  }

  folhasRecentes = folhas.map((folha) => {
    const totais = eventosMap.get(folha.id) ?? { proventos: 0, descontos: 0 };
    return {
      ...folha,
      proventos_centavos: totais.proventos,
      descontos_centavos: totais.descontos,
      liquido_centavos: totais.proventos - totais.descontos,
    };
  });

  const totalMesCentavos = lancamentosMes.reduce((acc, row) => acc + Number(row.valor_centavos ?? 0), 0);

  const payloadCompat = {
    colaborador: {
      id: Number(colab.id),
      ativo: colab.ativo !== false,
      pessoa_id: Number(colab.pessoa_id),
      pessoa_nome: (pessoa.nome as string | null) ?? null,
      pessoa_cpf: (pessoa.cpf as string | null) ?? null,
    },
    conta_conexao: conta
      ? {
          id: Number(conta.id),
          tipo_conta: String(conta.tipo_conta),
          descricao_exibicao: (conta.descricao_exibicao as string | null) ?? null,
          dia_fechamento: Number(conta.dia_fechamento ?? 0),
          dia_vencimento: (conta.dia_vencimento as number | null) ?? null,
          ativo: conta.ativo !== false,
        }
      : null,
    periodo_atual: periodoAtual,
    fatura_aberta_atual: faturaAbertaAtual,
    lancamentos_mes: {
      competencia: periodoAtual,
      quantidade: lancamentosMes.length,
      total_centavos: totalMesCentavos,
    },
    ultimas_despesas: ultimasDespesas,
    folhas_recentes: folhasRecentes,
  };

  return NextResponse.json(
    {
      colaborador: {
        id: Number(colab.id),
        pessoa_id: Number(colab.pessoa_id),
        tipo_vinculo_id: (colab.tipo_vinculo_id as number | null) ?? null,
        ativo: colab.ativo !== false,
      },
      pessoa: {
        id: Number(pessoa.id),
        nome: (pessoa.nome as string | null) ?? null,
        cpf: (pessoa.cpf as string | null) ?? null,
        telefone: (pessoa.telefone as string | null) ?? null,
        email: (pessoa.email as string | null) ?? null,
      },
      config_financeira: configFinanceira,
      cartao_conexao: conta
        ? {
            id: Number(conta.id),
            tipo_conta: String(conta.tipo_conta),
            descricao_exibicao: (conta.descricao_exibicao as string | null) ?? null,
            dia_fechamento: Number(conta.dia_fechamento ?? 0),
            dia_vencimento: (conta.dia_vencimento as number | null) ?? null,
            ativo: conta.ativo !== false,
          }
        : null,
      faturas_recentes: faturasRecentes.map((f) => ({
        id: Number(f.id),
        periodo_referencia: String(f.periodo_referencia ?? ""),
        valor_total_centavos: Number(f.valor_total_centavos ?? 0),
        status: String(f.status ?? ""),
        data_fechamento: (f.data_fechamento as string | null) ?? "",
        data_vencimento: (f.data_vencimento as string | null) ?? null,
        folha_pagamento_id: (f.folha_pagamento_id as number | null) ?? null,
      })),
      ok: true,
      data: payloadCompat,
    },
    { status: 200 },
  );
}

