import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ServicoTipo = "CURSO_REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const servicoTipo = (url.searchParams.get("servico_tipo") ?? "").toUpperCase() as ServicoTipo;
  const servicoIdRaw = url.searchParams.get("servico_id");
  const servicoId = servicoIdRaw ? Number(servicoIdRaw) : NaN;

  if (!Number.isFinite(servicoId)) {
    return NextResponse.json({ error: "servico_id_obrigatorio" }, { status: 400 });
  }

  const supabase = await createClient();

  if (servicoTipo === "CURSO_LIVRE") {
    const { data, error } = await supabase
      .from("turmas")
      .select("turma_id,nome,status,turno,data_inicio,data_fim,curso_livre_id,tipo_turma")
      .eq("curso_livre_id", servicoId)
      .order("nome", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "falha_listar_unidades", details: error.message }, { status: 500 });
    }

    const unidades = (data ?? []).map((t) => ({
      id: t.turma_id,
      label: `${t.nome}${t.tipo_turma ? "" : " (tipo_turma nao definido)"}`,
    }));

    return NextResponse.json({ unidades }, { status: 200 });
  }

  if (servicoTipo === "CURSO_REGULAR") {
    const { data: curso, error: cursoErr } = await supabase
      .from("cursos")
      .select("id,nome")
      .eq("id", servicoId)
      .single();

    if (cursoErr) {
      return NextResponse.json({ error: "curso_nao_encontrado", details: cursoErr.message }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("turmas")
      .select("turma_id,nome,status,turno,ano_referencia,curso,tipo_turma")
      .eq("tipo_turma", "REGULAR")
      .eq("curso", curso.nome)
      .order("nome", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "falha_listar_unidades", details: error.message }, { status: 500 });
    }

    const unidades = (data ?? []).map((t) => ({
      id: t.turma_id,
      label: `${t.nome} [${t.turno ?? "-"} - ${t.ano_referencia ?? "-"}]`,
    }));

    return NextResponse.json({ unidades }, { status: 200 });
  }

  if (servicoTipo === "PROJETO_ARTISTICO") {
    return NextResponse.json({ unidades: [] }, { status: 200 });
  }

  return NextResponse.json({ error: "servico_tipo_invalido" }, { status: 400 });
}
