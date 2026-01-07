import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cidadeId = Number(searchParams.get("cidade_id") ?? "");
  const q = (searchParams.get("q") ?? "").trim();

  if (!Number.isFinite(cidadeId) || cidadeId <= 0) {
    return NextResponse.json({ items: [] });
  }

  const supabase = await createClient();

  let query = supabase
    .from("enderecos_bairros")
    .select("id,nome,cidade_id")
    .eq("cidade_id", cidadeId)
    .order("nome", { ascending: true })
    .limit(100);

  if (q) query = query.ilike("nome", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { cidade_id?: unknown; nome?: unknown } | null;
  const cidadeId = Number(body?.cidade_id ?? "");
  const nome = normalizeText(body?.nome);

  if (!Number.isFinite(cidadeId) || cidadeId <= 0) {
    return NextResponse.json({ error: "cidade_id_obrigatorio" }, { status: 400 });
  }

  if (!nome) {
    return NextResponse.json({ error: "nome_obrigatorio" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enderecos_bairros")
    .insert({ cidade_id: cidadeId, nome })
    .select("id,nome,cidade_id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing, error: existingError } = await supabase
        .from("enderecos_bairros")
        .select("id,nome,cidade_id")
        .eq("cidade_id", cidadeId)
        .ilike("nome", nome)
        .maybeSingle();

      if (existingError) {
        return NextResponse.json({ error: existingError.message }, { status: 400 });
      }

      if (!existing) {
        return NextResponse.json({ error: "falha_localizar_bairro" }, { status: 500 });
      }

      return NextResponse.json({ item: existing });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}
