import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";
import { guardApiByRole } from "@/lib/auth/roleGuard";

function parseId(param: string): number | null {
  const id = Number(param);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();
  const { id } = await ctx.params;
  const tabelaPrecoId = parseId(id);

  if (!tabelaPrecoId) {
    return NextResponse.json({ error: "id_invalido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("escola_precos_cursos_livres_itens")
    .select("*")
    .eq("tabela_preco_id", tabelaPrecoId)
    .order("ordem", { ascending: true })
    .order("titulo", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "falha_listar_itens", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ itens: data ?? [] }, { status: 200 });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const supabase = await getSupabaseServerSSR();
  const { id } = await ctx.params;
  const tabelaPrecoId = parseId(id);

  if (!tabelaPrecoId) {
    return NextResponse.json({ error: "id_invalido" }, { status: 400 });
  }

  const payload: unknown = await req.json();
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "payload_invalido" }, { status: 400 });
  }

  const p = payload as Record<string, unknown>;
  const codigo = typeof p.codigo === "string" ? p.codigo.trim() : "";
  const titulo = typeof p.titulo === "string" ? p.titulo.trim() : "";
  const valorCentavos = typeof p.valor_centavos === "number" ? p.valor_centavos : null;

  if (!codigo) return NextResponse.json({ error: "codigo_obrigatorio" }, { status: 400 });
  if (!titulo) return NextResponse.json({ error: "titulo_obrigatorio" }, { status: 400 });
  if (!valorCentavos || valorCentavos <= 0) {
    return NextResponse.json({ error: "valor_centavos_invalido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("escola_precos_cursos_livres_itens")
    .insert({
      tabela_preco_id: tabelaPrecoId,
      codigo,
      titulo,
      descricao: typeof p.descricao === "string" ? p.descricao : null,
      qtd_turmas: typeof p.qtd_turmas === "number" ? p.qtd_turmas : null,
      qtd_pessoas: typeof p.qtd_pessoas === "number" ? p.qtd_pessoas : null,
      valor_centavos: valorCentavos,
      ordem: typeof p.ordem === "number" ? p.ordem : 0,
      ativo: typeof p.ativo === "boolean" ? p.ativo : true,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "falha_criar_item", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
