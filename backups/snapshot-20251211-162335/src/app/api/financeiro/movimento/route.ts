import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "[/api/financeiro/movimento] Variaveis NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao definidas."
  );
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET(req: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const tipo = searchParams.get("tipo");
  const centroCustoId = searchParams.get("centro_custo_id");
  const dataInicio = searchParams.get("data_inicio");
  const dataFim = searchParams.get("data_fim");

  let query = supabaseAdmin
    .from("movimento_financeiro")
    .select(
      `
        id,
        tipo,
        centro_custo_id,
        valor_centavos,
        data_movimento,
        origem,
        origem_id,
        descricao,
        centros_custo:centro_custo_id ( nome )
      `
    )
    .order("data_movimento", { ascending: true });

  if (tipo) {
    query = query.eq("tipo", tipo);
  }

  if (centroCustoId) {
    const centroIdNumber = Number(centroCustoId);
    if (!Number.isNaN(centroIdNumber)) {
      query = query.eq("centro_custo_id", centroIdNumber);
    }
  }

  if (dataInicio) {
    query = query.gte("data_movimento", `${dataInicio}T00:00:00`);
  }

  if (dataFim) {
    query = query.lte("data_movimento", `${dataFim}T23:59:59`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar movimento_financeiro", error);
    return NextResponse.json(
      { error: "Erro ao buscar movimento financeiro" },
      { status: 500 }
    );
  }

  const result = (data || []).map((m: any) => ({
    id: m.id,
    tipo: m.tipo,
    centro_custo_nome: m.centros_custo?.nome ?? "",
    valor_centavos: m.valor_centavos,
    data_movimento: m.data_movimento,
    origem: m.origem,
    origem_id: m.origem_id,
    descricao: m.descricao,
  }));

  return NextResponse.json({ ok: true, movimentos: result });
}
