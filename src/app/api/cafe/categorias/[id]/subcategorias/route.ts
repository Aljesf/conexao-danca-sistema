import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
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

type Ctx = {
  params: {
    id: string;
  };
};

function asCategoriaId(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const id = Math.trunc(value);
  return id > 0 ? id : null;
}

export async function GET(req: Request, ctx: Ctx) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const categoriaId = asCategoriaId(ctx.params.id);
  if (!categoriaId) {
    return NextResponse.json({ error: "categoria_id_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cafe_subcategorias")
    .select("id,categoria_id,nome,slug,ordem,ativo")
    .eq("categoria_id", categoriaId)
    .eq("ativo", true)
    .order("ordem", { ascending: true })
    .order("nome", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "falha_ao_listar_subcategorias", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ subcategorias: data ?? [] }, { status: 200 });
}

export async function POST(req: Request, ctx: Ctx) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const categoriaId = asCategoriaId(ctx.params.id);
  if (!categoriaId) {
    return NextResponse.json({ error: "categoria_id_invalido" }, { status: 400 });
  }

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

  const ordemRaw = Number(body.ordem);
  const ordem = Number.isFinite(ordemRaw) ? Math.trunc(ordemRaw) : 0;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cafe_subcategorias")
    .insert({
      categoria_id: categoriaId,
      nome: nomeRaw,
      slug,
      ordem,
      ativo: true,
    })
    .select("id,categoria_id,nome,slug,ordem,ativo")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json(
      { error: "falha_ao_criar_subcategoria", detail: error.message },
      { status },
    );
  }

  return NextResponse.json({ subcategoria: data }, { status: 201 });
}
