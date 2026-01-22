import { NextResponse, type NextRequest } from "next/server";
import { requireUser, type ApiAuthContext } from "@/lib/supabase/api-auth";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type PoliticaPrecoRow = {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

async function resolvePoliticaPk(supabase: ApiAuthContext["supabase"]) {
  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_schema", "public")
    .eq("table_name", "financeiro_politicas_preco");

  if (error) return "id";
  const columns = new Set((data ?? []).map((row) => String((row as { column_name?: string }).column_name)));
  if (columns.has("politica_preco_id")) return "politica_preco_id";
  return "id";
}

export async function GET(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const url = new URL(req.url);
  const ativoParam = url.searchParams.get("ativo");
  let ativoFilter: boolean | null = null;

  if (ativoParam !== null) {
    if (ativoParam === "true") {
      ativoFilter = true;
    } else if (ativoParam === "false") {
      ativoFilter = false;
    } else {
      return NextResponse.json({ error: "Parametro 'ativo' invalido." }, { status: 400 });
    }
  }

  const pk = await resolvePoliticaPk(supabase);
  let query = supabase.from("financeiro_politicas_preco").select("*").order("created_at", { ascending: false });

  if (ativoFilter !== null) {
    query = query.eq("ativo", ativoFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const politicas = (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>;
    return { ...raw, id: raw[pk] } as PoliticaPrecoRow;
  });

  return NextResponse.json({ politicas });
}

export async function POST(req: NextRequest) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const pk = await resolvePoliticaPk(supabase);

  const body = (await req.json().catch(() => null)) as
    | { nome?: unknown; descricao?: unknown; ativo?: unknown }
    | null;

  const nome = body?.nome;
  const descricao = body?.descricao;
  const ativo = body?.ativo;

  if (!isNonEmptyString(nome)) {
    return NextResponse.json({ error: "Campo 'nome' e obrigatorio." }, { status: 400 });
  }

  const payload: Record<string, unknown> = {
    nome: nome.trim(),
  };

  if (typeof descricao === "string") payload.descricao = descricao.trim();
  if (typeof ativo === "boolean") payload.ativo = ativo;

  const { data, error } = await supabase
    .from("financeiro_politicas_preco")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const politica = data ? { ...(data as Record<string, unknown>), id: (data as Record<string, unknown>)[pk] } : null;
  return NextResponse.json({ politica }, { status: 201 });
}

