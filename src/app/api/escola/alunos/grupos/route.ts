import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isGrupoTipo,
  mapNucleoToGrupo,
  normalizeText,
  NUCLEO_SELECT,
  type GrupoApi,
  type NucleoRow,
} from "./_lib";

type GrupoCreate = {
  nome: string;
  categoria?: string | null;
  subcategoria?: string | null;
  tipo: "TEMPORARIO" | "DURADOURO";
  descricao?: string | null;
  ativo?: boolean;
  data_inicio?: string | null;
  data_fim?: string | null;
};

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();

  const supabase = createAdminClient();

  let q = supabase
    .from("nucleos")
    .select(NUCLEO_SELECT)
    .order("nome", { ascending: true });

  if (search.length >= 2) {
    const s = search.replaceAll("%", "").replaceAll("_", "");
    q = q.or(`nome.ilike.%${s}%,categoria.ilike.%${s}%,subcategoria.ilike.%${s}%`);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const grupos = ((data ?? []) as NucleoRow[]).map(mapNucleoToGrupo);
  return NextResponse.json({ ok: true, data: grupos satisfies GrupoApi[] });
}

export async function POST(req: Request): Promise<Response> {
  const supabase = createAdminClient();

  let body: GrupoCreate;
  try {
    body = (await req.json()) as GrupoCreate;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido." }, { status: 400 });
  }

  if (!body?.nome?.trim()) {
    return NextResponse.json({ ok: false, error: "nome e obrigatorio." }, { status: 400 });
  }
  if (!isGrupoTipo(body?.tipo)) {
    return NextResponse.json({ ok: false, error: "tipo e obrigatorio." }, { status: 400 });
  }

  const payload = {
    nome: body.nome.trim(),
    categoria: normalizeText(body.categoria),
    subcategoria: normalizeText(body.subcategoria),
    tipo: body.tipo,
    descricao: normalizeText(body.descricao),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("nucleos")
    .insert(payload)
    .select(NUCLEO_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: mapNucleoToGrupo(data as NucleoRow) }, { status: 201 });
}
