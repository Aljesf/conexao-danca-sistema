import { NextResponse, type NextRequest } from "next/server";
import { executarReprocessamentoFinanceiroMatricula } from "@/lib/financeiro/reprocessamentoMatricula";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const matriculaId = Number(id);

  if (!Number.isFinite(matriculaId) || matriculaId <= 0) {
    return NextResponse.json({ ok: false, error: "matricula_id_invalido" }, { status: 400 });
  }

  const resultado = await executarReprocessamentoFinanceiroMatricula(request, matriculaId, {
    motivo: "Reprocessamento financeiro via governanca da cobranca.",
  });

  if (!resultado.ok) {
    return NextResponse.json(resultado.body ?? { ok: false, error: "falha_reprocessar_matricula" }, { status: resultado.status });
  }

  return NextResponse.json(
    {
      ok: true,
      fluxo_reaproveitado: "/api/escola/matriculas/[id]/reprocessar-financeiro",
      matricula_id: matriculaId,
      resumo: resultado.resumo,
      result: resultado.execucao,
    },
    { status: 200 },
  );
}
