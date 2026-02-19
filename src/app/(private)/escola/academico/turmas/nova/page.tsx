"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { StatusTurma, TipoTurma, TurnoTurma } from "@/types/turmas";

type Curso = { id: number; nome: string };
type Nivel = {
  id: number;
  nome: string;
  curso_id: number | null;
  idade_minima: number | null;
  idade_maxima: number | null;
};
type Professor = { id: number; nome: string };
type Local = { id: number; nome: string; tipo: string };
type Espaco = { id: number; local_id: number; nome: string; tipo: string; capacidade: number | null };
type ContextoTipo = "PERIODO_LETIVO" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
type ContextoMatricula = {
  id: number;
  tipo: ContextoTipo;
  titulo: string;
  ano_referencia: number | null;
  status: string;
};
type PeriodoLetivo = {
  id: number;
  codigo: string;
  titulo: string;
  ano_referencia: number;
  data_inicio: string;
  data_fim: string;
  inicio_letivo_janeiro: string | null;
  ativo: boolean;
};
type CursosApiResponse = {
  cursos?: Curso[];
  data?: Array<{ id: number; nome: string }>;
};
type ProfessoresApiResponse = {
  professores?: Professor[];
};
type NiveisApiResponse = {
  niveis?: Nivel[];
};

const TIPOS_TURMA: TipoTurma[] = ["REGULAR", "CURSO_LIVRE", "ENSAIO"];
const TURNOS: TurnoTurma[] = ["MANHA", "TARDE", "NOITE", "INTEGRAL"];
const STATUS_OPCOES: StatusTurma[] = ["EM_PREPARACAO", "ATIVA", "ENCERRADA", "CANCELADA"];

const DIAS_SEMANA = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sab" },
];

function abreviarDia(valor: string): string | null {
  const normalizado = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");

  switch (normalizado) {
    case "DOM":
    case "DOMINGO":
      return "Dom";
    case "SEG":
    case "SEGUNDA":
    case "SEGUNDAFEIRA":
      return "Seg";
    case "TER":
    case "TERCA":
    case "TERCAFEIRA":
      return "Ter";
    case "QUA":
    case "QUARTA":
    case "QUARTAFEIRA":
      return "Qua";
    case "QUI":
    case "QUINTA":
    case "QUINTAFEIRA":
      return "Qui";
    case "SEX":
    case "SEXTA":
    case "SEXTAFEIRA":
      return "Sex";
    case "SAB":
    case "SABADO":
      return "Sab";
    default:
      return null;
  }
}

function compactarNiveis(resumo: string | null): string {
  const partes = (resumo ?? "")
    .split(",")
    .map((parte) => parte.trim())
    .filter((parte) => parte.length > 0);

  if (partes.length === 0) return "";

  const abreviados = partes.map((parte) => parte.replace(/^nivel\s*/i, "N").replace(/\s+/g, " "));

  if (abreviados.length <= 2) {
    return abreviados.join("/");
  }

  const primeiros = abreviados.slice(0, 2).join("/");
  return `${primeiros}/+${abreviados.length - 2}`;
}

function labelPeriodo(periodo: PeriodoLetivo): string {
  const ano = periodo.ano_referencia ? ` (${periodo.ano_referencia})` : "";
  return `${periodo.titulo}${ano}`;
}

function mapContextoTipo(tipo: TipoTurma): ContextoTipo {
  if (tipo === "REGULAR") return "PERIODO_LETIVO";
  if (tipo === "CURSO_LIVRE") return "CURSO_LIVRE";
  return "PROJETO_ARTISTICO";
}

