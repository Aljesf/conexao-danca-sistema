import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { requireUser } from "@/lib/supabase/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/auth/verifyCronSecret";
import { processarFechamentoAutomaticoMensal } from "@/lib/credito-conexao/processarFechamentoAutomaticoMensal";

type Body = {
  conta_conexao_id?: number;
  force?: boolean;
  dry_run?: boolean;
};

/** Chamada manual autenticada por sessão */
export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as never);
  if (denied) return denied as never;

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as Body;
  const contaConexaoId = Number(body.conta_conexao_id);
  const supabase = createAdminClient();

  const resultado = await processarFechamentoAutomaticoMensal({
    supabase,
    contaConexaoId: Number.isFinite(contaConexaoId) && contaConexaoId > 0 ? contaConexaoId : null,
    force: body.force === true,
    dryRun: body.dry_run === true,
  });

  return NextResponse.json(resultado, { status: 200 });
}

/** Chamada automática via Vercel Cron — protegida por CRON_SECRET */
export async function GET(req: NextRequest) {
  const denied = verifyCronSecret(req);
  if (denied) return denied;

  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  if (today.getDate() !== lastDay) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: `Hoje é dia ${today.getDate()}, fechamento é no último dia do mês (${lastDay}).`,
    });
  }

  const supabase = createAdminClient();

  const resultado = await processarFechamentoAutomaticoMensal({
    supabase,
    force: false,
    dryRun: false,
  });

  return NextResponse.json(resultado, { status: 200 });
}
