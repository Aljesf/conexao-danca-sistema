import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type ProdutoInsert = {
  nome: string;
  categoria?: string;
  unidade_venda?: string;
  preco_venda_centavos: number;
  preparado?: boolean;
  insumo_direto_id?: number | null;
  ativo?: boolean;
};

export async function GET(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") ?? searchParams.get("q") ?? "").trim();
  const pageRaw = Number(searchParams.get("page") ?? "1");
  const pageSizeRaw = Number(searchParams.get("pageSize") ?? "20");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.trunc(pageRaw) : 1;
  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
      ? Math.min(Math.trunc(pageSizeRaw), 200)
      : 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = getSupabaseServiceClient();
  let query = supabase
    .from("cafe_produtos")
    .select("id,nome,preco_venda_centavos,unidade_venda,ativo,categoria", { count: "exact" })
    .eq("ativo", true)
    .order("nome", { ascending: true })
    .range(from, to);

  if (search) {
    query = query.or(`nome.ilike.%${search}%,categoria.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const items =
    (data ?? []).map((row) => ({
      id: row.id,
      nome: row.nome,
      codigo: null,
      preco_venda_centavos: Number(row.preco_venda_centavos ?? 0),
      unidade_venda: row.unidade_venda ?? null,
      ativo: row.ativo ?? true,
    })) ?? [];

  return NextResponse.json(
    {
      ok: true,
      data: {
        items,
        pagination: {
          page,
          pageSize,
          total: count ?? 0,
        },
      },
    },
    { status: 200 }
  );
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const body = (await req.json().catch(() => null)) as ProdutoInsert | null;
  if (!body?.nome?.trim()) {
    return NextResponse.json({ error: "nome_obrigatorio" }, { status: 400 });
  }
  if (!Number.isFinite(body?.preco_venda_centavos)) {
    return NextResponse.json({ error: "preco_invalido" }, { status: 400 });
  }

  const insumoDiretoId =
    body.insumo_direto_id !== undefined && body.insumo_direto_id !== null
      ? Number(body.insumo_direto_id)
      : null;

  if (insumoDiretoId !== null && !Number.isFinite(insumoDiretoId)) {
    return NextResponse.json({ error: "insumo_direto_invalido" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const payload = {
    nome: body.nome.trim(),
    categoria: body.categoria?.trim() || "GERAL",
    unidade_venda: body.unidade_venda?.trim() || "un",
    preco_venda_centavos: body.preco_venda_centavos,
    preparado: body.preparado ?? true,
    insumo_direto_id: insumoDiretoId,
    ativo: body.ativo ?? true,
  };

  const { data, error } = await supabase.from("cafe_produtos").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