function montarNomeTurma(params: {
  curso?: string | null;
  nivelResumo?: string | null;
  turno?: string | null;
  dias?: string[];
  ano?: number;
}): string {
  const curso = params.curso?.trim() || "Turma";
  const nivel = compactarNiveis(params.nivelResumo ?? null);

  const turnoMap: Record<string, string> = {
    MANHA: "Manha",
    TARDE: "Tarde",
    NOITE: "Noite",
    INTEGRAL: "Integral",
  };
  const turno = params.turno ? turnoMap[String(params.turno).toUpperCase()] ?? String(params.turno) : "";

  const diasOrdenados = (params.dias ?? [])
    .map((dia) => abreviarDia(dia) ?? dia)
    .filter((dia) => dia)
    .map((dia) => String(dia));

  const ordemDia: Record<string, number> = { Dom: 0, Seg: 1, Ter: 2, Qua: 3, Qui: 4, Sex: 5, Sab: 6 };
  const diasUnicos = Array.from(new Set(diasOrdenados));
  diasUnicos.sort((a, b) => (ordemDia[a] ?? 99) - (ordemDia[b] ?? 99));
  const dias = diasUnicos.length > 0 ? diasUnicos.join("/") : "";

  const partes = [curso, nivel, turno, dias].filter((parte) => parte && String(parte).trim().length > 0);
  if (params.ano) {
    partes.push(String(params.ano));
  }

  return partes.join(" - ");
}

