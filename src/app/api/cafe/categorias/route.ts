import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { guardCafeApiRequest } from "@/lib/auth/cafeApiAccess";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function asIntOrNull(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

export async function GET(req: NextRequest) {
  const denied = await guardCafeApiRequest(req);
  if (denied) return denied as unknown as NextResponse;

  const supabase = getSupabaseServiceClient();
  const url = new URL(req.url);
  const includeInativas = url.searchParams.get("include_inativas") === "1";

  let categoriasQuery = supabase
    .from("cafe_categorias")
    .select("id,centro_custo_id,nome,slug,ordem,ativo")
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });
  if (!includeInativas) {
    categoriasQuery = categoriasQuery.eq("ativo", true);
  }
  const { data: categorias, error: catErr } = await categoriasQuery;

  if (catErr) {
    return NextResponse.json(
      { error: "falha_ao_listar_categorias", detail: catErr.message },
      { status: 500 },
    );
  }

  const categoriaIds = (categorias ?? [])
    .map((c) => Number(c.id))
    .filter((id) => Number.isFinite(id));

  type SubcategoriaRow = {
    id: number;
    categoria_id: number;
    nome: string;
    slug: string;
    ordem: number;
    ativo: boolean;
  };

  let subcategorias: SubcategoriaRow[] = [];
  let subErr: { message: string } | null = null;
  if (categoriaIds.length > 0) {
    let subcategoriasQuery = supabase
      .from("cafe_subcategorias")
      .select("id,categoria_id,nome,slug,ordem,ativo")
      .in("categoria_id", categoriaIds)
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });
    if (!includeInativas) {
      subcategoriasQuery = subcategoriasQuery.eq("ativo", true);
    }
    const result = await subcategoriasQuery;

    subcategorias = (result.data ?? []) as SubcategoriaRow[];
    subErr = result.error ? { message: result.error.message } : null;
  }

  if (subErr) {
    return NextResponse.json(
      { error: "falha_ao_listar_subcategorias", detail: subErr.message },
      { status: 500 },
    );
  }

  const byCategoria = new Map<number, SubcategoriaRow[]>();
  for (const sub of subcategorias ?? []) {
    const categoriaId = Number(sub.categoria_id);
    const list = byCategoria.get(categoriaId) ?? [];
    list.push(sub);
    byCategoria.set(categoriaId, list);
  }

  const payload = (categorias ?? []).map((categoria) => ({
    ...categoria,
    subcategorias: byCategoria.get(Number(categoria.id)) ?? [],
  }));

  return NextResponse.json({ categorias: payload }, { status: 200 });
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const nomeRaw = typeof body.nome === "string" ? body.nome.trim() : "";
  if (nomeRaw.length < 2) {
    return NextResponse.json({ error: "nome_invalido" }, { status: 400 });
  }

  const slug = slugify(nomeRaw);
  if (!slug) {
    return NextResponse.json({ error: "slug_invalido" }, { status: 400 });
  }

  const centroCustoId = asIntOrNull(body.centro_custo_id);
  const ordem = asIntOrNull(body.ordem) ?? 0;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cafe_categorias")
    .insert({
      nome: nomeRaw,
      slug,
      centro_custo_id: centroCustoId,
      ordem,
      ativo: true,
    })
    .select("id,centro_custo_id,nome,slug,ordem,ativo")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: "falha_ao_criar_categoria", detail: error.message }, { status });
  }

  return NextResponse.json({ categoria: data }, { status: 201 });
}

export async function PUT(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const id = asIntOrNull(body.id);
  if (!id) {
    return NextResponse.json({ error: "id_invalido" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (typeof body.nome === "string") {
    const nome = body.nome.trim();
    if (nome.length < 2) {
      return NextResponse.json({ error: "nome_invalido" }, { status: 400 });
    }
    const slug = slugify(nome);
    if (!slug) {
      return NextResponse.json({ error: "slug_invalido" }, { status: 400 });
    }
    patch.nome = nome;
    patch.slug = slug;
  }

  if (typeof body.ordem === "number" && Number.isFinite(body.ordem)) {
    patch.ordem = Math.trunc(body.ordem);
  }

  if (typeof body.ativo === "boolean") {
    patch.ativo = body.ativo;
  }

  if (typeof body.centro_custo_id === "number" && Number.isFinite(body.centro_custo_id)) {
    patch.centro_custo_id = Math.trunc(body.centro_custo_id);
  }

  if (body.centro_custo_id === null) {
    patch.centro_custo_id = null;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nada_para_atualizar" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cafe_categorias")
    .update(patch)
    .eq("id", id)
    .select("id,centro_custo_id,nome,slug,ordem,ativo")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ error: "falha_ao_editar_categoria", detail: error.message }, { status });
  }

  return NextResponse.json({ categoria: data }, { status: 200 });
}
