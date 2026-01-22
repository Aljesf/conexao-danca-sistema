import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type FaixaInput = {
  categoria: string;
  subcategoria?: string | null;
  titulo: string;
  descricao?: string | null;
  data_inicio: string;
  data_fim: string;
  sem_aula?: boolean;
  em_avaliacao?: boolean;
};

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  const periodoId = Number(rawId);
  if (Number.isNaN(periodoId)) return bad("id invalido.");

  const body = (await req.json().catch(() => null)) as FaixaInput | null;
  if (!body) return bad("JSON invalido.");

  if (!body.categoria?.trim()) return bad("categoria e obrigatorio.");
  if (!body.titulo?.trim()) return bad("titulo e obrigatorio.");
  if (!body.data_inicio?.trim()) return bad("data_inicio e obrigatorio.");
  if (!body.data_fim?.trim()) return bad("data_fim e obrigatorio.");

  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const payload = {
    periodo_letivo_id: periodoId,
    dominio: "ACADEMICO",
    categoria: body.categoria.trim(),
    subcategoria: body.subcategoria?.trim() ?? null,
    titulo: body.titulo.trim(),
    descricao: body.descricao?.trim() ?? null,
    data_inicio: body.data_inicio,
    data_fim: body.data_fim,
    sem_aula: body.sem_aula ?? false,
    em_avaliacao: body.em_avaliacao ?? false,
  };

  const { data, error } = await supabase.from("periodos_letivos_faixas").insert(payload).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id }, { status: 201 });
}

