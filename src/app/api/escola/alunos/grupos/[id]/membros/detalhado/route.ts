import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseId } from "../../../_lib";

type Params = { params: Promise<{ id: string }> };

type NucleoMembroRow = {
  id: number;
  pessoa_id: number;
  data_entrada: string;
  pessoas: {
    id?: number;
    nome: string | null;
    telefone: string | null;
    email: string | null;
  } | null;
};

type MatriculaRow = {
  id: number;
  pessoa_id: number;
  status: string | null;
  tipo_matricula: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type TurmaAlunoRow = {
  turma_aluno_id: number;
  turma_id: number;
  aluno_pessoa_id: number;
  status: string | null;
};

type TurmaRow = {
  turma_id: number;
  nome: string | null;
  tipo_turma: string | null;
};

async function validarNucleoExiste(nucleoId: number): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("nucleos").select("id").eq("id", nucleoId).maybeSingle();
  if (error) return error.message;
  return data ? null : "grupo nao encontrado.";
}

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const supabase = createAdminClient();
  const { id } = await params;
  const grupoId = parseId(id);

  if (grupoId === null) {
    return NextResponse.json({ ok: false, error: "grupo_id invalido." }, { status: 400 });
  }

  const erroNucleo = await validarNucleoExiste(grupoId);
  if (erroNucleo) {
    const status = erroNucleo === "grupo nao encontrado." ? 404 : 500;
    return NextResponse.json({ ok: false, error: erroNucleo }, { status });
  }

  const { data: membrosData, error: membrosError } = await supabase
    .from("nucleo_membros")
    .select("id,pessoa_id,data_entrada,pessoas!inner(id,nome,telefone,email)")
    .eq("nucleo_id", grupoId)
    .eq("ativo", true);

  if (membrosError) {
    return NextResponse.json({ ok: false, error: membrosError.message }, { status: 500 });
  }

  const membros = (membrosData ?? []) as NucleoMembroRow[];
  if (membros.length === 0) {
    return NextResponse.json({ ok: true, data: [] });
  }

  const pessoaIds = [...new Set(membros.map((membro) => membro.pessoa_id))];

  const { data: matriculasData, error: matriculasError } = await supabase
    .from("matriculas")
    .select("id,pessoa_id,status,tipo_matricula,updated_at,created_at")
    .in("pessoa_id", pessoaIds)
    .eq("status", "ATIVA")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (matriculasError) {
    return NextResponse.json({ ok: false, error: matriculasError.message }, { status: 500 });
  }

  const matriculaAtivaPorPessoa = new Map<number, MatriculaRow>();
  for (const matricula of (matriculasData ?? []) as MatriculaRow[]) {
    if (!matriculaAtivaPorPessoa.has(matricula.pessoa_id)) {
      matriculaAtivaPorPessoa.set(matricula.pessoa_id, matricula);
    }
  }

  const { data: turmaAlunoData, error: turmaAlunoError } = await supabase
    .from("turma_aluno")
    .select("turma_aluno_id,turma_id,aluno_pessoa_id,status")
    .in("aluno_pessoa_id", pessoaIds)
    .eq("status", "ativo")
    .order("turma_id", { ascending: true });

  if (turmaAlunoError) {
    return NextResponse.json({ ok: false, error: turmaAlunoError.message }, { status: 500 });
  }

  const vinculosTurma = (turmaAlunoData ?? []) as TurmaAlunoRow[];
  const turmaIds = [...new Set(vinculosTurma.map((vinculo) => vinculo.turma_id))];

  const turmasPorId = new Map<number, TurmaRow>();
  if (turmaIds.length > 0) {
    const { data: turmasData, error: turmasError } = await supabase
      .from("turmas")
      .select("turma_id,nome,tipo_turma")
      .in("turma_id", turmaIds);

    if (turmasError) {
      return NextResponse.json({ ok: false, error: turmasError.message }, { status: 500 });
    }

    for (const turma of (turmasData ?? []) as TurmaRow[]) {
      turmasPorId.set(turma.turma_id, turma);
    }
  }

  const turmasPorPessoa = new Map<number, Array<{ id: number; nome: string; tipo_turma: string | null }>>();
  for (const vinculo of vinculosTurma) {
    const turma = turmasPorId.get(vinculo.turma_id);
    if (!turma) continue;

    const listaAtual = turmasPorPessoa.get(vinculo.aluno_pessoa_id) ?? [];
    listaAtual.push({
      id: turma.turma_id,
      nome: turma.nome ?? `Turma ${turma.turma_id}`,
      tipo_turma: turma.tipo_turma ?? null,
    });
    turmasPorPessoa.set(vinculo.aluno_pessoa_id, listaAtual);
  }

  const detalhado = membros
    .map((membro) => {
      const pessoa = membro.pessoas;
      const matricula = matriculaAtivaPorPessoa.get(membro.pessoa_id) ?? null;
      const turmas = turmasPorPessoa.get(membro.pessoa_id) ?? [];
      const status = matricula ? "OK" : "SEM_MATRICULA";

      return {
        pessoa: {
          id: membro.pessoa_id,
          nome: pessoa?.nome ?? "",
          telefone: pessoa?.telefone ?? null,
          email: pessoa?.email ?? null,
        },
        membro: {
          id: membro.id,
          data_entrada: membro.data_entrada,
        },
        matricula: matricula
          ? {
              status: matricula.status,
              tipo_matricula: matricula.tipo_matricula,
            }
          : null,
        turmas,
        indicadores: {
          frequencia_percentual: null,
          ultima_aula: null,
          status,
        },
      };
    })
    .sort((a, b) => a.pessoa.nome.localeCompare(b.pessoa.nome, "pt-BR", { sensitivity: "base" }));

  return NextResponse.json({ ok: true, data: detalhado });
}
