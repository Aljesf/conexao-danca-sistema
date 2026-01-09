import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { fecharFaturaPorCompetencia, isCompetencia } from "@/lib/creditoConexao/fechamento";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type Payload = {
  competencia: string;
  tipo_conta?: "ALUNO" | "COLABORADOR" | null;
};

type ResultadoItem = {
  conta_conexao_id: number;
  ok: boolean;
  data?: unknown;
  error?: string;
};

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

  const { competencia, tipo_conta } = raw as Payload;

  if (!competencia || !isCompetencia(competencia)) {
    return NextResponse.json({ ok: false, error: "competencia_invalida" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("credito_conexao_contas")
    .select("id, tipo_conta");

  if (tipo_conta) {
    query = query.eq("tipo_conta", tipo_conta);
  }

  const { data: contas, error: contasErr } = await query;

  if (contasErr) {
    return NextResponse.json({ ok: false, error: "falha_listar_contas", detail: contasErr.message }, { status: 500 });
  }

  const resultados: ResultadoItem[] = [];

  for (const conta of contas ?? []) {
    const contaId = Number((conta as { id?: number }).id);
    if (!Number.isFinite(contaId) || contaId <= 0) {
      resultados.push({ conta_conexao_id: 0, ok: false, error: "conta_invalida" });
      continue;
    }

    const result = await fecharFaturaPorCompetencia({
      supabase,
      contaConexaoId: contaId,
      competencia,
    });

    if (result.ok) {
      resultados.push({ conta_conexao_id: contaId, ok: true, data: result.data });
    } else {
      resultados.push({ conta_conexao_id: contaId, ok: false, error: result.error });
    }
  }

  return NextResponse.json({ ok: true, data: resultados });
}
