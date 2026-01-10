import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Body = {
  pessoa_id: number;
  tipo_curriculo: "ACADEMICO" | "INSTITUCIONAL";
  habilitado: boolean;
  observacoes?: string | null;
};

export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient();

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalido." }, { status: 400 });
  }

  if (!body?.pessoa_id || typeof body.pessoa_id !== "number") {
    return NextResponse.json({ ok: false, error: "pessoa_id e obrigatorio." }, { status: 400 });
  }

  const payload = {
    pessoa_id: body.pessoa_id,
    tipo_curriculo: body.tipo_curriculo ?? "INSTITUCIONAL",
    habilitado: Boolean(body.habilitado),
    observacoes: body.observacoes ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("curriculos_institucionais")
    .upsert(payload, { onConflict: "pessoa_id" })
    .select("id,pessoa_id,tipo_curriculo,habilitado,observacoes,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}
