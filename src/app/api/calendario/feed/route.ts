import { NextResponse } from "next/server";
import { getSupabaseServerSSR } from "@/lib/supabaseServerSSR";

type CalendarOrigin = { tipo: string; id: string };

type CalendarItemKind = "PERIODO_LETIVO" | "FAIXA_LETIVA" | "INSTITUCIONAL" | "EVENTO_INTERNO";

type CalendarItem = {
  kind: CalendarItemKind;
  id: string;
  titulo: string;
  descricao?: string | null;

  dominio?: string | null;
  categoria?: string | null;
  subcategoria?: string | null;

  // PERIODO_LETIVO/INSTITUCIONAL: YYYY-MM-DD
  // EVENTO_INTERNO: ISO datetime
  inicio: string;
  fim: string | null;

  sem_aula?: boolean;
  ponto_facultativo?: boolean;
  em_avaliacao?: boolean;

  origem: CalendarOrigin;
};

function isISODateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function toISODateOnly(v: unknown): string {
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start"); // YYYY-MM-DD
  const end = searchParams.get("end"); // YYYY-MM-DD
  const periodoLetivoId = searchParams.get("periodo_letivo_id");

  if (!start || !end || !isISODateOnly(start) || !isISODateOnly(end)) {
    return NextResponse.json(
      { error: "Parametros obrigatorios: start=YYYY-MM-DD e end=YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const supabase = await getSupabaseServerSSR();

  const items: CalendarItem[] = [];

  // 1) Periodo letivo (se informado; senao, tenta achar o ativo mais recente)
  if (periodoLetivoId) {
    const { data, error } = await supabase
      .from("periodos_letivos")
      .select("id,codigo,titulo,data_inicio,data_fim")
      .eq("id", Number(periodoLetivoId))
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (data) {
      items.push({
        kind: "PERIODO_LETIVO",
        id: String(data.id),
        titulo: data.titulo ?? `Periodo Letivo ${data.codigo ?? ""}`,
        inicio: toISODateOnly(data.data_inicio),
        fim: toISODateOnly(data.data_fim),
        origem: { tipo: "periodos_letivos", id: String(data.id) },
      });
    }
  } else {
    const { data } = await supabase
      .from("periodos_letivos")
      .select("id,codigo,titulo,data_inicio,data_fim")
      .eq("ativo", true)
      .order("ano_referencia", { ascending: false })
      .limit(1);

    if (data?.[0]) {
      const pl = data[0];
      items.push({
        kind: "PERIODO_LETIVO",
        id: String(pl.id),
        titulo: pl.titulo ?? `Periodo Letivo ${pl.codigo ?? ""}`,
        inicio: toISODateOnly(pl.data_inicio),
        fim: toISODateOnly(pl.data_fim),
        origem: { tipo: "periodos_letivos", id: String(pl.id) },
      });
    }
  }

  // 2) Itens institucionais (DATE) que intersectam o range
  let faixasQ = supabase
    .from("periodos_letivos_faixas")
    .select(
      "id,dominio,categoria,subcategoria,titulo,descricao,data_inicio,data_fim,sem_aula,em_avaliacao,periodo_letivo_id"
    )
    .lte("data_inicio", end)
    .gte("data_fim", start)
    .order("data_inicio", { ascending: true });

  if (periodoLetivoId) faixasQ = faixasQ.eq("periodo_letivo_id", Number(periodoLetivoId));

  const { data: faixas, error: fxErr } = await faixasQ;
  if (fxErr) return NextResponse.json({ error: fxErr.message }, { status: 500 });

  for (const row of faixas ?? []) {
    items.push({
      kind: "FAIXA_LETIVA",
      id: String(row.id),
      titulo: row.titulo,
      descricao: row.descricao,
      dominio: row.dominio,
      categoria: row.categoria,
      subcategoria: row.subcategoria,
      inicio: toISODateOnly(row.data_inicio),
      fim: toISODateOnly(row.data_fim),
      sem_aula: Boolean(row.sem_aula),
      em_avaliacao: Boolean(row.em_avaliacao),
      origem: { tipo: "periodos_letivos_faixas", id: String(row.id) },
    });
  }

  // 3) Itens institucionais (DATE) que intersectam o range
  let instQ = supabase
    .from("calendario_itens_institucionais")
    .select(
      "id,dominio,categoria,subcategoria,titulo,descricao,data_inicio,data_fim,sem_aula,ponto_facultativo,em_avaliacao,periodo_letivo_id"
    )
    .lte("data_inicio", end)
    .or(`data_fim.is.null,data_fim.gte.${start}`)
    .order("data_inicio", { ascending: true });

  if (periodoLetivoId) instQ = instQ.eq("periodo_letivo_id", Number(periodoLetivoId));

  const { data: inst, error: instErr } = await instQ;
  if (instErr) return NextResponse.json({ error: instErr.message }, { status: 500 });

  for (const row of inst ?? []) {
    items.push({
      kind: "INSTITUCIONAL",
      id: String(row.id),
      titulo: row.titulo,
      descricao: row.descricao,
      dominio: row.dominio,
      categoria: row.categoria,
      subcategoria: row.subcategoria,
      inicio: toISODateOnly(row.data_inicio),
      fim: row.data_fim ? toISODateOnly(row.data_fim) : null,
      sem_aula: Boolean(row.sem_aula),
      ponto_facultativo: Boolean(row.ponto_facultativo),
      em_avaliacao: Boolean(row.em_avaliacao),
      origem: { tipo: "calendario_itens_institucionais", id: String(row.id) },
    });
  }

  // 4) Eventos internos (TIMESTAMPTZ) no range
  const startIso = `${start}T00:00:00.000Z`;
  const endIso = `${end}T23:59:59.999Z`;

  let evQ = supabase
    .from("eventos_internos")
    .select("id,dominio,categoria,subcategoria,titulo,descricao,inicio,fim,periodo_letivo_id,status")
    .gte("inicio", startIso)
    .lte("inicio", endIso)
    .order("inicio", { ascending: true });

  if (periodoLetivoId) evQ = evQ.eq("periodo_letivo_id", Number(periodoLetivoId));

  const { data: evInt, error: evErr } = await evQ;
  if (evErr) return NextResponse.json({ error: evErr.message }, { status: 500 });

  for (const row of evInt ?? []) {
    items.push({
      kind: "EVENTO_INTERNO",
      id: String(row.id),
      titulo: row.titulo,
      descricao: row.descricao,
      dominio: row.dominio,
      categoria: row.categoria,
      subcategoria: row.subcategoria,
      inicio: String(row.inicio),
      fim: row.fim ? String(row.fim) : null,
      origem: { tipo: "eventos_internos", id: String(row.id) },
    });
  }

  return NextResponse.json({ start, end, items });
}