export default function NovaTurmaPage() {
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [tipoTurma, setTipoTurma] = useState<TipoTurma>("REGULAR");

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCursoId, setSelectedCursoId] = useState<number | null>(null);
  const [selectedCursoNome, setSelectedCursoNome] = useState<string>("");

  const [niveis, setNiveis] = useState<Nivel[]>([]);
  const [niveisSelecionados, setNiveisSelecionados] = useState<string[]>([]);

  const [locais, setLocais] = useState<Local[]>([]);
  const [localId, setLocalId] = useState<string>("");
  const [espacos, setEspacos] = useState<Espaco[]>([]);
  const [espacoId, setEspacoId] = useState<string>("");

  const [professores, setProfessores] = useState<Professor[]>([]);
  const [professorPrincipalId, setProfessorPrincipalId] = useState<string>("");
  const [professoresAuxiliares, setProfessoresAuxiliares] = useState<string[]>([]);

  const [diasSelecionados, setDiasSelecionados] = useState<number[]>([]);
  const [horariosPorDia, setHorariosPorDia] = useState<Record<number, { inicio: string; fim: string }>>(() =>
    Object.fromEntries(DIAS_SEMANA.map((dia) => [dia.value, { inicio: "", fim: "" }])),
  );
  const [lastHorario, setLastHorario] = useState<{ inicio: string; fim: string } | null>(null);
  const [turnoSelecionado, setTurnoSelecionado] = useState<string>("");
  const anoAtual = new Date().getFullYear();
  const anosReferencia = Array.from({ length: 4 }, (_, i) => anoAtual - 1 + i);
  const [anoReferencia, setAnoReferencia] = useState<number>(anoAtual);
  const [periodos, setPeriodos] = useState<PeriodoLetivo[]>([]);
  const [periodoLetivoId, setPeriodoLetivoId] = useState<string>("");
  const [periodosErro, setPeriodosErro] = useState<string | null>(null);
  const [periodosLoading, setPeriodosLoading] = useState(false);
  const [contextos, setContextos] = useState<ContextoMatricula[]>([]);
  const [contextoId, setContextoId] = useState<string>("");
  const [contextosErro, setContextosErro] = useState<string | null>(null);
  const [contextosLoading, setContextosLoading] = useState(false);

  const [nomeManualHabilitado, setNomeManualHabilitado] = useState(false);
  const [nomeManual, setNomeManual] = useState("");

  useEffect(() => {
    let active = true;

    async function carregar() {
      const resCursos = await fetch("/api/escola/academico/cursos", { cache: "no-store" });
      if (!resCursos.ok) {
        console.error("Falha ao carregar cursos:", resCursos.status);
      }
      const cursosData = resCursos.ok
        ? ((await resCursos.json()) as CursosApiResponse)
        : ({ cursos: [] } as CursosApiResponse);
      const cursosLista = Array.isArray(cursosData.cursos)
        ? cursosData.cursos
        : Array.isArray(cursosData.data)
          ? cursosData.data
          : [];
      if (active) {
        setCursos(cursosLista);
      }

      const locaisResp = await fetch("/api/locais");
      if (locaisResp.ok) {
        const locaisJson = (await locaisResp.json()) as { locais?: Local[] };
        if (active) setLocais(locaisJson.locais ?? []);
      } else {
        console.error("Erro ao carregar locais");
      }

      const resProf = await fetch("/api/escola/academico/professores", { cache: "no-store" });
      if (!resProf.ok) {
        console.error("Falha ao carregar professores:", resProf.status);
      }
      const professoresData = resProf.ok
        ? ((await resProf.json()) as ProfessoresApiResponse)
        : ({ professores: [] } as ProfessoresApiResponse);
      if (active) {
        setProfessores(professoresData.professores ?? []);
      }
    }
    void carregar();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tipoTurma !== "REGULAR") {
      setPeriodos([]);
      setPeriodoLetivoId("");
      setPeriodosErro(null);
      setPeriodosLoading(false);
      return;
    }

    let active = true;
    async function carregarPeriodos() {
      setPeriodosErro(null);
      setPeriodosLoading(true);
      try {
        const resp = await fetch("/api/academico/periodos-letivos");
        const json = (await resp.json()) as { items?: PeriodoLetivo[]; error?: string };
        if (!resp.ok) throw new Error(json.error ?? "Falha ao carregar periodos letivos.");
        if (!active) return;
        const lista = Array.isArray(json.items) ? json.items : [];
        setPeriodos(lista);

        const periodoAtual = Number(periodoLetivoId);
        const periodoExiste = lista.some((p) => p.id === periodoAtual);
        const matchAno =
          Number.isFinite(anoReferencia) ? lista.find((p) => p.ano_referencia === anoReferencia) ?? null : null;
        const padrao = matchAno ?? lista[0] ?? null;

        if (!periodoExiste) {
          setPeriodoLetivoId(padrao ? String(padrao.id) : "");
        }
        if (padrao?.ano_referencia) {
          setAnoReferencia(padrao.ano_referencia);
        }
      } catch (e) {
        if (!active) return;
        setPeriodosErro(e instanceof Error ? e.message : "Falha ao carregar periodos letivos.");
        setPeriodos([]);
      } finally {
        if (active) setPeriodosLoading(false);
      }
    }

    void carregarPeriodos();
    return () => {
      active = false;
    };
  }, [tipoTurma, anoReferencia, periodoLetivoId]);

  useEffect(() => {
    let active = true;

    async function carregarContextos() {
      setContextosErro(null);
      setContextosLoading(true);
      try {
        const tipoContexto = mapContextoTipo(tipoTurma);
        const params = new URLSearchParams({ tipo: tipoContexto, status: "ATIVO" });
        if (tipoTurma === "REGULAR" && Number.isFinite(anoReferencia)) {
          params.set("ano", String(anoReferencia));
        }
        const resp = await fetch(`/api/matriculas/contextos?${params.toString()}`);
        const json = (await resp.json()) as { ok?: boolean; data?: ContextoMatricula[]; error?: string };
        if (!resp.ok || json.ok === false) {
          throw new Error(json.error || "Falha ao carregar contextos.");
        }
        if (!active) return;
        const lista = json.data ?? [];
        setContextos(lista);

        const contextoAtual = Number(contextoId);
        const contextoExiste = lista.some((c) => c.id === contextoAtual);
        const matchAno =
          tipoTurma === "REGULAR" && Number.isFinite(anoReferencia)
            ? lista.find((c) => c.ano_referencia === anoReferencia) ?? null
            : null;
        const padrao = matchAno ?? lista[0] ?? null;

      if (!contextoExiste) {
        setContextoId(padrao ? String(padrao.id) : "");
      }
    } catch (e) {
      if (!active) return;
        setContextosErro(e instanceof Error ? e.message : "Falha ao carregar contextos.");
        setContextos([]);
      } finally {
        if (active) setContextosLoading(false);
      }
    }

    void carregarContextos();
    return () => {
      active = false;
    };
  }, [tipoTurma, anoReferencia, contextoId]);

  useEffect(() => {
    let active = true;
    async function carregarNiveis() {
      if (!selectedCursoId) {
        setNiveis([]);
        setNiveisSelecionados([]);
        return;
      }

      const resp = await fetch(`/api/escola/academico/cursos/${selectedCursoId}/niveis`, { cache: "no-store" });
      if (!resp.ok) {
        console.error("Falha ao carregar niveis:", resp.status);
        if (active) setNiveis([]);
        return;
      }

      const data = (await resp.json()) as NiveisApiResponse;
      if (active) {
        setNiveis(Array.isArray(data.niveis) ? data.niveis : []);
      }
    }

    void carregarNiveis();
    return () => {
      active = false;
    };
  }, [selectedCursoId]);

  useEffect(() => {
    let active = true;
    async function carregarEspacos() {
      if (!localId) {
        setEspacos([]);
        setEspacoId("");
        return;
      }

      const resp = await fetch(`/api/locais/${localId}/espacos`);
      if (!resp.ok) {
        console.error("Erro ao carregar espacos");
        if (active) {
          setEspacos([]);
          setEspacoId("");
        }
        return;
      }

      const json = (await resp.json()) as { espacos?: Espaco[] };
      if (!active) return;
      setEspacos(json.espacos ?? []);
      setEspacoId("");
    }

    void carregarEspacos();
    return () => {
      active = false;
    };
  }, [localId]);

  const onCursoChange = (cursoIdValue: string) => {
    const id = Number(cursoIdValue);
    setNiveisSelecionados([]);
    if (!Number.isFinite(id) || id <= 0) {
      setSelectedCursoId(null);
      setSelectedCursoNome("");
      return;
    }
    setSelectedCursoId(id);
    const curso = cursos.find((c) => c.id === id);
    setSelectedCursoNome(curso?.nome ?? "");
  };

  useEffect(() => {
    if (!selectedCursoId) {
      if (selectedCursoNome) setSelectedCursoNome("");
      return;
    }
    const curso = cursos.find((c) => c.id === selectedCursoId);
    if (!curso) {
      setSelectedCursoId(null);
      setSelectedCursoNome("");
      return;
    }
    if (curso.nome !== selectedCursoNome) {
      setSelectedCursoNome(curso.nome);
    }
  }, [cursos, selectedCursoId, selectedCursoNome]);

  const niveisSelecionadosObjs = useMemo(
    () => niveis.filter((n) => niveisSelecionados.includes(String(n.id))),
    [niveis, niveisSelecionados],
  );
  const nivelResumo = useMemo(
    () => (niveisSelecionadosObjs.length > 0 ? niveisSelecionadosObjs.map((n) => n.nome).join(", ") : null),
    [niveisSelecionadosObjs],
  );
  const faixaEtariaPrevista = useMemo(() => {
    const mins = niveisSelecionadosObjs
      .map((n) => n.idade_minima)
      .filter((v): v is number => typeof v === "number");
    const maxs = niveisSelecionadosObjs
      .map((n) => n.idade_maxima)
      .filter((v): v is number => typeof v === "number");

    return {
      min: mins.length ? Math.min(...mins) : null,
      max: maxs.length ? Math.max(...maxs) : null,
    };
  }, [niveisSelecionadosObjs]);
  const diasLabels = useMemo(
    () =>
      diasSelecionados
        .map((d) => DIAS_SEMANA.find((dia) => dia.value === d)?.label)
        .filter((d): d is string => Boolean(d)),
    [diasSelecionados],
  );
  const nomeGerado = useMemo(
    () =>
      montarNomeTurma({
        curso: selectedCursoNome || null,
        nivelResumo,
        turno: turnoSelecionado || null,
        dias: diasLabels,
        ano: anoReferencia,
      }),
    [selectedCursoNome, nivelResumo, turnoSelecionado, diasLabels, anoReferencia],
  );
  const professoresUnicos = useMemo(() => {
    const map = new Map<number, Professor>();
    professores.forEach((prof) => {
      if (!prof || !Number.isFinite(prof.id)) return;
      if (!map.has(prof.id)) map.set(prof.id, prof);
    });
    return Array.from(map.values());
  }, [professores]);

  const toggleNivel = (id: string) => {
    setNiveisSelecionados((prev) => (prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]));
  };

  const toggleAuxiliar = (id: string) => {
    setProfessoresAuxiliares((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const toggleDia = (value: number) => {
    setDiasSelecionados((prev) => {
      const ativo = prev.includes(value);
      if (ativo) {
        return prev.filter((d) => d !== value);
      }

      setHorariosPorDia((prevHor) => {
        const atual = prevHor[value] ?? { inicio: "", fim: "" };
        if (!atual.inicio && !atual.fim && lastHorario) {
          return {
            ...prevHor,
            [value]: { inicio: lastHorario.inicio, fim: lastHorario.fim },
          };
        }
        return prevHor;
      });

      return [...prev, value];
    });
  };

  const atualizarHorario = (diaValue: number, campo: "inicio" | "fim", valor: string) => {
    setHorariosPorDia((prev) => {
      const atual = prev[diaValue] ?? { inicio: "", fim: "" };
      const next = { ...prev, [diaValue]: { ...atual, [campo]: valor } };
      const horarioFinal = next[diaValue];
      if (horarioFinal.inicio && horarioFinal.fim) {
        setLastHorario({ inicio: horarioFinal.inicio, fim: horarioFinal.fim });
      }
      return next;
    });
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setErro(null);
    setSaving(true);

    try {
      if (!selectedCursoId) {
        setErro("Selecione um curso.");
        setSaving(false);
        return;
      }
      if (!localId) {
        setErro("Selecione um local.");
        setSaving(false);
        return;
      }
      if (!espacoId) {
        setErro("Selecione um espaco.");
        setSaving(false);
        return;
      }

      const cursoTexto =
        selectedCursoNome ||
        (selectedCursoId ? cursos.find((c) => c.id === selectedCursoId)?.nome ?? "" : "");
      const nivelTexto = nivelResumo;
      const niveisIdsPayload = Array.from(
        new Set(
          niveisSelecionados
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      );

      const tipoTurmaSelecionado = tipoTurma;
      if ((tipoTurmaSelecionado === "REGULAR" || tipoTurmaSelecionado === "CURSO_LIVRE") && niveisIdsPayload.length === 0) {
        setErro("Selecione ao menos um nivel.");
        setSaving(false);
        return;
      }

      const cargaStr = formData.get("carga_horaria_prevista") as string | null;
      const freqStr = formData.get("frequencia_minima") as string | null;
      const contextoIdNum = contextoId ? Number(contextoId) : null;

      if (tipoTurmaSelecionado === "REGULAR" && !periodoLetivoId) {
        setErro("Selecione o periodo letivo.");
        setSaving(false);
        return;
      }

      if (!contextoIdNum || !Number.isFinite(contextoIdNum)) {
        setErro("Selecione o contexto da matricula.");
        setSaving(false);
        return;
      }

      const diasMarcados = diasSelecionados;
      const nomeFinal =
        nomeManualHabilitado && nomeManual.trim().length > 0 ? nomeManual.trim() : nomeGerado;

      if (diasLabels.length === 0) {
        setErro("Selecione ao menos um dia da semana.");
        setSaving(false);
        return;
      }

      const payload = {
        nome: nomeFinal,
        tipo_turma: tipoTurmaSelecionado,
        turno: (formData.get("turno") as string) || null,
        status: (formData.get("status") as string) || "EM_PREPARACAO",
        nivel: nivelTexto,
        ano_referencia: Number.isFinite(anoReferencia) ? anoReferencia : null,
        curso: cursoTexto || null,
        espaco_id: Number(espacoId),
        capacidade: formData.get("capacidade") ? Number(formData.get("capacidade")) : null,
        carga_horaria_prevista: cargaStr ? Number(cargaStr) : null,
        frequencia_minima_percentual: freqStr ? Number(freqStr) : null,
        data_inicio: (formData.get("data_inicio") as string) || null,
        data_fim: (formData.get("data_fim") as string) || null,
        dias_semana: diasLabels,
        hora_inicio: null,
        hora_fim: null,
        professor_id: professorPrincipalId ? Number(professorPrincipalId) : null,
        observacoes: (formData.get("observacoes") as string) || null,
        contexto_matricula_id: contextoIdNum,
        ...(tipoTurmaSelecionado === "REGULAR" && periodoLetivoId
          ? { periodo_letivo_id: Number(periodoLetivoId) }
          : {}),
      };
      const horariosPorDiaPayload: { day_of_week: number; inicio: string; fim: string }[] = [];
      for (const dia of DIAS_SEMANA) {
        if (diasMarcados.includes(dia.value)) {
          const horario = horariosPorDia[dia.value] ?? { inicio: "", fim: "" };
          const inicio = horario.inicio || null;
          const fim = horario.fim || null;
          if (inicio && fim) {
            horariosPorDiaPayload.push({ day_of_week: dia.value, inicio, fim });
          } else {
            setErro("Preencha horario de inicio e fim para os dias marcados.");
            setSaving(false);
            return;
          }
        }
      }

      const response = await fetch("/api/turmas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turma: payload,
          horarios_por_dia: horariosPorDiaPayload,
          niveis_ids: niveisIdsPayload,
        }),
      });
      const json = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(json.message ?? json.error ?? "Erro ao criar turma");
      }

      // TODO: professores auxiliares via turma_professores (usar professoresAuxiliares)

      router.push("/escola/academico/turmas");
    } catch (e: unknown) {
      console.error(e);
      const message = e instanceof Error ? e.message : "Erro inesperado ao salvar turma.";
      setErro(message);
      setSaving(false);
      return;
    }

    setSaving(false);
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Academico</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">📚 Nova turma</h1>
          <p className="mt-1 text-sm text-slate-500">Preencha os dados basicos da turma e os horarios por dia.</p>
        </header>

        {erro && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">{erro}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-violet-100 bg-white/95 p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo de turma</label>
              <select
                name="tipo_turma"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                value={tipoTurma}
                onChange={(e) => setTipoTurma(e.target.value as TipoTurma)}
              >
                {TIPOS_TURMA.map((t) => (
                  <option key={`tipo-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
              <select
                name="status"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                defaultValue="EM_PREPARACAO"
              >
                {STATUS_OPCOES.map((s) => (
                  <option key={`status-${s}`} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Turno</label>
              <select
                name="turno"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                value={turnoSelecionado}
                onChange={(e) => setTurnoSelecionado(e.target.value)}
              >
                <option value="">-</option>
                {TURNOS.map((t) => (
                  <option key={`turno-${t}`} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-end justify-between gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nome da turma</label>
                {!nomeManualHabilitado && (
                  <button
                    type="button"
                    className="text-xs text-slate-500 underline hover:text-slate-700"
                    onClick={() => {
                      setNomeManualHabilitado(true);
                      setNomeManual((prev) => (prev.trim().length > 0 ? prev : nomeGerado));
                    }}
                  >
                    Editar manualmente
                  </button>
                )}
              </div>
              <input
                name="nome"
                readOnly={!nomeManualHabilitado}
                value={nomeManualHabilitado ? nomeManual : nomeGerado}
                onChange={(e) => setNomeManual(e.target.value)}
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm ${
                  nomeManualHabilitado ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50"
                }`}
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Nome gerado automaticamente a partir do curso, niveis, turno, dias e ano.
              </p>
            </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Curso</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={selectedCursoId ? String(selectedCursoId) : ""}
              onChange={(e) => onCursoChange(e.target.value)}
            >
              <option value="">-</option>
              {cursos.map((c) => (
                <option key={`curso-${c.id}`} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Grava como texto em &quot;curso&quot; (TODO: migrar para curso_id quando existir).
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Local</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={localId}
              onChange={(e) => {
                setLocalId(e.target.value);
                setEspacoId("");
              }}
            >
              <option value="">-</option>
              {locais.map((local) => (
                <option key={`local-${local.id}`} value={local.id}>
                  {local.nome} ({local.tipo})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Espaco</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              value={espacoId}
              onChange={(e) => setEspacoId(e.target.value)}
              disabled={!localId}
            >
              <option value="">{localId ? "-" : "Selecione um local"}</option>
              {espacos.map((espaco) => (
                <option key={`espaco-${espaco.id}`} value={espaco.id}>
                  {espaco.nome} ({espaco.tipo})
                </option>
              ))}
            </select>
            {localId && espacos.length === 0 && (
              <p className="mt-1 text-[11px] text-slate-500">Nenhum espaco cadastrado para este local.</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Nivel (pode ser mais de um nivel, ex.: Nivel 1 / Nivel 2)
            </label>
              {selectedCursoId ? (
                <div className="flex flex-wrap gap-2">
                  {niveis.length === 0 && <span className="text-xs text-slate-500">Nenhum nivel para este curso.</span>}
                  {niveis.map((n) => (
                    <label
                      key={`nivel-${n.id}`}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                        niveisSelecionados.includes(String(n.id))
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-slate-200 bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="h-3 w-3"
                        checked={niveisSelecionados.includes(String(n.id))}
                        onChange={() => toggleNivel(String(n.id))}
                      />
                      <span>{n.nome}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Escolha primeiro um curso para ver os niveis.</p>
              )}
              <div className="mt-2 text-xs text-slate-500">
                Faixa etaria prevista: {faixaEtariaPrevista.min ?? "-"} a {faixaEtariaPrevista.max ?? "-"}
              </div>
            </div>
            <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ano de referencia</label>
              <select
                name="ano_referencia"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                value={anoReferencia}
                onChange={(e) => setAnoReferencia(Number(e.target.value))}
              >
                {anosReferencia.map((ano) => (
                  <option key={`ano-${ano}`} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {tipoTurma === "REGULAR" ? "Periodo letivo" : "Contexto da matricula"}
              </label>
              {tipoTurma === "REGULAR" ? (
                <>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={periodoLetivoId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setPeriodoLetivoId(nextId);
                      const encontrado = periodos.find((p) => p.id === Number(nextId)) ?? null;
                      if (encontrado?.ano_referencia) setAnoReferencia(encontrado.ano_referencia);
                    }}
                    disabled={periodosLoading}
                  >
                    <option value="">{periodosLoading ? "Carregando..." : "Selecione..."}</option>
                    {periodos.map((periodo) => (
                      <option key={`periodo-${periodo.id}`} value={periodo.id}>
                        {labelPeriodo(periodo)}
                      </option>
                    ))}
                  </select>
                  {periodosErro ? <p className="mt-1 text-[11px] text-rose-600">{periodosErro}</p> : null}
                  {!contextosLoading && !contextoId ? (
                    <p className="mt-1 text-[11px] text-rose-600">Contexto da matricula nao encontrado para o periodo.</p>
                  ) : null}
                </>
              ) : (
                <>
                  <select
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={contextoId}
                    onChange={(e) => setContextoId(e.target.value)}
                    disabled={contextosLoading}
                  >
                    <option value="">{contextosLoading ? "Carregando..." : "Selecione..."}</option>
                    {contextos.map((c) => (
                      <option key={`contexto-${c.id}`} value={c.id}>
                        {c.titulo}
                        {c.ano_referencia ? ` (${c.ano_referencia})` : ""}
                      </option>
                    ))}
                  </select>
                  {contextosErro ? <p className="mt-1 text-[11px] text-rose-600">{contextosErro}</p> : null}
                </>
              )}
            </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Capacidade (opcional)</label>
              <input
                name="capacidade"
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Professor principal</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={professorPrincipalId}
                onChange={(e) => setProfessorPrincipalId(e.target.value)}
              >
                <option value="">-</option>
                {professoresUnicos.map((p) => (
                  <option key={`prof-${p.id}`} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Professores auxiliares / estagiarios</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {professoresUnicos
                  .filter((p) => p.id !== Number(professorPrincipalId))
                  .map((prof) => (
                    <label
                      key={`aux-${prof.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={professoresAuxiliares.includes(String(prof.id))}
                        onChange={() => toggleAuxiliar(String(prof.id))}
                      />
                      <span>{prof.nome}</span>
                    </label>
                  ))}
                {professoresUnicos.length === 0 && (
                  <span className="text-xs text-slate-500">Nenhum professor encontrado.</span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">TODO: Vincular auxiliares via turma_professores apos criar a turma.</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dias da semana e horarios</label>

            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
              {DIAS_SEMANA.map((dia) => {
                const ativo = diasSelecionados.includes(dia.value);
                return (
                  <div
                    key={`dia-${dia.value}`}
                    className={[
                      "flex flex-col gap-2 rounded-2xl border px-3 py-2 text-[11px] md:text-xs shadow-sm transition",
                      ativo ? "border-violet-300 bg-white ring-1 ring-violet-200" : "border-slate-200 bg-slate-50/60 opacity-80",
                    ].join(" ")}
                  >
                    <label className="flex items-center justify-between gap-2">
                      <span className="font-medium text-slate-700">{dia.label}</span>
                      <input
                        type="checkbox"
                        className="h-3 w-3 md:h-4 md:w-4"
                        checked={ativo}
                        onChange={() => toggleDia(dia.value)}
                      />
                    </label>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-slate-500">Inicio</span>
                        <input
                          type="time"
                          name={`inicio_${dia.value}`}
                          className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px]"
                          disabled={!ativo}
                          value={horariosPorDia[dia.value]?.inicio ?? ""}
                          onChange={(e) => atualizarHorario(dia.value, "inicio", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] uppercase tracking-wide text-slate-500">Fim</span>
                        <input
                          type="time"
                          name={`fim_${dia.value}`}
                          className="w-24 rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px]"
                          disabled={!ativo}
                          value={horariosPorDia[dia.value]?.fim ?? ""}
                          onChange={(e) => atualizarHorario(dia.value, "fim", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              Marque os dias em que a turma acontece e defina o horario de inicio e fim para cada dia.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data de inicio</label>
              <input
                name="data_inicio"
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data de fim</label>
              <input
                name="data_fim"
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Carga horaria prevista (horas ou numero de aulas)
              </label>
              <input
                name="carga_horaria_prevista"
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Frequencia minima (%)</label>
              <input
                name="frequencia_minima"
                type="number"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input id="encerramento_automatico" name="encerramento_automatico" type="checkbox" className="h-4 w-4" />
            <label htmlFor="encerramento_automatico" className="text-xs text-slate-600">
              Encerrar automaticamente ao final da data de termino (com aviso)
            </label>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observacoes</label>
            <textarea
              name="observacoes"
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
          </div>

          {/* Info sobre avaliacoes da turma */}
          <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-600 md:text-sm">
            Apos salvar a turma, voce podera vincular avaliacoes especificas para ela na tela de detalhes da turma, em{" "}
            <span className="font-medium">&quot;Avaliacoes da turma&quot;</span>. Essas avaliacoes serao usadas para conclusao e curriculo.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push("/escola/academico/turmas")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-70"
            >
              {saving ? "Salvando..." : "Salvar turma"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
