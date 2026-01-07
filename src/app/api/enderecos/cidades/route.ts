import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const supabase = await createClient();

  let query = supabase.from("enderecos_cidades").select("id,nome,uf").order("nome", { ascending: true }).limit(50);
  if (q) query = query.ilike("nome", `%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { nome?: unknown; uf?: unknown } | null;
  const nome = normalizeText(body?.nome);
  if (!nome) {
    return NextResponse.json({ error: "nome_obrigatorio" }, { status: 400 });
  }

  const uf = (normalizeText(body?.uf) ?? "PA").toUpperCase();
  const supabase = await createClient();

  const { data, error } = await supabase.from("enderecos_cidades").insert({ nome, uf }).select("id,nome,uf").single();

  if (error) {
    if (error.code === "23505") {
      const { data: existing, error: existingError } = await supabase
        .from("enderecos_cidades")
        .select("id,nome,uf")
        .eq("uf", uf)
        .ilike("nome", nome)
        .maybeSingle();

      if (existingError) {
        return NextResponse.json({ error: existingError.message }, { status: 400 });
      }

      if (!existing) {
        return NextResponse.json({ error: "falha_localizar_cidade" }, { status: 500 });
      }

      return NextResponse.json({ item: existing });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ item: data });
}
