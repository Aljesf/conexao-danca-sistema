import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type ConjuntoCreate = {
  codigo: string;
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
};

type ConjuntoRow = {
  id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
};

type GrupoRow = {
  id: number;
  conjunto_id: number;
  codigo: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  obrigatorio: boolean;
  ativo: boolean;
  papel: "PRINCIPAL" | "OBRIGATORIO" | "OPCIONAL" | "ADICIONAL" | null;
  created_at?: string;
  updated_at?: string;
};

function normCodigo(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "_");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const includeGrupos = url.searchParams.get("include") === "grupos";
  const supabase = await getSupabaseServerSSR();

  const { data: conjuntos, error: errConj } = await supabase
    .from("documentos_conjuntos")
    .select("id,codigo,nome,descricao,ativo,created_at,updated_at")
    .order("nome", { ascending: true });

  if (errConj) {
    return NextResponse.json({ ok: false, message: errConj.message }, { status: 500 });
  }

  if (!includeGrupos) {
    return NextResponse.json({ ok: true, data: conjuntos ?? [] }, { status: 200 });
  }

  const conjuntoIds = (conjuntos ?? []).map((c) => c.id).filter((id) => Number.isFinite(id));
  if (conjuntoIds.length === 0) {
    return NextResponse.json({ ok: true, data: [] }, { status: 200 });
  }

  const { data: grupos, error: errGrupos } = await supabase
    .from("documentos_grupos")
    .select("id,conjunto_id,codigo,nome,descricao,ordem,obrigatorio,ativo,papel,created_at,updated_at")
    .in("conjunto_id", conjuntoIds)
    .order("conjunto_id", { ascending: true })
    .order("ordem", { ascending: true });

  if (errGrupos) {
    return NextResponse.json({ ok: false, message: errGrupos.message }, { status: 500 });
  }

  const gruposByConjunto = new Map<number, GrupoRow[]>();
  for (const grupo of (grupos ?? []) as GrupoRow[]) {
    const grupoList = gruposByConjunto.get(grupo.conjunto_id) ?? [];
    grupoList.push(grupo);
    gruposByConjunto.set(grupo.conjunto_id, grupoList);
  }

  const data = (conjuntos ?? []).map((c) => ({
    ...(c as ConjuntoRow),
    grupos: gruposByConjunto.get(c.id) ?? [],
  }));

  return NextResponse.json({ ok: true, data }, { status: 200 });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json()) as ConjuntoCreate;

  if (!body?.codigo || !body?.nome) {
    return NextResponse.json(
      { ok: false, message: "Campos obrigatorios: codigo, nome." },
      { status: 400 }
    );
  }

  const payload = {
    codigo: normCodigo(body.codigo),
    nome: body.nome.trim(),
    descricao: body.descricao ?? null,
    ativo: typeof body.ativo === "boolean" ? body.ativo : true,
  };

  const { data, error } = await supabase
    .from("documentos_conjuntos")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
