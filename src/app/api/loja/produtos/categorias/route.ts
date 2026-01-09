import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { guardApiByRole } from "@/lib/auth/roleGuard";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export async function GET(req: Request) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Configuracao do Supabase ausente." },
      { status: 500 }
    );
  }

  try {
    const [{ data: categorias, error: catErr }, { data: subcategorias, error: subErr }] =
      await Promise.all([
        supabaseAdmin
          .from("loja_produto_categoria")
          .select("id, nome, codigo, ativo")
          .order("nome", { ascending: true }),
        supabaseAdmin
          .from("loja_produto_categoria_subcategoria")
          .select(
            "id, categoria_id, nome, codigo, ativo, centro_custo_id, receita_categoria_id, despesa_categoria_id"
          )
          .order("nome", { ascending: true }),
      ]);

    if (catErr || subErr) {
      console.error("[GET /api/loja/produtos/categorias] Erro:", catErr || subErr);
      return NextResponse.json(
        { ok: false, error: "Erro ao listar categorias da loja." },
        { status: 500 }
      );
    }

    const subByCategoria = (subcategorias ?? []).reduce<Record<number, any[]>>((map, sub) => {
      const cid = sub.categoria_id ?? 0;
      if (!map[cid]) map[cid] = [];
      map[cid].push(sub);
      return map;
    }, {});

    const payload = (categorias ?? []).map((cat) => ({
      ...cat,
      subcategorias: subByCategoria[cat.id] ?? [],
    }));

    return NextResponse.json({ ok: true, categorias: payload });
  } catch (err) {
    console.error("Erro inesperado em /api/loja/produtos/categorias:", err);
    return NextResponse.json(
      { ok: false, error: "Erro inesperado ao listar categorias da loja." },
      { status: 500 }
    );
  }
}
