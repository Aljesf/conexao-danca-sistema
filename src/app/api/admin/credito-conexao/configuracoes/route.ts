import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type TipoConta = "ALUNO" | "COLABORADOR";

type ConfigRow = {
  id: number;
  tipo_conta: TipoConta;
  dia_fechamento: number;
  dia_vencimento: number;
  tolerancia_dias: number;
  multa_percentual: number;
  juros_dia_percentual: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

function isTipoConta(v: unknown): v is TipoConta {
  return v === "ALUNO" || v === "COLABORADOR";
}

function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Math.trunc(Number(v));
  return null;
}

function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export async function GET(req: Request) {
  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo_conta");

  let query = supabase
    .from("credito_conexao_configuracoes")
    .select(
      "id,tipo_conta,dia_fechamento,dia_vencimento,tolerancia_dias,multa_percentual,juros_dia_percentual,ativo,created_at,updated_at",
    )
    .order("tipo_conta", { ascending: true });

  if (tipo) query = query.eq("tipo_conta", tipo);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: "falha_listar_configuracoes", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: (data ?? []) as ConfigRow[] });
}

export async function PUT(req: Request) {
  const supabase = getSupabaseAdmin();
  const body = (await req.json()) as unknown;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (!isTipoConta(b.tipo_conta)) {
    return NextResponse.json({ ok: false, error: "tipo_conta_invalido" }, { status: 400 });
  }

  const diaFech = toInt(b.dia_fechamento);
  const diaVenc = toInt(b.dia_vencimento);
  const tol = toInt(b.tolerancia_dias);
  const multa = toNum(b.multa_percentual);
  const jurosDia = toNum(b.juros_dia_percentual);
  const ativo = typeof b.ativo === "boolean" ? b.ativo : true;

  if (diaFech === null || diaFech < 1 || diaFech > 31) {
    return NextResponse.json({ ok: false, error: "dia_fechamento_invalido" }, { status: 400 });
  }
  if (diaVenc === null || diaVenc < 1 || diaVenc > 31) {
    return NextResponse.json({ ok: false, error: "dia_vencimento_invalido" }, { status: 400 });
  }
  if (tol === null || tol < 0 || tol > 30) {
    return NextResponse.json({ ok: false, error: "tolerancia_invalida" }, { status: 400 });
  }
  if (multa === null || multa < 0) {
    return NextResponse.json({ ok: false, error: "multa_invalida" }, { status: 400 });
  }
  if (jurosDia === null || jurosDia < 0) {
    return NextResponse.json({ ok: false, error: "juros_dia_invalido" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("credito_conexao_configuracoes")
    .update({
      dia_fechamento: diaFech,
      dia_vencimento: diaVenc,
      tolerancia_dias: tol,
      multa_percentual: multa,
      juros_dia_percentual: jurosDia,
      ativo,
    })
    .eq("tipo_conta", b.tipo_conta)
    .select(
      "id,tipo_conta,dia_fechamento,dia_vencimento,tolerancia_dias,multa_percentual,juros_dia_percentual,ativo,created_at,updated_at",
    )
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { ok: false, error: "falha_atualizar_config", detail: error?.message ?? "sem_retorno" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, data: updated as ConfigRow });
}
