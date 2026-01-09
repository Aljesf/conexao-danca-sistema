import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server-admin";
import { formatUnidadeExecucaoLabel } from "@/lib/escola/formatters/unidadeExecucaoLabel";
import { guardApiByRole } from "@/lib/auth/roleGuard";

type ContextoTipo = "PERIODO_LETIVO" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
type TipoTurma = "REGULAR" | "CURSO_LIVRE" | "ENSAIO" | "PROJETO_ARTISTICO";

type ContextoRow = {
  id: number;
  tipo: ContextoTipo;
  titulo: string;
  ano_referencia: number | null;
  status: string;
};

type TurmaRow = {
  turma_id: number;
  nome: string | null;
  curso: string | null;
  ano_referencia: number | null;
  tipo_turma: string | null;
  idade_minima: number | null;
  idade_maxima: number | null;
  status: string | null;
  ativo: boolean | null;
};

function mapTipoTurmaPorContexto(tipo: ContextoTipo): TipoTurma[] {
  if (tipo === "PERIODO_LETIVO") return ["REGULAR"];
  if (tipo === "CURSO_LIVRE") return ["CURSO_LIVRE"];
  return ["ENSAIO", "PROJETO_ARTISTICO"];
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const denied = await guardApiByRole(req as any);
  if (denied) return denied as any;
  const contextoId = Number(params.id);
  if (!Number.isFinite(contextoId) || contextoId <= 0) {
    return NextResponse.json({ ok: false, error: "contexto_id_invalido" }, { status: 400 });
  }

  const url = new URL(req.url);
  const tipoTurmaParam = url.searchParams.get("tipo_turma");
  const cursoParam = url.searchParams.get("curso");
  const onlyActive = url.searchParams.get("ativo") !== "0";

  const supabase = getSupabaseAdmin();

  const { data: contexto, error: contextoErr } = await supabase
    .from("escola_contextos_matricula")
    .select("id,tipo,titulo,ano_referencia,status")
    .eq("id", contextoId)
    .maybeSingle();

  if (contextoErr) {
    return NextResponse.json({ ok: false, error: "erro_contexto", message: contextoErr.message }, { status: 500 });
  }
  if (!contexto) {
    return NextResponse.json({ ok: false, error: "contexto_nao_encontrado" }, { status: 404 });
  }

  const contextoRow = contexto as ContextoRow;
  const tiposPermitidos = mapTipoTurmaPorContexto(contextoRow.tipo);
  const tipoTurmaSolicitado = tipoTurmaParam ? String(tipoTurmaParam).trim().toUpperCase() : null;

  if (tipoTurmaSolicitado && !tiposPermitidos.includes(tipoTurmaSolicitado as TipoTurma)) {
    return NextResponse.json(
      {
        ok: false,
        error: "tipo_turma_invalido",
        message: "tipo_turma nao compativel com o contexto informado.",
      },
      { status: 400 },
    );
  }

  let query = supabase
    .from("turmas")
    .select("turma_id,nome,curso,ano_referencia,tipo_turma,idade_minima,idade_maxima,status,ativo")
    .eq("contexto_matricula_id", contextoId);

  if (onlyActive) {
    query = query.eq("ativo", true).in("status", ["ATIVA", "EM_PREPARACAO"]);
  }

  const tiposFiltro = tipoTurmaSolicitado ? [tipoTurmaSolicitado] : tiposPermitidos;
  if (tiposFiltro.length > 0) {
    query = query.in("tipo_turma", tiposFiltro);
  }
  if (cursoParam) {
    query = query.eq("curso", cursoParam);
  }

  const { data: turmas, error: turmasErr } = await query.order("nome", { ascending: true });

  if (turmasErr) {
    return NextResponse.json({ ok: false, error: "erro_listar_turmas", message: turmasErr.message }, { status: 500 });
  }

  const turmaRows = (turmas ?? []) as TurmaRow[];
  const turmaIds = turmaRows.map((t) => Number(t.turma_id)).filter((id) => Number.isFinite(id) && id > 0);

  const ueByTurmaId = new Map<number, { unidade_execucao_id: number; denominacao: string | null; nome: string | null }>();
  if (turmaIds.length > 0) {
    const { data: ues, error: ueErr } = await supabase
      .from("escola_unidades_execucao")
      .select("unidade_execucao_id,denominacao,nome,origem_id,origem_tipo")
      .eq("origem_tipo", "TURMA")
      .in("origem_id", turmaIds);

    if (!ueErr) {
      (ues ?? []).forEach((ue) => {
        const record = ue as Record<string, unknown>;
        const turmaId = Number(record.origem_id);
        const ueId = Number(record.unidade_execucao_id);
        if (!Number.isFinite(turmaId) || !Number.isFinite(ueId)) return;
        ueByTurmaId.set(turmaId, {
          unidade_execucao_id: ueId,
          denominacao: record.denominacao ? String(record.denominacao) : null,
          nome: record.nome ? String(record.nome) : null,
        });
      });
    }
  }

  const mapped = turmaRows.map((t) => {
    const turmaId = Number(t.turma_id);
    const ue = ueByTurmaId.get(turmaId) ?? null;
    const unidadeExecucaoId = ue?.unidade_execucao_id ?? null;
    const unidadeExecucaoLabel = formatUnidadeExecucaoLabel({
      unidadeExecucaoId: unidadeExecucaoId ?? null,
      origemTipo: "TURMA",
      turmaId,
      turmaNome: t.nome ?? null,
      unidadeDenominacao: ue?.denominacao ?? null,
      unidadeNome: ue?.nome ?? null,
    });

    return {
      ...t,
      unidade_execucao_id: unidadeExecucaoId,
      unidade_execucao_label: unidadeExecucaoLabel,
    };
  });

  return NextResponse.json({ ok: true, contexto: contextoRow, turmas: mapped });
}
