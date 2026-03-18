import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type EscopoDetalhe = "institucional" | "turma";
type TipoDetalhe =
  | "pagantes"
  | "concessoes"
  | "concessoes_integrais"
  | "concessoes_parciais";

type DashboardAlunoDetalheRow = {
  pessoa_id: number | string;
  aluno_nome: string;
  idade_anos: number | string | null;
  turma_id: number | string;
  turma_nome: string;
  curso: string | null;
  classificacao_institucional: "PAGANTE" | "CONCESSAO";
  concessao_tipo: "INTEGRAL" | "PARCIAL" | null;
};

type DashboardDetalheItem = {
  pessoaId: number;
  nome: string;
  idade: number | null;
  classificacaoInstitucional: "PAGANTE" | "CONCESSAO";
  concessaoTipo: "INTEGRAL" | "PARCIAL" | null;
};

function badRequest(details: string) {
  return NextResponse.json(
    {
      error: "parametros_invalidos",
      details,
    },
    { status: 400 },
  );
}

function parseEscopo(value: string | null): EscopoDetalhe | null {
  if (value === "institucional" || value === "turma") return value;
  return null;
}

function parseTipo(value: string | null): TipoDetalhe | null {
  if (
    value === "pagantes"
    || value === "concessoes"
    || value === "concessoes_integrais"
    || value === "concessoes_parciais"
  ) {
    return value;
  }
  return null;
}

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function buildTitulo(escopo: EscopoDetalhe, tipo: TipoDetalhe, turmaNome: string | null): string {
  const basePorTipo: Record<TipoDetalhe, string> = {
    pagantes: "Pagantes",
    concessoes: "Concessoes",
    concessoes_integrais: "Concessoes integrais",
    concessoes_parciais: "Concessoes parciais",
  };

  if (escopo === "turma") {
    return turmaNome ? `${basePorTipo[tipo]} da turma` : `${basePorTipo[tipo]} da turma`;
  }

  return `${basePorTipo[tipo]} da Escola`;
}

function buildSubtitulo(escopo: EscopoDetalhe, turmaNome: string | null): string {
  if (escopo === "turma") {
    return turmaNome ?? "Turma selecionada";
  }

  return "Drill-down operacional do dashboard institucional";
}

function mapRowToItem(row: DashboardAlunoDetalheRow): DashboardDetalheItem {
  return {
    pessoaId: toNumber(row.pessoa_id) ?? 0,
    nome: row.aluno_nome,
    idade: toNumber(row.idade_anos),
    classificacaoInstitucional: row.classificacao_institucional,
    concessaoTipo: row.concessao_tipo,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const escopo = parseEscopo(request.nextUrl.searchParams.get("escopo"));
  const tipo = parseTipo(request.nextUrl.searchParams.get("tipo"));
  const turmaIdParam = request.nextUrl.searchParams.get("turma_id");

  if (!escopo) {
    return badRequest("escopo_invalido");
  }

  if (!tipo) {
    return badRequest("tipo_invalido");
  }

  const turmaId = toNumber(turmaIdParam);
  if (escopo === "turma" && !turmaId) {
    return badRequest("turma_id_obrigatorio");
  }

  let query = supabase
    .from("vw_escola_dashboard_alunos_detalhe")
    .select("pessoa_id, aluno_nome, idade_anos, turma_id, turma_nome, curso, classificacao_institucional, concessao_tipo")
    .order("aluno_nome", { ascending: true });

  if (tipo === "pagantes") {
    query = query.eq("classificacao_institucional", "PAGANTE");
  }

  if (tipo === "concessoes") {
    query = query.eq("classificacao_institucional", "CONCESSAO");
  }

  if (tipo === "concessoes_integrais") {
    query = query
      .eq("classificacao_institucional", "CONCESSAO")
      .eq("concessao_tipo", "INTEGRAL");
  }

  if (tipo === "concessoes_parciais") {
    query = query
      .eq("classificacao_institucional", "CONCESSAO")
      .eq("concessao_tipo", "PARCIAL");
  }

  if (escopo === "turma" && turmaId) {
    query = query.eq("turma_id", turmaId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      {
        error: "falha_dashboard_detalhes",
        details: error.message,
      },
      { status: 500 },
    );
  }

  let turmaNome: string | null = null;
  if (escopo === "turma" && turmaId) {
    turmaNome = (data?.[0] as DashboardAlunoDetalheRow | undefined)?.turma_nome ?? null;

    if (!turmaNome) {
      const { data: turmaData, error: turmaError } = await supabase
        .from("vw_escola_dashboard_turmas_composicao")
        .select("nome")
        .eq("turma_id", turmaId)
        .maybeSingle();

      if (turmaError) {
        return NextResponse.json(
          {
            error: "falha_dashboard_detalhes_turma",
            details: turmaError.message,
          },
          { status: 500 },
        );
      }

      turmaNome = turmaData?.nome ?? null;
    }
  }

  const itens = ((data ?? []) as DashboardAlunoDetalheRow[]).map(mapRowToItem);

  return NextResponse.json(
    {
      titulo: buildTitulo(escopo, tipo, turmaNome),
      subtitulo: buildSubtitulo(escopo, turmaNome),
      total: itens.length,
      itens,
    },
    { status: 200 },
  );
}
