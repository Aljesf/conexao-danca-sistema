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

export async function PUT(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const idRaw = Number(body.id);
  const id = Number.isFinite(idRaw) ? Math.trunc(idRaw) : null;
  if (!id || id <= 0) {
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

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nada_para_atualizar" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cafe_subcategorias")
    .update(patch)
    .eq("id", id)
    .select("id,categoria_id,nome,slug,ordem,ativo")
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json(
      { error: "falha_ao_editar_subcategoria", detail: error.message },
      { status },
    );
  }

  return NextResponse.json({ subcategoria: data }, { status: 200 });
}
