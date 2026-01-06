import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type EspacoRow = {
  id: number;
  local_id: number;
  nome: string;
  tipo: string;
  capacidade: number | null;
  local?: { id: number; nome: string; tipo: string } | null;
};

type Espaco = {
  id: number;
  local_id: number;
  nome: string;
  tipo: string;
  capacidade: number | null;
  local_nome?: string | null;
  local_tipo?: string | null;
};

type Turma = {
  turma_id: number;
  nome: string;
  curso: string | null;
  nivel: string | null;
  turno: string | null;
  ano_referencia: number | null;
  status: string | null;
  espaco_id: number | null;
};

type TurmaHorario = {
  id: number;
  turma_id: number;
  day_of_week: number;
  inicio: string;
  fim: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseNumber(raw: string | null, field: string) {
  if (!raw) return { value: null as number | null, error: null as string | null };
  const value = Number(raw);
  if (!Number.isFinite(value)) return { value: null, error: `${field}_invalido` };
  return { value, error: null };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const anoRaw = searchParams.get("ano");
  const espacoRaw = searchParams.get("espaco");
  const localRaw = searchParams.get("local");

  const { value: ano, error: anoErr } = parseNumber(anoRaw, "ano");
  if (anoErr) return NextResponse.json({ error: anoErr }, { status: 400 });

  const { value: espacoId, error: espacoErr } = parseNumber(espacoRaw, "espaco");
  if (espacoErr) return NextResponse.json({ error: espacoErr }, { status: 400 });

  const { value: localId, error: localErr } = parseNumber(localRaw, "local");
  if (localErr) return NextResponse.json({ error: localErr }, { status: 400 });

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
  }

  let espacosQ = supabase
    .from("espacos")
    .select("id,local_id,nome,tipo,capacidade,local:locais(id,nome,tipo)")
    .order("nome", { ascending: true });

  if (localId) {
    espacosQ = espacosQ.eq("local_id", localId);
  }

  const { data: espacosData, error: espErr } = await espacosQ;
  if (espErr) return NextResponse.json({ error: espErr.message }, { status: 500 });

  const espacos: Espaco[] = (espacosData ?? []).map((e: EspacoRow) => ({
    id: e.id,
    local_id: e.local_id,
    nome: e.nome,
    tipo: e.tipo,
    capacidade: e.capacidade ?? null,
    local_nome: e.local?.nome ?? null,
    local_tipo: e.local?.tipo ?? null,
  }));

  const espacoIds = espacos.map((e) => e.id);

  let turmasQ = supabase
    .from("turmas")
    .select("turma_id,nome,curso,nivel,turno,ano_referencia,status,espaco_id")
    .eq("tipo_turma", "REGULAR")
    .order("nome", { ascending: true });

  if (ano !== null) {
    turmasQ = turmasQ.eq("ano_referencia", ano);
  }

  if (espacoId !== null) {
    turmasQ = turmasQ.eq("espaco_id", espacoId);
  } else if (localId !== null) {
    turmasQ = espacoIds.length ? turmasQ.in("espaco_id", espacoIds) : turmasQ.eq("turma_id", -1);
  }

  const { data: turmasData, error: turmasErr } = await turmasQ;
  if (turmasErr) return NextResponse.json({ error: turmasErr.message }, { status: 500 });

  const turmas = (turmasData ?? []) as Turma[];
  const turmaIds = turmas.map((t) => t.turma_id);

  const { data: horariosData, error: hErr } = await supabase
    .from("turmas_horarios")
    .select("id,turma_id,day_of_week,inicio,fim")
    .in("turma_id", turmaIds.length ? turmaIds : [-1]);

  if (hErr) return NextResponse.json({ error: hErr.message }, { status: 500 });

  return NextResponse.json({
    filtros: {
      ano: ano ?? null,
      espaco: espacoId ?? null,
      local: localId ?? null,
    },
    espacos,
    turmas,
    horarios: (horariosData ?? []) as TurmaHorario[],
  });
}
