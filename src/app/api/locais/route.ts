import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LocalPayload = {
  nome?: string;
  tipo?: string;
  endereco?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
};

function normalizeTipo(value: string | undefined): string {
  const tipo = (value ?? "INTERNO").toString().trim().toUpperCase();
  return tipo === "EXTERNO" ? "EXTERNO" : "INTERNO";
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data, error } = await supabase
    .from("locais")
    .select("id,nome,tipo,endereco,observacoes,ativo,created_at,updated_at")
    .order("nome", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, locais: data ?? [] }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const body = (await request.json().catch(() => null)) as LocalPayload | null;
  const nome = body?.nome?.trim();

  if (!nome) {
    return NextResponse.json({ error: "nome_obrigatorio" }, { status: 400 });
  }

  const payload = {
    nome,
    tipo: normalizeTipo(body?.tipo),
    endereco: body?.endereco ?? null,
    observacoes: body?.observacoes ?? null,
    ativo: typeof body?.ativo === "boolean" ? body.ativo : true,
  };

  const { data, error } = await supabase
    .from("locais")
    .insert(payload)
    .select("id,nome,tipo,endereco,observacoes,ativo,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, local: data }, { status: 201 });
}


