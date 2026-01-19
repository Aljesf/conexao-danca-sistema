import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type ExcecaoInput = {
  dominio: string;
  categoria: string;
  subcategoria?: string | null;
  titulo: string;
  descricao?: string | null;
  data_inicio: string;
  data_fim?: string | null;
  sem_aula?: boolean;
  ponto_facultativo?: boolean;
  em_avaliacao?: boolean;
};

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const periodoId = Number(rawId);
  if (Number.isNaN(periodoId)) return bad("id invalido.");

  const body = (await req.json().catch(() => null)) as ExcecaoInput | null;
  if (!body) return bad("JSON invalido.");

  if (!body.dominio?.trim()) return bad("dominio e obrigatorio.");
  if (!body.categoria?.trim()) return bad("categoria e obrigatorio.");
  if (!body.titulo?.trim()) return bad("titulo e obrigatorio.");
  if (!body.data_inicio?.trim()) return bad("data_inicio e obrigatorio.");

  const supabase = await getSupabaseServer();

  const payload = {
    periodo_letivo_id: periodoId,
    dominio: body.dominio.trim(),
    categoria: body.categoria.trim(),
    subcategoria: body.subcategoria?.trim() ?? null,
    titulo: body.titulo.trim(),
    descricao: body.descricao?.trim() ?? null,
    data_inicio: body.data_inicio,
    data_fim: body.data_fim ?? null,
    sem_aula: body.sem_aula ?? false,
    ponto_facultativo: body.ponto_facultativo ?? false,
    em_avaliacao: body.em_avaliacao ?? false,
    visibilidade: "ESCOLA",
  };

  const { data, error } = await supabase
    .from("calendario_itens_institucionais")
    .insert(payload)
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
