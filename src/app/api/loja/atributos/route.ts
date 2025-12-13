import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = getAdminClient();

    const [cores, numeracoes, tamanhos, marcas, modelos] = await Promise.all([
      supabase.from("loja_cores").select("id,nome,codigo,hex,ativo").order("nome", { ascending: true }),
      supabase.from("loja_numeracoes").select("id,tipo,valor,ativo").order("tipo", { ascending: true }).order("valor", { ascending: true }),
      supabase.from("loja_tamanhos").select("id,tipo,nome,ordem,ativo").order("tipo", { ascending: true }).order("ordem", { ascending: true }).order("nome", { ascending: true }),
      supabase.from("loja_marcas").select("id,nome,ativo").order("nome", { ascending: true }),
      supabase.from("loja_modelos").select("id,nome,ativo").order("nome", { ascending: true }),
    ]);

    const err = cores.error || numeracoes.error || tamanhos.error || marcas.error || modelos.error;
    if (err) return NextResponse.json({ ok: false, error: err.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      data: {
        cores: cores.data ?? [],
        numeracoes: numeracoes.data ?? [],
        tamanhos: tamanhos.data ?? [],
        marcas: marcas.data ?? [],
        modelos: modelos.data ?? [],
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "erro_interno" }, { status: 500 });
  }
}
