import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";
import { simularModeloDocumental } from "@/lib/documentos/core/simular-modelo-documental";

type Body = {
  modeloId?: number;
  origemTipo?: "MATRICULA";
  origemId?: number;
};

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const modeloIdPath = Number(id);

  if (!Number.isFinite(modeloIdPath) || modeloIdPath <= 0) {
    return NextResponse.json({ error: "modelo_id_invalido" }, { status: 400 });
  }

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json()) as Body;
  const modeloIdBody = Number(body.modeloId ?? modeloIdPath);
  const origemTipo = body.origemTipo ?? "MATRICULA";
  const origemId = Number(body.origemId);

  if (!Number.isFinite(modeloIdBody) || modeloIdBody !== modeloIdPath) {
    return NextResponse.json({ error: "modelo_id_inconsistente" }, { status: 400 });
  }

  if (origemTipo !== "MATRICULA") {
    return NextResponse.json({ error: "origem_tipo_nao_suportada" }, { status: 400 });
  }

  if (!Number.isFinite(origemId) || origemId <= 0) {
    return NextResponse.json({ error: "origem_id_invalido" }, { status: 400 });
  }

  try {
    const simulacao = await simularModeloDocumental({
      supabase: auth.supabase,
      modeloId: modeloIdPath,
      origemTipo,
      origemId,
    });

    return NextResponse.json(
      {
        htmlSimulado: simulacao.htmlSimulado,
        variaveisResolvidas: simulacao.variaveisResolvidas,
        colecoesResolvidas: simulacao.colecoesResolvidas,
        metadadosRenderizacao: simulacao.metadadosRenderizacao,
        operacao: simulacao.operacao,
        origem: simulacao.origem,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha_simular_modelo";
    const status =
      message === "modelo_documental_nao_encontrado" || message === "Matricula nao encontrada."
        ? 404
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
