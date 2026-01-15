import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LojaListaDemandaStatus = "ATIVA" | "ENCERRADA";

type LojaListaDemandaRow = {
  id: number;
  titulo: string;
  contexto: string | null;
  status: LojaListaDemandaStatus;
  bloqueada: boolean;
  observacoes: string | null;
  criado_em: string;
  criado_por: string | null;
  bloqueada_em: string | null;
  bloqueada_por: string | null;
  encerrada_em: string | null;
  encerrada_por: string | null;
};

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("loja_listas_demanda")
    .select("*")
    .order("criado_em", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as LojaListaDemandaRow[];
  const ativas = rows.filter((row) => row.status === "ATIVA");
  const encerradas = rows.filter((row) => row.status === "ENCERRADA");

  return NextResponse.json({ ativas, encerradas, todas: rows }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const body = (await req.json().catch(() => null)) as
    | { titulo?: string; contexto?: string | null }
    | null;

  const titulo = body?.titulo?.trim() ?? "";
  const contexto = body?.contexto ?? null;

  if (!titulo) {
    return NextResponse.json({ error: "Titulo e obrigatorio" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("loja_listas_demanda")
    .insert({ titulo, contexto })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
