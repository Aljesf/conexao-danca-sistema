import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type EventoInternoInput = {
  periodo_letivo_id?: number | null;
  dominio: string;
  categoria: string;
  subcategoria?: string | null;
  titulo: string;
  descricao?: string | null;
  inicio: string; // ISO datetime
  fim?: string | null;
  local?: string | null;
  formato?: "PRESENCIAL" | "ONLINE" | "HIBRIDO";
  status?: "AGENDADO" | "CANCELADO" | "CONCLUIDO";
  visibilidade?: "ADMIN" | "EQUIPE" | "PAIS";
};

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const periodoLetivoId = searchParams.get("periodo_letivo_id");

  const supabase = await getSupabaseServerSSR();

  let q = supabase
    .from("eventos_internos")
    .select(
      "id,periodo_letivo_id,dominio,categoria,subcategoria,titulo,descricao,inicio,fim,local,formato,status,visibilidade,created_at"
    )
    .order("inicio", { ascending: true });

  if (periodoLetivoId) q = q.eq("periodo_letivo_id", Number(periodoLetivoId));
  if (start) q = q.gte("inicio", `${start}T00:00:00.000Z`);
  if (end) q = q.lte("inicio", `${end}T23:59:59.999Z`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServerSSR();
  const body = (await req.json().catch(() => null)) as EventoInternoInput | null;
  if (!body) return badRequest("JSON invalido.");

  if (!body.dominio?.trim()) return badRequest("dominio e obrigatorio.");
  if (!body.categoria?.trim()) return badRequest("categoria e obrigatorio.");
  if (!body.titulo?.trim()) return badRequest("titulo e obrigatorio.");
  if (!body.inicio?.trim()) return badRequest("inicio e obrigatorio (ISO datetime).");

  const payload = {
    periodo_letivo_id: body.periodo_letivo_id ?? null,
    dominio: body.dominio.trim(),
    categoria: body.categoria.trim(),
    subcategoria: body.subcategoria?.trim() ?? null,
    titulo: body.titulo.trim(),
    descricao: body.descricao?.trim() ?? null,
    inicio: body.inicio,
    fim: body.fim ?? null,
    local: body.local?.trim() ?? null,
    formato: body.formato ?? "PRESENCIAL",
    status: body.status ?? "AGENDADO",
    visibilidade: body.visibilidade ?? "ADMIN",
  };

  const { data, error } = await supabase.from("eventos_internos").insert(payload).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
