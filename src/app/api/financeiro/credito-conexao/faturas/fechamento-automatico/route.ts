import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { createAdminClient } from "@/lib/supabase/admin";

type Body = {
  force?: boolean;
};

type ConfigRow = {
  dia_fechamento_faturas: number | null;
};

function localToday(): Date {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
}

function currentPeriodFromDate(d: Date): string {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;

  const body = (await req.json().catch(() => ({}))) as Body;
  const force = body.force === true;

  const supabaseAdmin = createAdminClient();
  const now = localToday();
  const todayDay = Number(now.toISOString().slice(8, 10));
  const currentPeriod = currentPeriodFromDate(now);

  const { data: cfg, error: cfgErr } = await supabaseAdmin
    .from("financeiro_config")
    .select("dia_fechamento_faturas")
    .eq("id", 1)
    .maybeSingle<ConfigRow>();

  if (cfgErr) {
    return NextResponse.json(
      { ok: false, error: "erro_ler_config", detail: cfgErr.message },
      { status: 500 },
    );
  }

  const diaFechamento = Number(cfg?.dia_fechamento_faturas ?? 1);
  if (!force && todayDay !== diaFechamento) {
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: "fora_do_dia_configurado",
        today_day: todayDay,
        dia_fechamento_configurado: diaFechamento,
      },
      { status: 200 },
    );
  }

  const { data: contasAluno, error: contasErr } = await supabaseAdmin
    .from("credito_conexao_contas")
    .select("id")
    .eq("tipo_conta", "ALUNO")
    .eq("ativo", true);

  if (contasErr) {
    return NextResponse.json(
      { ok: false, error: "erro_listar_contas_aluno", detail: contasErr.message },
      { status: 500 },
    );
  }

  const contaIds = (contasAluno ?? [])
    .map((row) => Number((row as { id?: number }).id))
    .filter((id) => Number.isFinite(id));

  if (contaIds.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        skipped: true,
        reason: "sem_contas_aluno_ativas",
        current_period: currentPeriod,
        total: 0,
        ids: [],
      },
      { status: 200 },
    );
  }

  const { data: faturas, error: fatErr } = await supabaseAdmin
    .from("credito_conexao_faturas")
    .select("id,conta_conexao_id,periodo_referencia,status")
    .eq("status", "ABERTA")
    .in("conta_conexao_id", contaIds)
    .lt("periodo_referencia", currentPeriod)
    .order("id", { ascending: true });

  if (fatErr) {
    return NextResponse.json(
      { ok: false, error: "erro_listar_faturas", detail: fatErr.message },
      { status: 500 },
    );
  }

  const ids = (faturas ?? [])
    .map((fatura) => Number((fatura as { id?: number }).id))
    .filter((id) => Number.isFinite(id));

  // Modo seguro: retorna o lote elegivel.
  // O fechamento efetivo (status + cobranca) continua no endpoint unitario /[id]/fechar.
  return NextResponse.json(
    {
      ok: true,
      dia_fechamento_configurado: diaFechamento,
      current_period: currentPeriod,
      total: ids.length,
      ids,
      dry_run: true,
    },
    { status: 200 },
  );
}
