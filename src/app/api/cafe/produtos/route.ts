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

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cafe_produtos")
    .select("*")
    .order("nome", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
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
