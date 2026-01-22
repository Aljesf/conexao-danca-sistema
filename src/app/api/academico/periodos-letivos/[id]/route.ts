import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return bad("id invalido.");

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { data: pl, error: plErr } = await supabase
    .from("periodos_letivos")
    .select("id,codigo,titulo,ano_referencia,data_inicio,data_fim,inicio_letivo_janeiro,ativo,observacoes")
    .eq("id", id)
    .single();

  if (plErr) return NextResponse.json({ error: plErr.message }, { status: 500 });

  const { data: faixas, error: fxErr } = await supabase
    .from("periodos_letivos_faixas")
    .select("id,dominio,categoria,subcategoria,titulo,descricao,data_inicio,data_fim,sem_aula,em_avaliacao")
    .eq("periodo_letivo_id", id)
    .order("data_inicio", { ascending: true });

  if (fxErr) return NextResponse.json({ error: fxErr.message }, { status: 500 });

  const { data: excecoes, error: exErr } = await supabase
    .from("calendario_itens_institucionais")
    .select(
      "id,dominio,categoria,subcategoria,titulo,descricao,data_inicio,data_fim,sem_aula,ponto_facultativo,em_avaliacao,visibilidade"
    )
    .eq("periodo_letivo_id", id)
    .order("data_inicio", { ascending: true });

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

  return NextResponse.json({ periodo: pl, faixas: faixas ?? [], excecoes: excecoes ?? [] });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const id = Number(rawId);
  if (Number.isNaN(id)) return bad("id invalido.");

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return bad("JSON invalido.");

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const patch: Record<string, unknown> = {};
  const allowed = [
    "codigo",
    "titulo",
    "ano_referencia",
    "data_inicio",
    "data_fim",
    "inicio_letivo_janeiro",
    "ativo",
    "observacoes",
  ];

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      patch[key] = body[key];
    }
  }

  const { error } = await supabase.from("periodos_letivos").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

