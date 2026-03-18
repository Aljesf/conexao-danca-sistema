import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/api-auth";

type EscopoDetalhe = "institucional" | "turma";
type TipoDetalhe =
  | "alunos_ativos"
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
  nivel_ou_serie: string | null;
  classificacao_institucional: "ATIVO" | "PAGANTE" | "CONCESSAO";
  concessao_tipo: "INTEGRAL" | "PARCIAL" | null;
  valor_mensal_estimado_centavos: number | string | null;
  ordem_alfabetica_nome: string;
  aluno_ativo: boolean | null;
};

type DashboardDetalheItem = {
  pessoaId: number;
  nome: string;
  idade: number | null;
  turmaNome?: string;
  serieOuNivel?: string | null;
  classificacaoInstitucional: "ATIVO" | "PAGANTE" | "CONCESSAO";
  concessaoTipo: "INTEGRAL" | "PARCIAL" | null;
  valorMensalCentavos: number | null;
};

type DashboardDetalheGrupo = {
  chave: string;
  total: number;
  itens: DashboardDetalheItem[];
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
    value === "alunos_ativos"
    || value === "pagantes"
    || value === "concessoes"
    || value === "concessoes_integrais"
    || value === "concessoes_parciais"
  ) {
    return value;
  }

  return null;
}

function slugifyCurso(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toNumber(value: number | string | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function buildTitulo(escopo: EscopoDetalhe, tipo: TipoDetalhe): string {
  const basePorTipo: Record<TipoDetalhe, string> = {
    alunos_ativos: "Alunos ativos",
    pagantes: "Pagantes",
    concessoes: "Concessoes",
    concessoes_integrais: "Concessoes integrais",
    concessoes_parciais: "Concessoes parciais",
  };

  return escopo === "institucional"
    ? `${basePorTipo[tipo]} da Escola`
    : `${basePorTipo[tipo]} da turma`;
}

function buildSubtitulo(
  escopo: EscopoDetalhe,
  turmaNome: string | null,
  curso: string | null,
): string {
  if (escopo === "institucional") {
    const recorteCurso = curso ? ` Recorte de curso: ${curso}.` : "";
    return `Inclui vinculos ativos por turma. Um mesmo aluno pode aparecer mais de uma vez quando participa de mais de uma turma/modalidade.${recorteCurso}`;
  }

  return turmaNome
    ? `${turmaNome}. Listagem operacional agrupada por serie/nivel.`
    : "Listagem operacional agrupada por serie/nivel.";
}

function mapRowToItem(row: DashboardAlunoDetalheRow, escopo: EscopoDetalhe): DashboardDetalheItem {
  return {
    pessoaId: toNumber(row.pessoa_id) ?? 0,
    nome: row.aluno_nome,
    idade: toNumber(row.idade_anos),
    turmaNome: escopo === "institucional" ? row.turma_nome : undefined,
    serieOuNivel: row.nivel_ou_serie,
    classificacaoInstitucional: row.classificacao_institucional,
    concessaoTipo: row.concessao_tipo,
    valorMensalCentavos: toNumber(row.valor_mensal_estimado_centavos),
  };
}

function buildGrupos(items: DashboardDetalheItem[]): DashboardDetalheGrupo[] {
  const groups = new Map<string, DashboardDetalheItem[]>();

  for (const item of items) {
    const chave = item.serieOuNivel?.trim() || "Nao informado";
    const current = groups.get(chave) ?? [];
    current.push(item);
    groups.set(chave, current);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([chave, itens]) => ({
      chave,
      total: itens.length,
      itens: [...itens].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    }));
}

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const escopo = parseEscopo(request.nextUrl.searchParams.get("escopo"));
  const tipo = parseTipo(request.nextUrl.searchParams.get("tipo"));
  const turmaIdParam = request.nextUrl.searchParams.get("turma_id");
  const cursoParam = request.nextUrl.searchParams.get("curso")?.trim() ?? "";
  const cursoFilter = cursoParam.length > 0 ? cursoParam : null;
  const cursoFilterSlug = cursoFilter ? slugifyCurso(cursoFilter) : null;

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
    .select(
      "pessoa_id, aluno_nome, idade_anos, turma_id, turma_nome, curso, nivel_ou_serie, classificacao_institucional, concessao_tipo, valor_mensal_estimado_centavos, ordem_alfabetica_nome, aluno_ativo",
    )
    .order("ordem_alfabetica_nome", { ascending: true })
    .order("turma_nome", { ascending: true })
    .order("nivel_ou_serie", { ascending: true });

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

  const rows = (data ?? []) as DashboardAlunoDetalheRow[];
  const rowsComFiltroCurso =
    cursoFilter && cursoFilterSlug
      ? rows.filter((row) => slugifyCurso(row.curso ?? "") === cursoFilterSlug)
      : rows;
  const rowsFiltradas =
    tipo === "alunos_ativos"
      ? rowsComFiltroCurso.filter((row) => row.aluno_ativo !== false)
      : rowsComFiltroCurso;

  let turmaNome: string | null = null;
  if (escopo === "turma" && turmaId) {
    turmaNome = rowsFiltradas[0]?.turma_nome ?? null;

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

  const itens = rowsFiltradas.map((row) => mapRowToItem(row, escopo));
  const totalRegistros = itens.length;
  const somaValoresCentavos = itens.reduce(
    (acc, item) => acc + (item.valorMensalCentavos ?? 0),
    0,
  );
  const grupos = escopo === "turma" ? buildGrupos(itens) : [];

  return NextResponse.json(
    {
      modo: escopo,
      titulo: buildTitulo(escopo, tipo),
      subtitulo: buildSubtitulo(escopo, turmaNome, cursoFilter),
      total: totalRegistros,
      totalRegistros,
      somaValoresCentavos,
      itens,
      grupos,
    },
    { status: 200 },
  );
}
