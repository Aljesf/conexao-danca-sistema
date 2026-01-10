import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type GrupoCreate = {
  nome: string;
  categoria: string;
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

  const supabase = await createClient();

  let q = supabase
    .from("aluno_grupos")
    .select("id,nome,categoria,subcategoria,tipo,descricao,ativo,data_inicio,data_fim,created_at,updated_at")
    .order("categoria", { ascending: true })
    .order("subcategoria", { ascending: true })
    .order("nome", { ascending: true });

  if (search.length >= 2) {
    const s = search.replaceAll("%", "").replaceAll("_", "");
    q = q.or(`nome.ilike.%${s}%,categoria.ilike.%${s}%,subcategoria.ilike.%${s}%`);
  }

  const { data, error } = await q;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient();

  let body: GrupoCreate;
  try {
    body = (await req.json()) as GrupoCreate;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido." }, { status: 400 });
  }

  if (!body?.nome?.trim()) {
    return NextResponse.json({ ok: false, error: "nome e obrigatorio." }, { status: 400 });
  }
  if (!body?.categoria?.trim()) {
    return NextResponse.json({ ok: false, error: "categoria e obrigatoria." }, { status: 400 });
  }
  if (!body?.tipo) {
    return NextResponse.json({ ok: false, error: "tipo e obrigatorio." }, { status: 400 });
  }

  const payload = {
    nome: body.nome.trim(),
    categoria: body.categoria.trim(),
    subcategoria: body.subcategoria?.trim() ?? null,
    tipo: body.tipo,
    descricao: body.descricao ?? null,
    ativo: body.ativo ?? true,
    data_inicio: body.data_inicio ?? null,
    data_fim: body.data_fim ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("aluno_grupos")
    .insert(payload)
    .select("id,nome,categoria,subcategoria,tipo,descricao,ativo,data_inicio,data_fim,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
