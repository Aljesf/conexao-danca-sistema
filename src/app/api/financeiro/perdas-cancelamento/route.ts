import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { listarPerdasCancelamentoDetalhadas } from "@/lib/financeiro/contas-receber-auditoria";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

function summarizeError(error: unknown): { message: string; stack: string | null } {
  if (!(error instanceof Error)) {
    return { message: "erro_desconhecido", stack: null };
  }

  return {
    message: error.message,
    stack: error.stack
      ? error.stack
          .split("\n")
          .slice(0, 4)
          .map((line) => line.trim())
          .join(" | ")
      : null,
  };
}

function isMissingCancelamentoSchemaError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("column") &&
    (message.includes("cancelamento_tipo") || message.includes("gera_perda_financeira")) &&
    (message.includes("does not exist") || message.includes("nao existe"))
  );
}

export async function GET(request: NextRequest) {
  const denied = await guardApiByRole(request);
  if (denied) return denied;

  try {
    const supabase = getSupabaseAdmin();
    const items = await listarPerdasCancelamentoDetalhadas(supabase);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    const summary = summarizeError(error);
    console.error("[/api/financeiro/perdas-cancelamento]", {
      route: "/api/financeiro/perdas-cancelamento",
      stage: "listar_perdas_cancelamento_detalhadas",
      message: summary.message,
      stack: summary.stack,
    });

    if (isMissingCancelamentoSchemaError(error)) {
      return NextResponse.json({
        ok: true,
        items: [],
        warning: "schema_cancelamento_real_ainda_nao_aplicado",
      });
    }

    return NextResponse.json({ ok: false, error: "erro_listar_perdas_cancelamento" }, { status: 500 });
  }
}
