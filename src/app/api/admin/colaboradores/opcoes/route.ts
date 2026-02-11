import { NextResponse } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";

type ColaboradorRow = {
  id: number;
  pessoa_id: number | null;
  ativo: boolean | null;
};

type PessoaRow = {
  id: number;
  nome: string | null;
};

type ColaboradorOpcao = {
  id: number;
  pessoa_id: number | null;
  nome: string;
  ativo: boolean;
};

export async function GET(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied;

  const supabase = getSupabaseAdmin();
  const { searchParams } = new URL(req.url);
  const includeInativos = searchParams.get("include_inativos") === "1";

  let query = supabase.from("colaboradores").select("id,pessoa_id,ativo").order("id", { ascending: true });
  if (!includeInativos) {
    query = query.eq("ativo", true);
  }

  const { data: colaboradores, error: colaboradoresError } = await query;

  if (colaboradoresError) {
    return NextResponse.json(
      { ok: false, error: "falha_listar_colaboradores", detail: colaboradoresError.message },
      { status: 500 },
    );
  }

  const rows = (colaboradores ?? []) as ColaboradorRow[];
  const pessoaIds = Array.from(new Set(rows.map((r) => r.pessoa_id).filter((v): v is number => typeof v === "number")));

  let pessoasMap = new Map<number, PessoaRow>();
  if (pessoaIds.length > 0) {
    const { data: pessoas, error: pessoasError } = await supabase
      .from("pessoas")
      .select("id,nome")
      .in("id", pessoaIds);

    if (pessoasError) {
      return NextResponse.json(
        { ok: false, error: "falha_listar_pessoas", detail: pessoasError.message },
        { status: 500 },
      );
    }

    pessoasMap = new Map((pessoas ?? []).map((p) => [p.id, p as PessoaRow]));
  }

  const opcoes: ColaboradorOpcao[] = rows
    .map((row) => {
      const pessoa = row.pessoa_id ? pessoasMap.get(row.pessoa_id) : null;
      return {
        id: row.id,
        pessoa_id: row.pessoa_id,
        nome: pessoa?.nome?.trim() || `Colaborador #${row.id}`,
        ativo: row.ativo !== false,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return NextResponse.json({ ok: true, data: opcoes });
}
