import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type RouteContext = { params: Promise<{ id: string }> };

const FATURA_STATUS_ABERTA = new Set(["ABERTA", "EM_ABERTO", "PENDENTE"]);
const FATURA_STATUS_FECHADA = new Set(["FECHADA", "PAGA", "CANCELADA"]);

function toInt(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.trunc(parsed);
}

function competenciaAtual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function padOrigem(origem: string | null | undefined): "cafe" | "loja" | "escola" | "outros" {
  const normalized = (origem ?? "").trim().toUpperCase();
  if (normalized === "CAFE") return "cafe";
  if (normalized === "LOJA") return "loja";
  if (normalized === "ESCOLA" || normalized === "MATRICULA" || normalized === "MATRICULAS") return "escola";
  return "outros";
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  const denied = await guardApiByRole(request as any);
  if (denied) return denied as any;

  const { id } = await ctx.params;
  const colaboradorId = toInt(id);
  if (!colaboradorId) {
    return NextResponse.json({ ok: false, error: "colaborador_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: colaborador, error: colaboradorError } = await supabase
    .from("colaboradores")
    .select("id,pessoa_id,tipo_vinculo_id,ativo")
    .eq("id", colaboradorId)
    .maybeSingle();

  if (colaboradorError || !colaborador?.pessoa_id) {
    return NextResponse.json({ ok: false, error: "colaborador_nao_encontrado" }, { status: 404 });
  }

  const pessoaId = Number(colaborador.pessoa_id);
  const [{ data: pessoa }, { data: configFinanceira }, { data: contaInterna }, { data: regrasParcelamento }] = await Promise.all([
    supabase.from("pessoas").select("id,nome,cpf,telefone,email").eq("id", pessoaId).maybeSingle(),
    supabase.from("colaborador_config_financeira").select("*").eq("colaborador_id", colaboradorId).maybeSingle(),
    supabase
      .from("credito_conexao_contas")
      .select("id,tipo_conta,descricao_exibicao,dia_fechamento,dia_vencimento,ativo,pessoa_titular_id")
      .eq("pessoa_titular_id", pessoaId)
      .eq("tipo_conta", "COLABORADOR")
      .order("ativo", { ascending: false })
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("credito_conexao_regras_parcelas")
      .select("id")
      .eq("tipo_conta", "COLABORADOR")
      .eq("ativo", true)
      .limit(1),
  ]);

  const permiteParcelamento = Boolean((regrasParcelamento ?? []).length > 0);

  let faturas: Array<Record<string, unknown>> = [];
  let ultimosLancamentos: Array<Record<string, unknown>> = [];
  const itensPorOrigem = {
    cafe: { quantidade: 0, total_centavos: 0 },
    loja: { quantidade: 0, total_centavos: 0 },
    escola: { quantidade: 0, total_centavos: 0 },
    outros: { quantidade: 0, total_centavos: 0 },
  };
  let saldoEmAbertoTotalCentavos = 0;
  let totalFaturadoMesCentavos = 0;

  if (contaInterna?.id) {
    const { data: faturasData } = await supabase
      .from("credito_conexao_faturas")
      .select("id,periodo_referencia,valor_total_centavos,status,data_fechamento,data_vencimento,folha_pagamento_id,cobranca_id")
      .eq("conta_conexao_id", Number(contaInterna.id))
      .order("periodo_referencia", { ascending: false })
      .order("id", { ascending: false })
      .limit(24);
    faturas = (faturasData ?? []) as Array<Record<string, unknown>>;

    const faturaIds = faturas
      .map((item) => Number(item.id))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (faturaIds.length > 0) {
      const { data: vinculos } = await supabase
        .from("credito_conexao_fatura_lancamentos")
        .select("fatura_id,lancamento_id")
        .in("fatura_id", faturaIds);

      const lancamentoIds = Array.from(
        new Set((vinculos ?? []).map((item) => Number((item as Record<string, unknown>).lancamento_id)).filter((value) => Number.isFinite(value) && value > 0)),
      );

      if (lancamentoIds.length > 0) {
        const { data: lancamentosData } = await supabase
          .from("credito_conexao_lancamentos")
          .select("id,descricao,origem_sistema,valor_centavos,data_lancamento,competencia,cobranca_id,status")
          .in("id", lancamentoIds)
          .order("data_lancamento", { ascending: false })
          .order("id", { ascending: false });

        ultimosLancamentos = (lancamentosData ?? []).slice(0, 10) as Array<Record<string, unknown>>;

        const lancamentosMap = new Map<number, Record<string, unknown>>();
        for (const lancamento of lancamentosData ?? []) {
          const lancamentoId = Number((lancamento as Record<string, unknown>).id);
          if (Number.isFinite(lancamentoId) && lancamentoId > 0) {
            lancamentosMap.set(lancamentoId, lancamento as Record<string, unknown>);
          }
        }

        const faturasAbertas = faturas.filter((item) => FATURA_STATUS_ABERTA.has(String(item.status ?? "").toUpperCase()));
        saldoEmAbertoTotalCentavos = faturasAbertas.reduce(
          (acc, item) => acc + Math.max(Number(item.valor_total_centavos ?? 0), 0),
          0,
        );

        const competenciaMes = competenciaAtual();
        totalFaturadoMesCentavos = faturas
          .filter((item) => String(item.periodo_referencia ?? "") === competenciaMes)
          .reduce((acc, item) => acc + Math.max(Number(item.valor_total_centavos ?? 0), 0), 0);

        for (const vinculo of vinculos ?? []) {
          const faturaId = Number((vinculo as Record<string, unknown>).fatura_id);
          const lancamentoId = Number((vinculo as Record<string, unknown>).lancamento_id);
          const fatura = faturas.find((item) => Number(item.id) === faturaId);
          if (!fatura || !FATURA_STATUS_ABERTA.has(String(fatura.status ?? "").toUpperCase())) continue;
          const lancamento = lancamentosMap.get(lancamentoId);
          const origem = padOrigem(String(lancamento?.origem_sistema ?? ""));
          itensPorOrigem[origem].quantidade += 1;
          itensPorOrigem[origem].total_centavos += Math.max(Number(lancamento?.valor_centavos ?? 0), 0);
        }
      }
    }
  }

  const folhasData = await supabase
    .from("folha_pagamento_colaborador")
    .select("id,competencia_ano_mes,status,data_fechamento,data_pagamento")
    .eq("colaborador_id", colaboradorId)
    .order("competencia_ano_mes", { ascending: false })
    .order("id", { ascending: false })
    .limit(12);

  const folhas = (folhasData.data ?? []) as Array<Record<string, unknown>>;
  const ultimaImportacaoParaFolha =
    folhas.find((item) => String(item.status ?? "").toUpperCase() !== "ABERTA") ??
    faturas.find((item) => Number(item.folha_pagamento_id ?? 0) > 0) ??
    null;

  const faturasAbertas = faturas.filter((item) => FATURA_STATUS_ABERTA.has(String(item.status ?? "").toUpperCase()));
  const faturasFechadasRecentes = faturas.filter((item) => FATURA_STATUS_FECHADA.has(String(item.status ?? "").toUpperCase())).slice(0, 6);
  const faturaPorCompetencia = new Map<string, Record<string, unknown>>();
  for (const fatura of faturas) {
    const competencia = String(fatura.periodo_referencia ?? "").trim();
    if (competencia && !faturaPorCompetencia.has(competencia)) {
      faturaPorCompetencia.set(competencia, fatura);
    }
  }

  const folhaPorCompetencia = new Map<string, Record<string, unknown>>();
  for (const folha of folhas) {
    const competencia = String(folha.competencia_ano_mes ?? "").trim();
    if (competencia && !folhaPorCompetencia.has(competencia)) {
      folhaPorCompetencia.set(competencia, folha);
    }
  }

  const competenciasFolha = Array.from(new Set([...faturaPorCompetencia.keys(), ...folhaPorCompetencia.keys()]))
    .sort((a, b) => b.localeCompare(a))
    .map((competencia) => {
      const fatura = faturaPorCompetencia.get(competencia) ?? null;
      const folha = folhaPorCompetencia.get(competencia) ?? null;
      return {
        competencia,
        valor_total_centavos: Math.max(Number(fatura?.valor_total_centavos ?? 0), 0),
        status_fatura: String(fatura?.status ?? "") || null,
        status_folha: String(folha?.status ?? "") || null,
        status_importacao: folha?.id ? "IMPORTADA" : fatura?.id ? "PENDENTE" : "SEM_MOVIMENTO",
        referencia_fatura_id: Number(fatura?.id ?? 0) || null,
        referencia_cobranca_id: Number(fatura?.cobranca_id ?? 0) || null,
        folha_pagamento_id: Number(folha?.id ?? fatura?.folha_pagamento_id ?? 0) || null,
        espelho_disponivel: Boolean(folha?.id),
      };
    });

  return NextResponse.json(
    {
      ok: true,
      colaborador: {
        id: Number(colaborador.id),
        pessoa_id: pessoaId,
        tipo_vinculo_id: colaborador.tipo_vinculo_id ?? null,
        ativo: colaborador.ativo !== false,
        pessoa_nome: pessoa?.nome ?? null,
      },
      pessoa: {
        id: Number(pessoa?.id ?? pessoaId),
        nome: pessoa?.nome ?? null,
        cpf: pessoa?.cpf ?? null,
        telefone: pessoa?.telefone ?? null,
        email: pessoa?.email ?? null,
      },
      periodo_atual: competenciaAtual(),
      config_financeira: configFinanceira ?? null,
      cartao_conexao: contaInterna
        ? {
            id: Number(contaInterna.id),
            tipo_conta: String(contaInterna.tipo_conta ?? "COLABORADOR"),
            descricao_exibicao: contaInterna.descricao_exibicao ?? null,
            dia_fechamento: Number(contaInterna.dia_fechamento ?? 0),
            dia_vencimento: contaInterna.dia_vencimento ?? null,
            ativo: contaInterna.ativo !== false,
          }
        : null,
      conta_interna: {
        existe: Boolean(contaInterna?.id),
        id: contaInterna?.id ? Number(contaInterna.id) : null,
        tipo_conta: contaInterna?.tipo_conta ?? "COLABORADOR",
        situacao_atual: contaInterna?.ativo === false ? "INATIVA" : contaInterna?.id ? "ATIVA" : "NAO_CRIADA",
        dia_fechamento: contaInterna?.dia_fechamento ?? null,
        dia_vencimento: contaInterna?.dia_vencimento ?? null,
        tipo_fatura: contaInterna?.id ? "MENSAL" : null,
        destino_liquidacao_fatura: contaInterna?.id ? "INTEGRACAO_FOLHA_MES_SEGUINTE" : null,
        permite_parcelamento: contaInterna?.id ? permiteParcelamento : false,
      },
      saldo_em_aberto_total_centavos: saldoEmAbertoTotalCentavos,
      total_faturado_mes_centavos: totalFaturadoMesCentavos,
      faturas_abertas: faturasAbertas,
      faturas_fechadas_recentes: faturasFechadasRecentes,
      faturas_recentes: faturas.slice(0, 6),
      itens_em_aberto_por_origem: itensPorOrigem,
      competencias_em_aberto: faturasAbertas.map((item) => String(item.periodo_referencia ?? "")),
      ultima_importacao_para_folha: ultimaImportacaoParaFolha
        ? {
            referencia_id: Number((ultimaImportacaoParaFolha as Record<string, unknown>).id ?? 0) || null,
            competencia:
              String((ultimaImportacaoParaFolha as Record<string, unknown>).competencia_ano_mes ?? "") ||
              String((ultimaImportacaoParaFolha as Record<string, unknown>).periodo_referencia ?? "") ||
              null,
            status: String((ultimaImportacaoParaFolha as Record<string, unknown>).status ?? "") || null,
          }
        : null,
      status_configuracao_pagamento: {
        possui_config_financeira: Boolean(configFinanceira),
        gera_folha: Boolean(configFinanceira?.gera_folha),
        possui_conta_interna: Boolean(contaInterna?.id),
        faturamento_mensal_conta_interna: Boolean(contaInterna?.id),
        destino_liquidacao_fatura: contaInterna?.id ? "INTEGRACAO_FOLHA_MES_SEGUINTE" : null,
        permite_parcelamento: contaInterna?.id ? permiteParcelamento : false,
        politica_desconto_cartao: configFinanceira?.politica_desconto_cartao ?? null,
        politica_corte_cartao: configFinanceira?.politica_corte_cartao ?? null,
      },
      competencias_folha: competenciasFolha,
      ultimos_lancamentos: ultimosLancamentos,
      folhas_recentes: folhas,
    },
    { status: 200 },
  );
}
