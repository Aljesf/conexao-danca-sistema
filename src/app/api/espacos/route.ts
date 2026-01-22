import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EspacoPayload = {
  local_id?: number;
  nome?: string;
  tipo?: string;
  capacidade?: number | null;
  observacoes?: string | null;
  ativo?: boolean;
};

function normalizeTipo(value: string | undefined): string {
  const tipo = (value ?? "SALA").toString().trim().toUpperCase();
  return ["SALA", "PALCO", "AREA", "OUTRO"].includes(tipo) ? tipo : "SALA";
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const url = new URL(request.url);
  const localIdRaw = url.searchParams.get("local_id");
  const localId = localIdRaw ? Number(localIdRaw) : null;

  let query = supabase
    .from("espacos")
    .select("id,local_id,nome,tipo,capacidade,ativo,observacoes,created_at,updated_at,local:locais(id,nome,tipo)")
    .order("nome", { ascending: true });

  if (localIdRaw) {
    if (!Number.isInteger(localId) || (localId as number) <= 0) {
      return NextResponse.json({ error: "local_id_invalido" }, { status: 400 });
    }
    query = query.eq("local_id", localId as number);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, espacos: data ?? [] }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const body = (await request.json().catch(() => null)) as EspacoPayload | null;
  const localId = Number(body?.local_id);
  const nome = body?.nome?.trim();

  if (!Number.isInteger(localId) || localId <= 0) {
    return NextResponse.json({ error: "local_id_obrigatorio" }, { status: 400 });
  }
  if (!nome) {
    return NextResponse.json({ error: "nome_obrigatorio" }, { status: 400 });
  }

  const payload = {
    local_id: localId,
    nome,
    tipo: normalizeTipo(body?.tipo),
    capacidade: body?.capacidade ?? null,
    observacoes: body?.observacoes ?? null,
    ativo: typeof body?.ativo === "boolean" ? body.ativo : true,
  };

  const { data, error } = await supabase
    .from("espacos")
    .insert(payload)
    .select("id,local_id,nome,tipo,capacidade,ativo,observacoes,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, espaco: data }, { status: 201 });
}


