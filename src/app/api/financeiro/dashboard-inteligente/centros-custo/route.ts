import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { supabaseAdmin } from "@/lib/financeiro/dashboardInteligente";
import { calcularDashboardCentroCusto } from "@/lib/financeiro/dashboardCentroCusto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Configuracao do Supabase ausente." }, { status: 500 });
  }

  try {
    const url = new URL(req.url);
    const centroCustoIdRaw = url.searchParams.get("centro_custo_id");
    const centroCustoId = centroCustoIdRaw && /^\d+$/.test(centroCustoIdRaw) ? Number(centroCustoIdRaw) : null;
    const payload = await calcularDashboardCentroCusto(supabaseAdmin, {
      centroCustoId,
    });

    return NextResponse.json({
      ok: true,
      ...payload,
    });
  } catch (error) {
    console.error("[GET /api/financeiro/dashboard-inteligente/centros-custo] erro", error);
    return NextResponse.json(
      { ok: false, error: "Erro ao carregar resultado por centro de custo." },
      { status: 500 },
    );
  }
}
