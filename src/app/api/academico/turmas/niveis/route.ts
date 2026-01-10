import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

type TurmaNivelRow = {
  nivel_id: number;
};

type NivelRow = {
  id: number;
  nome: string;
  ordem?: number | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const turmaIdRaw = url.searchParams.get("turma_id");
  const turma_id = turmaIdRaw ? Number(turmaIdRaw) : NaN;

  if (!Number.isFinite(turma_id)) {
    return NextResponse.json({ error: "turma_id_obrigatorio" }, { status: 400 });
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Usuario nao autenticado." }, { status: 401 });
  }

  const { data: turmaNiveis, error: turmaNiveisError } = await supabase
    .from("turma_niveis")
    .select("nivel_id")
    .eq("turma_id", turma_id);

  if (turmaNiveisError) {
    return NextResponse.json(
      { error: "falha_listar_niveis_turma", details: turmaNiveisError.message },
      { status: 500 },
    );
  }

  const nivelIds = ((turmaNiveis ?? []) as TurmaNivelRow[])
    .map((row) => row.nivel_id)
    .filter((id) => Number.isFinite(id));

  if (nivelIds.length === 0) {
    return NextResponse.json({ turma_id, niveis: [] }, { status: 200 });
  }

  const trySelectWithOrdem = async () => {
    return supabase.from("niveis").select("id,nome,ordem").in("id", nivelIds);
  };

  const trySelectWithoutOrdem = async () => {
    return supabase.from("niveis").select("id,nome").in("id", nivelIds);
  };

  let niveisData: NivelRow[] = [];
  const { data: d1, error: e1 } = await trySelectWithOrdem();

  if (e1) {
    const { data: d2, error: e2 } = await trySelectWithoutOrdem();
    if (e2) {
      return NextResponse.json(
        { error: "falha_listar_niveis", details: e2.message },
        { status: 500 },
      );
    }
    niveisData = (d2 ?? []) as NivelRow[];
  } else {
    niveisData = (d1 ?? []) as NivelRow[];
  }

  niveisData.sort((a, b) => {
    const ao = a.ordem ?? 999999;
    const bo = b.ordem ?? 999999;
    if (ao !== bo) return ao - bo;
    return (a.nome ?? "").localeCompare(b.nome ?? "", "pt-BR");
  });

  const niveis = niveisData.map((n) => ({
    id: n.id,
    nome: n.nome,
    ordem: n.ordem ?? null,
  }));

  return NextResponse.json({ turma_id, niveis }, { status: 200 });
}
