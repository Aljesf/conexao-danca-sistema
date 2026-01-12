import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import {
  supabaseAdmin,
  obterSnapshotDoDia,
} from "@/lib/financeiro/dashboardInteligente";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  try {
    const { snapshot, analise } = await obterSnapshotDoDia(supabaseAdmin, {
      criarSeAusente: true,
    });

    const analiseResumo = analise
      ? {
          id: analise.id,
          created_at: analise.created_at,
          qtd_alertas: analise.alertas?.length ?? 0,
        }
      : null;

    return NextResponse.json({
      ok: true,
      snapshot_id: snapshot.id,
      data_base: snapshot.data_base,
      periodo_inicio: snapshot.periodo_inicio,
      periodo_fim: snapshot.periodo_fim,
      has_gpt: !!analise,
      analise: analiseResumo,
      snapshot,
      analise_raw: analise ?? null,
    });
  } catch (err) {
    console.error("[GET /api/financeiro/dashboard-inteligente] Erro:", err);
    return NextResponse.json(
      { ok: false, error: "Erro ao carregar dashboard inteligente." },
      { status: 500 }
    );
  }
}
