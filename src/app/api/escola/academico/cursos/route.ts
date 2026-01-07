import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CursoRow = {
  id: number;
  nome: string;
  metodologia: string | null;
  situacao: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("cursos")
      .select("id,nome,metodologia,situacao,observacoes,created_at,updated_at")
      .order("nome", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: "falha_listar_cursos", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: (data ?? []) as CursoRow[] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body) {
      return NextResponse.json({ ok: false, error: "body_required" }, { status: 400 });
    }

    const nome = asText(body.nome);
    if (!nome) {
      return NextResponse.json({ ok: false, error: "nome_obrigatorio" }, { status: 400 });
    }

    const payload = {
      nome,
      metodologia: asText(body.metodologia),
      observacoes: asText(body.observacoes),
      situacao: asText(body.situacao) ?? "Ativo",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("cursos").insert(payload).select("*").single();

    if (error) {
      return NextResponse.json({ ok: false, error: "falha_criar_curso", message: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "erro_interno";
    return NextResponse.json({ ok: false, error: "erro_interno", message: msg }, { status: 500 });
  }
}
