import { NextResponse, type NextRequest } from "next/server";
import { guardApiByRole } from "@/lib/auth/roleGuard";
import { guardCafeApiRequest } from "@/lib/auth/cafeApiAccess";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { listarTabelasPrecoDisponiveisCafe } from "@/lib/cafe/precificacao";

type TabelaInsert = {
  codigo: string;
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
  is_default?: boolean;
  ordem?: number;
};

export async function GET(req: NextRequest) {
  const denied = await guardCafeApiRequest(req);
  if (denied) return denied as unknown as NextResponse;

  const supabase = getSupabaseServiceClient();
  const url = new URL(req.url);
  const compradorPessoaIdRaw = url.searchParams.get("comprador_pessoa_id");
  const compradorPessoaId =
    compradorPessoaIdRaw && Number.isFinite(Number(compradorPessoaIdRaw))
      ? Math.trunc(Number(compradorPessoaIdRaw))
      : null;
  const compradorTipo = url.searchParams.get("comprador_tipo");

  try {
    const { data, error } = await supabase
      .from("cafe_tabelas_preco")
      .select("id,codigo,nome,descricao,is_default,ativo,ordem")
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      throw error;
    }

    const resolucao = await listarTabelasPrecoDisponiveisCafe({
      supabase,
      compradorPessoaId,
      compradorTipo,
    });

    return NextResponse.json(
      {
        ok: true,
        data,
        tabela_preco_atual_id: resolucao.tabela_preco_atual_id,
        itens: resolucao.itens,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Erro ao carregar tabelas de preco:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "falha_carregar_tabelas_preco" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const denied = await guardApiByRole(req);
  if (denied) return denied as unknown as NextResponse;

  const body = (await req.json().catch(() => null)) as TabelaInsert | null;
  if (!body?.codigo?.trim()) {
    return NextResponse.json({ ok: false, error: "codigo_obrigatorio" }, { status: 400 });
  }
  if (!body?.nome?.trim()) {
    return NextResponse.json({ ok: false, error: "nome_obrigatorio" }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  if (body.is_default) {
    const { error: clearErr } = await supabase
      .from("cafe_tabelas_preco")
      .update({ is_default: false })
      .eq("is_default", true);
    if (clearErr) return NextResponse.json({ ok: false, error: clearErr.message }, { status: 500 });
  }

  const payload = {
    codigo: body.codigo.trim(),
    nome: body.nome.trim(),
    descricao: body.descricao ?? null,
    ativo: body.ativo ?? true,
    is_default: body.is_default ?? false,
    ordem: body.ordem ?? 0,
  };

  const { data, error } = await supabase
    .from("cafe_tabelas_preco")
    .insert(payload)
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, data }, { status: 201 });
}
