import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import {
  supabaseAdmin,
  obterSnapshotDoDia,
  gerarESalvarSnapshot,
} from "@/lib/financeiro/dashboardInteligente";

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";

  try {
    if (!force) {
      try {
        const { snapshot, analise } = await obterSnapshotDoDia(supabaseAdmin, {
          criarSeAusente: false,
        });
        return NextResponse.json({ ok: true, snapshot, analise, idempotent: true });
      } catch {
        // segue para gerar
      }
    }

    const { snapshot, analise } = await gerarESalvarSnapshot(supabaseAdmin, {
      comAnaliseGpt: true,
    });

    return NextResponse.json({ ok: true, snapshot, analise, idempotent: false });
  } catch (err) {
    console.error("[POST /api/financeiro/dashboard-inteligente/cron-diario] Erro:", err);
    return NextResponse.json(
      { ok: false, error: "Erro ao processar cron diario do dashboard inteligente." },
      { status: 500 }
    );
  }
}
