import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing env");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET() {
  try {
    const supabase = sbAdmin();

    const { data, error } = await supabase.from("turmas").select("curso").eq("ativo", true);

    if (error) {
      return NextResponse.json({ ok: false, error: "erro_listar_cursos", message: error.message }, { status: 500 });
    }

    const cursos = Array.from(
      new Set(
        (data ?? [])
          .map((r) => (r as { curso: string | null }).curso)
          .filter((c): c is string => !!c && c.trim() !== ""),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR"));

    return NextResponse.json({ ok: true, cursos }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message: msg }, { status: 500 });
  }
}
