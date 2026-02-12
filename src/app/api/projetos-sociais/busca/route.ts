import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

function jsonError(status: number, error: string, detail?: string) {
  return NextResponse.json({ ok: false, error, detail: detail ?? null }, { status });
}

export async function GET(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(req.url);

    const nome = (searchParams.get("nome") ?? "").trim();
    if (nome.length < 2) return jsonError(400, "nome_minimo_2_caracteres");

    const { data, error } = await supabase
      .from("projetos_sociais")
      .select("id,nome,descricao,ativo,created_at,updated_at")
      .ilike("nome", `%${nome}%`)
      .order("nome", { ascending: true })
      .limit(20);

    if (error) return jsonError(500, "erro_buscar_projetos_sociais", error.message);

    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "erro_desconhecido";
    return jsonError(500, "erro_buscar_projetos_sociais", detail);
  }
}
