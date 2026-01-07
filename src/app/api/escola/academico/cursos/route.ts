import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

type CursoRow = {
  id: number;
  nome: string;
  metodologia: string | null;
  situacao: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

function supabaseServer() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) throw new Error("ENV_MISSING_SUPABASE_PUBLIC");

  return createServerClient(url, anonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set() {
        // nao necessario em route handlers para este fluxo
      },
      remove() {
        // nao necessario em route handlers para este fluxo
      },
    },
  });
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  try {
    const supabase = supabaseServer();

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
    const supabase = supabaseServer();
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
