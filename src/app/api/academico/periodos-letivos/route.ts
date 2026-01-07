import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type PeriodoLetivoInput = {
  codigo: string;
  titulo: string;
  ano_referencia: number;
  data_inicio: string;
  data_fim: string;
  inicio_letivo_janeiro?: string | null;
  ativo?: boolean;
  observacoes?: string | null;
};

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("periodos_letivos")
    .select("id,codigo,titulo,ano_referencia,data_inicio,data_fim,inicio_letivo_janeiro,ativo,observacoes")
    .order("ano_referencia", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const body = (await req.json().catch(() => null)) as PeriodoLetivoInput | null;
  if (!body) return bad("JSON invalido.");

  if (!body.codigo?.trim()) return bad("codigo e obrigatorio.");
  if (!body.titulo?.trim()) return bad("titulo e obrigatorio.");
  if (!Number.isFinite(body.ano_referencia)) return bad("ano_referencia e obrigatorio.");
  if (!body.data_inicio?.trim()) return bad("data_inicio e obrigatorio.");
  if (!body.data_fim?.trim()) return bad("data_fim e obrigatorio.");

  const payload = {
    codigo: body.codigo.trim(),
    titulo: body.titulo.trim(),
    ano_referencia: body.ano_referencia,
    data_inicio: body.data_inicio,
    data_fim: body.data_fim,
    inicio_letivo_janeiro: body.inicio_letivo_janeiro ?? null,
    ativo: body.ativo ?? true,
    observacoes: body.observacoes ?? null,
  };

  const { data, error } = await supabase.from("periodos_letivos").insert(payload).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
