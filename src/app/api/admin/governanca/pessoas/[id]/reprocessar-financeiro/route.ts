import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { executarReprocessamentoFinanceiroMatricula } from "@/lib/financeiro/reprocessamentoMatricula";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MatriculaRow = {
  id: number;
  pessoa_id: number | null;
  responsavel_financeiro_id: number | null;
  status: string | null;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const denied = await guardApiByRole(request as Request);
  if (denied) return denied;

  const { id } = await context.params;
  const pessoaId = Number(id);

  if (!Number.isFinite(pessoaId) || pessoaId <= 0) {
    return NextResponse.json({ ok: false, error: "pessoa_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: matriculasData, error: matriculasError } = await supabase
    .from("matriculas")
    .select("id,pessoa_id,responsavel_financeiro_id,status")
    .or(`responsavel_financeiro_id.eq.${pessoaId},pessoa_id.eq.${pessoaId}`)
    .order("id", { ascending: false });

  if (matriculasError) {
    return NextResponse.json(
      {
        ok: false,
        error: "falha_buscar_matriculas_relacionadas",
        detail: matriculasError.message,
      },
      { status: 500 },
    );
  }

  const matriculas = Array.from(
    new Map(
      (((matriculasData ?? []) as MatriculaRow[]) ?? []).map((item) => [item.id, item] as const),
    ).values(),
  );

  if (matriculas.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "pessoa_sem_matriculas_relacionadas",
      },
      { status: 404 },
    );
  }

  const resultados: Array<{
    matricula_id: number;
    status_matricula: string | null;
    ok: boolean;
    resumo?: unknown;
    error?: unknown;
    status_http: number;
  }> = [];

  for (const matricula of matriculas) {
    const resultado = await executarReprocessamentoFinanceiroMatricula(request, matricula.id, {
      motivo: "Reprocessamento financeiro em lote via governanca da cobranca.",
    });

    if (resultado.ok) {
      resultados.push({
        matricula_id: matricula.id,
        status_matricula: matricula.status,
        ok: true,
        resumo: resultado.resumo,
        status_http: resultado.status,
      });
      continue;
    }

    resultados.push({
      matricula_id: matricula.id,
      status_matricula: matricula.status,
      ok: false,
      error: resultado.body,
      status_http: resultado.status,
    });
  }

  const sucessos = resultados.filter((item) => item.ok);
  const erros = resultados.filter((item) => !item.ok);
  const faturasAfetadas = Array.from(
    new Set(
      sucessos.flatMap((item) => {
        const resumo = item.resumo as { faturas_afetadas?: string[] } | undefined;
        return Array.isArray(resumo?.faturas_afetadas) ? resumo.faturas_afetadas : [];
      }),
    ),
  );

  return NextResponse.json(
    {
      ok: true,
      fluxo_reaproveitado: "/api/escola/matriculas/[id]/reprocessar-financeiro",
      pessoa_id: pessoaId,
      matriculas_processadas: resultados.length,
      matriculas_com_sucesso: sucessos.length,
      matriculas_com_erro: erros.length,
      faturas_afetadas: faturasAfetadas,
      resultados,
    },
    { status: 200 },
  );
}
