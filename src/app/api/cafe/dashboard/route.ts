import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { buildCafeDashboard } from "@/lib/cafe/dashboard";

const QuerySchema = z.object({
  periodo: z.enum(["7d", "15d", "30d", "hoje", "mes"]).optional(),
  data_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  data_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request as unknown as Request);
  if (denied) return denied as unknown as NextResponse;

  try {
    const url = new URL(request.url);
    console.log("[CAFE_DASHBOARD][GET]", Object.fromEntries(url.searchParams.entries()));
    const parsed = QuerySchema.safeParse({
      periodo: url.searchParams.get("periodo") ?? undefined,
      data_inicio: url.searchParams.get("data_inicio") ?? undefined,
      data_fim: url.searchParams.get("data_fim") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "query_invalida", detalhe: parsed.error.flatten() }, { status: 400 });
    }

    const data = await buildCafeDashboard({
      periodo: parsed.data.periodo ?? "30d",
      dataInicio: parsed.data.data_inicio ?? null,
      dataFim: parsed.data.data_fim ?? null,
    });

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[CAFE_DASHBOARD][ERRO]", error);
    return NextResponse.json(
      {
        ok: false,
        erro_controlado: "falha_carregar_dashboard_cafe",
        detalhe: error instanceof Error ? error.message : "erro_desconhecido",
        resumo: {
          faturamento_total_centavos: 0,
          total_vendas: 0,
          ticket_medio_centavos: 0,
          itens_vendidos: 0,
          clientes_identificados_percentual: 0,
        },
        horarios: {
          faixas: [],
          faixa_pico: { hora: null, vendas: 0, faturamento_centavos: 0 },
        },
        consumo_por_perfil: [],
        alunos: { top_produtos: [], horarios_preferidos: [] },
        produtos: { mais_vendidos: [], maior_receita: [] },
        estoque: {
          alertas: [],
          quantidade_alertas: 0,
          quantidade_repor_agora: 0,
          quantidade_zerado: 0,
        },
        financeiro: {
          total_imediato_recebido_centavos: 0,
          total_recebivel_cartao_centavos: 0,
          total_conta_interna_aluno_centavos: 0,
          total_conta_interna_colaborador_centavos: 0,
          total_pendente_liquidacao_centavos: 0,
          distribuicao_contas: [],
        },
        meios_pagamento: [],
        explicacao: {
          texto_curto: "Dashboard do Cafe indisponivel no momento. A API retornou um estado vazio funcional.",
        },
      },
      { status: 200 },
    );
  }
}
