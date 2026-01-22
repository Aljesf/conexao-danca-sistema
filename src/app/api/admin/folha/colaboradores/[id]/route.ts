import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type FolhaRow = {
  id: number;
  competencia_ano_mes: string;
  colaborador_id: number;
  status: string;
  data_fechamento: string | null;
  data_pagamento: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

type EventoRow = {
  id: number;
  tipo: "PROVENTO" | "DESCONTO";
  descricao: string;
  valor_centavos: number;
  origem_tipo: string | null;
  origem_id: number | null;
  created_at: string;
  updated_at: string;
};

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return null;
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = getSupabaseAdmin();
  const folhaId = toInt(ctx.params.id);

  if (!folhaId) {
    return NextResponse.json({ ok: false, error: "folha_id_invalido" }, { status: 400 });
  }

  const { data: folha, error } = await supabase
    .from("folha_pagamento_colaborador")
    .select(
      "id,competencia_ano_mes,colaborador_id,status,data_fechamento,data_pagamento,observacoes,created_at,updated_at",
    )
    .eq("id", folhaId)
    .single();

  if (error || !folha) {
    return NextResponse.json(
      { ok: false, error: "folha_nao_encontrada", detail: error?.message ?? "sem_retorno" },
      { status: 404 },
    );
  }

  const { data: eventos, error: eventosError } = await supabase
    .from("folha_pagamento_eventos")
    .select("id,tipo,descricao,valor_centavos,origem_tipo,origem_id,created_at,updated_at")
    .eq("folha_pagamento_id", folhaId)
    .order("id", { ascending: true });

  if (eventosError) {
    return NextResponse.json(
      { ok: false, error: "falha_listar_eventos", detail: eventosError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: { ...(folha as FolhaRow), eventos: (eventos ?? []) as EventoRow[] },
  });
}
