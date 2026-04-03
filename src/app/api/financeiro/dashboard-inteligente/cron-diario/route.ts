import { NextRequest, NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { verifyCronSecret } from "@/lib/auth/verifyCronSecret";
import {
  supabaseAdmin,
  obterSnapshotDoDia,
  gerarESalvarSnapshot,
} from "@/lib/financeiro/dashboardInteligente";

async function executarCronDiario(force: boolean) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 },
    );
  }

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
    console.error("[cron-diario] Erro:", err);
    return NextResponse.json(
      { ok: false, error: "Erro ao processar cron diario do dashboard inteligente." },
      { status: 500 },
    );
  }
}

/** Chamada manual autenticada por sessão */
export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";

  return executarCronDiario(force);
}

/** Chamada automática via Vercel Cron — protegida por CRON_SECRET */
export async function GET(req: NextRequest) {
  const denied = verifyCronSecret(req);
  if (denied) return denied;

  return executarCronDiario(false);
}
