import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ServicoTipo = "CURSO_REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const servicoTipo = (url.searchParams.get("servico_tipo") ?? "").toUpperCase() as ServicoTipo;

  const supabase = await createClient();

  if (servicoTipo === "CURSO_REGULAR") {
    const { data, error } = await supabase
      .from("cursos")
      .select("id,nome")
      .order("nome", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "falha_listar_cursos", details: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { servicos: (data ?? []).map((c) => ({ id: c.id, nome: c.nome })) },
      { status: 200 },
    );
  }

  if (servicoTipo === "CURSO_LIVRE") {
    const { data, error } = await supabase
      .from("cursos_livres")
      .select("id,nome")
      .order("nome", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "falha_listar_cursos_livres", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { servicos: (data ?? []).map((c) => ({ id: c.id, nome: c.nome })) },
      { status: 200 },
    );
  }

  if (servicoTipo === "PROJETO_ARTISTICO") {
    return NextResponse.json({ servicos: [] }, { status: 200 });
  }

  return NextResponse.json({ error: "servico_tipo_invalido" }, { status: 400 });
}
