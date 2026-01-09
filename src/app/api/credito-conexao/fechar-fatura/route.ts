import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { fecharFaturaPorCompetencia, isCompetencia } from "@/lib/creditoConexao/fechamento";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type Payload = {
  conta_conexao_id: number;
  competencia: string;
};

function toPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const { conta_conexao_id, competencia } = raw as Payload;
  const contaId = toPositiveNumber(conta_conexao_id);

  if (!contaId || !competencia || !isCompetencia(competencia)) {
    return NextResponse.json({ ok: false, error: "campos_obrigatorios_invalidos" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const result = await fecharFaturaPorCompetencia({
    supabase,
    contaConexaoId: contaId,
    competencia,
  });

  if (!result.ok) {
    const status =
      result.error === "campos_obrigatorios_invalidos"
        ? 400
        : result.error === "conta_nao_encontrada"
          ? 404
          : 500;

    return NextResponse.json({ ok: false, error: result.error, detail: result.detail ?? null }, { status });
  }

  return NextResponse.json({ ok: true, data: result.data });
}
