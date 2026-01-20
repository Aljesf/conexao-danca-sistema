import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

type UnidadeBase = "g" | "ml" | "un";

type InsumoInsert = {
  nome: string;
  unidade_base: UnidadeBase;
  controla_validade?: boolean;
  validade_dias_padrao?: number | null;
  custo_unitario_estimado_centavos?: number;
  ativo?: boolean;
};

function isUnidadeBase(value: unknown): value is UnidadeBase {
  return value === "g" || value === "ml" || value === "un";
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("cafe_insumos")
    .select("*")
    .order("nome", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const body = (await req.json().catch(() => null)) as InsumoInsert | null;

  if (!body?.nome?.trim()) {
    return NextResponse.json({ error: "nome_obrigatorio" }, { status: 400 });
  }
  if (!isUnidadeBase(body?.unidade_base)) {
    return NextResponse.json({ error: "unidade_base_obrigatoria" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const payload = {
    nome: body.nome.trim(),
    unidade_base: body.unidade_base,
    controla_validade: body.controla_validade ?? false,
    validade_dias_padrao: body.validade_dias_padrao ?? null,
    custo_unitario_estimado_centavos: body.custo_unitario_estimado_centavos ?? 0,
    ativo: body.ativo ?? true,
  };

  const { data, error } = await supabase.from("cafe_insumos").insert(payload).select("*").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
