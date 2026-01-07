import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getCookieStore } from "@/lib/nextCookies";

type CursoRow = {
  id: number;
  nome: string;
  metodologia: string | null;
  situacao: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

async function supabaseServer() {
  const cookieStore = await getCookieStore();
  return createRouteHandlerClient({ cookies: () => cookieStore });
}

function asText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("cursos")
      .select("id,nome,metodologia,situacao,observacoes,created_at,updated_at")
      .order("id", { ascending: true });

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
    const supabase = await supabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

    if (!body) {
      return NextResponse.json({ ok: false, error: "body_required" }, { status: 400 });
    }

    const nome = asText(body.nome);
    if (!nome) {
      return NextResponse.json({ ok: false, error: "nome_obrigatorio" }, { status: 400 });
    }

    let situacao = asText(body.situacao);
    if (!situacao && typeof body.ativo === "boolean") {
      situacao = body.ativo ? "Ativo" : "Inativo";
    }

    const payload = {
      nome,
      metodologia: asText(body.metodologia),
      observacoes: asText(body.observacoes),
      situacao: situacao ?? "Ativo",
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
