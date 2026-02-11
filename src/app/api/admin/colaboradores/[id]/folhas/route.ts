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
  folha_pagamento_id: number;
  tipo: "PROVENTO" | "DESCONTO";
  valor_centavos: number;
};

type FolhaResumo = FolhaRow & {
  proventos_centavos: number;
  descontos_centavos: number;
  liquido_centavos: number;
};

function toInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const colaboradorId = toInt(ctx.params.id);
  if (!colaboradorId || colaboradorId <= 0) {
    return NextResponse.json({ ok: false, error: "colaborador_id_invalido" }, { status: 400 });
  }

  const { data: colaborador, error: colaboradorError } = await supabase
    .from("colaboradores")
    .select("id")
    .eq("id", colaboradorId)
    .maybeSingle();

  if (colaboradorError) {
    return NextResponse.json(
      { ok: false, error: "falha_buscar_colaborador", detail: colaboradorError.message },
      { status: 500 },
    );
  }

  if (!colaborador) {
    return NextResponse.json({ ok: false, error: "colaborador_nao_encontrado" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const competencia = searchParams.get("competencia");
  const limit = Math.min(Math.max(toInt(searchParams.get("limit")) ?? 24, 1), 60);

  let query = supabase
    .from("folha_pagamento_colaborador")
    .select(
      "id,competencia_ano_mes,colaborador_id,status,data_fechamento,data_pagamento,observacoes,created_at,updated_at",
    )
    .eq("colaborador_id", colaboradorId)
    .order("competencia_ano_mes", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  if (competencia) {
    query = query.eq("competencia_ano_mes", competencia);
  }

  const { data: folhas, error: folhasError } = await query;

  if (folhasError) {
    return NextResponse.json(
      { ok: false, error: "falha_listar_folhas", detail: folhasError.message },
      { status: 500 },
    );
  }

  const folhasRows = (folhas ?? []) as FolhaRow[];
  const folhaIds = folhasRows.map((f) => f.id);

  const eventosMap = new Map<number, { proventos: number; descontos: number }>();

  if (folhaIds.length > 0) {
    const { data: eventos, error: eventosError } = await supabase
      .from("folha_pagamento_eventos")
      .select("folha_pagamento_id,tipo,valor_centavos")
      .in("folha_pagamento_id", folhaIds);

    if (eventosError) {
      return NextResponse.json(
        { ok: false, error: "falha_listar_eventos_folha", detail: eventosError.message },
        { status: 500 },
      );
    }

    for (const evento of (eventos ?? []) as EventoRow[]) {
      const acc = eventosMap.get(evento.folha_pagamento_id) ?? { proventos: 0, descontos: 0 };
      if (evento.tipo === "PROVENTO") {
        acc.proventos += Number(evento.valor_centavos ?? 0);
      } else {
        acc.descontos += Number(evento.valor_centavos ?? 0);
      }
      eventosMap.set(evento.folha_pagamento_id, acc);
    }
  }

  const data: FolhaResumo[] = folhasRows.map((folha) => {
    const totais = eventosMap.get(folha.id) ?? { proventos: 0, descontos: 0 };
    return {
      ...folha,
      proventos_centavos: totais.proventos,
      descontos_centavos: totais.descontos,
      liquido_centavos: totais.proventos - totais.descontos,
    };
  });

  return NextResponse.json({ ok: true, data });
}
