"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type DiarioStatus = "PENDENTE" | "PRONTO" | "ERRO";
type PresencaBaseStatus = "PRESENTE" | "FALTA";
type PresencaStatus = "PRESENTE" | "FALTA" | "JUSTIFICADA" | "ATRASO";

type Turma = {
  turma_id: number;
  nome?: string | null;
  titulo?: string | null;
  descricao?: string | null;
  dias_semana?: string[] | null;
  hora_inicio?: string | null;
  hora_fim?: string | null;
};

type Aluno = {
  aluno_pessoa_id: number;
  nome: string | null;
};

type Aula = {
  id: number;
  turma_id: number;
  data_aula: string;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  fechada_em?: string | null;
  fechada_por?: string | null;
  aula_numero?: number | null;
};

type PlanoSubbloco = {
  id: number;
  bloco_id: number;
  ordem: number;
  titulo: string;
  minutos_min?: number | null;
  minutos_ideal?: number | null;
  minutos_max?: number | null;
  habilidade_id?: number | null;
  nivel_abordagem?: string | null;
  instrucoes?: string | null;
  musica_sugestao?: string | null;
};

type PlanoBloco = {
  id: number;
  plano_aula_id: number;
  ordem: number;
  titulo: string;
  objetivo?: string | null;
  minutos_min?: number | null;
  minutos_ideal?: number | null;
  minutos_max?: number | null;
  musica_sugestao?: string | null;
  observacoes?: string | null;
  plano_aula_subblocos?: PlanoSubbloco[] | null;
};

type PlanoAula = {
  id: number;
  ciclo_id: number;
  aula_numero: number;
  intencao_pedagogica?: string | null;
  observacoes_gerais?: string | null;
  playlist_url?: string | null;
  plano_aula_blocos?: PlanoBloco[] | null;
};

type PlanoInstancia = {
  id: number;
  turma_aula_id: number;
  plano_aula_id: number;
  status: "EM_EXECUCAO" | "CONCLUIDO";
  notas_pos_aula?: string | null;
  concluido_por?: string | null;
  concluido_em?: string | null;
};

type PresencaDb = {
  aluno_pessoa_id: number;
  status: PresencaStatus;
  minutos_atraso: number | null;
  observacao: string | null;
};

type ProfessorOption = {
  colaborador_id: number;
  pessoa_id: number | null;
  nome: string | null;
};

type ItemPresenca = {
  alunoPessoaId: number;
  status: PresencaStatus;
  minutosAtraso?: number;
  observacao?: string;
};

type LinhaChamada = {
  aluno_pessoa_id: number;
  nome: string;
  base_status: PresencaBaseStatus;
  atraso_ativo: boolean;
  minutos_atraso: number | null;
  justificativa_ativa: boolean;
  justificativa_texto: string;
};

function todayYYYYMMDD(): string {
  const d = new Date();
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toHHmm(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalizeHora(value?: string | null): string | null {
  if (!value) return null;
  if (value.length >= 5) return value.slice(0, 5);
  return null;
}

function weekdayLabelFromISO(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  const wd = d.getDay();
  return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"][wd] ?? "";
}

function defaultObservadoEm(dataAula: string, horaInicio?: string | null): string {
  const hora = normalizeHora(horaInicio);
  if (hora) return `${dataAula}T${hora}`;
  return `${dataAula}T${toHHmm(new Date())}`;
}

function mapPresencaToLinha(aluno: Aluno, presenca?: PresencaDb): LinhaChamada {
  const nome = (aluno.nome ?? "").trim() || `Aluno ${aluno.aluno_pessoa_id}`;

  if (presenca?.status === "ATRASO") {
    return {
      aluno_pessoa_id: aluno.aluno_pessoa_id,
      nome,
      base_status: "PRESENTE",
      atraso_ativo: true,
      minutos_atraso: presenca.minutos_atraso ?? 1,
      justificativa_ativa: false,
      justificativa_texto: "",
    };
  }

  if (presenca?.status === "JUSTIFICADA") {
    return {
      aluno_pessoa_id: aluno.aluno_pessoa_id,
      nome,
      base_status: "FALTA",
      atraso_ativo: false,
      minutos_atraso: null,
      justificativa_ativa: true,
      justificativa_texto: presenca.observacao ?? "",
    };
  }

  if (presenca?.status === "FALTA") {
    return {
      aluno_pessoa_id: aluno.aluno_pessoa_id,
      nome,
      base_status: "FALTA",
      atraso_ativo: false,
      minutos_atraso: null,
      justificativa_ativa: false,
      justificativa_texto: "",
    };
  }

  return {
    aluno_pessoa_id: aluno.aluno_pessoa_id,
    nome,
    base_status: "PRESENTE",
    atraso_ativo: false,
    minutos_atraso: null,
    justificativa_ativa: false,
    justificativa_texto: "",
  };
}

function serializeLinhas(linhas: LinhaChamada[]): string {
  const payload = [...linhas]
    .sort((a, b) => a.aluno_pessoa_id - b.aluno_pessoa_id)
    .map((l) => ({
      aluno_pessoa_id: l.aluno_pessoa_id,
      base_status: l.base_status,
      atraso_ativo: l.atraso_ativo,
      minutos_atraso: l.minutos_atraso ?? null,
      justificativa_ativa: l.justificativa_ativa,
      justificativa_texto: l.justificativa_texto ?? "",
    }));
  return JSON.stringify(payload);
}

async function fetchJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string; data?: unknown }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const msg =
      json &&
      typeof json === "object" &&
      typeof (json as { message?: unknown }).message === "string"
        ? (json as { message: string }).message
        : json &&
            typeof json === "object" &&
            typeof (json as { error?: unknown }).error === "string"
          ? (json as { error: string }).error
          : json &&
              typeof json === "object" &&
              typeof (json as { code?: unknown }).code === "string"
            ? (json as { code: string }).code
            : `Erro HTTP ${res.status}`;
    return { ok: false, status: res.status, message: msg, data: json };
  }

  return { ok: true, data: json as T };
}

export default function DiarioDeClassePage() {
  const [aba, setAba] = useState<
    "frequencia" | "plano" | "conteudo" | "observacoes" | "avaliacoes"
  >("frequencia");

  const [status, setStatus] = useState<DiarioStatus>("PENDENTE");
  const [erroMsg, setErroMsg] = useState<string>("");

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [professores, setProfessores] = useState<ProfessorOption[]>([]);
  const [professorFiltro, setProfessorFiltro] = useState<number | null>(null);

  const [dataAula, setDataAula] = useState<string>(todayYYYYMMDD());
  const [aula, setAula] = useState<Aula | null>(null);
  const [plano, setPlano] = useState<PlanoAula | null>(null);
  const [planoInstancia, setPlanoInstancia] = useState<PlanoInstancia | null>(null);
  const [planoLoading, setPlanoLoading] = useState(false);
  const [planoErro, setPlanoErro] = useState("");
  const [planoAplicando, setPlanoAplicando] = useState(false);
  const [planoConcluindo, setPlanoConcluindo] = useState(false);
  const [notasPosAula, setNotasPosAula] = useState("");

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [presencasRegistradas, setPresencasRegistradas] = useState(0);
  const [linhas, setLinhas] = useState<LinhaChamada[]>([]);

  const [salvando, setSalvando] = useState<boolean>(false);
  const [salvoOk, setSalvoOk] = useState<boolean>(false);
  const [fechando, setFechando] = useState<boolean>(false);
  const [fecharErro, setFecharErro] = useState<string>("");
  const [fecharPendentes, setFecharPendentes] = useState<number[]>([]);

  const baselineRef = useRef<string | null>(null);
  const linhasSignature = useMemo(() => serializeLinhas(linhas), [linhas]);
  const dirty = useMemo(() => {
    if (!baselineRef.current) return false;
    return linhasSignature !== baselineRef.current;
  }, [linhasSignature]);

  const [anotacaoOpen, setAnotacaoOpen] = useState(false);
  const [anotacaoAluno, setAnotacaoAluno] = useState<LinhaChamada | null>(null);
  const [anotacaoTitulo, setAnotacaoTitulo] = useState("");
  const [anotacaoDescricao, setAnotacaoDescricao] = useState("");
  const [anotacaoDataHora, setAnotacaoDataHora] = useState("");
  const [anotacaoErro, setAnotacaoErro] = useState("");
  const [anotacaoSalvando, setAnotacaoSalvando] = useState(false);

  const tituloAba = useMemo(() => {
    switch (aba) {
      case "frequencia":
        return "Frequencia";
      case "plano":
        return "Plano de aula";
      case "conteudo":
        return "Conteudo do curso";
      case "observacoes":
        return "Observacoes pedagogicas";
      case "avaliacoes":
        return "Avaliacoes";
      default:
        return "Diario de classe";
    }
  }, [aba]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setStatus("PENDENTE");
      setErroMsg("");
      const params = new URLSearchParams();
      if (dataAula) params.set("date", dataAula);
      if (professorFiltro) params.set("professorColaboradorId", String(professorFiltro));
      const r = await fetchJson<{ ok: boolean; turmas: Turma[] }>(
        `/api/professor/diario-de-classe/turmas?${params.toString()}`
      );
      if (!alive) return;

      if (!r.ok) {
        setStatus("ERRO");
        setErroMsg(r.message);
        return;
      }

      setTurmas(Array.isArray(r.data.turmas) ? r.data.turmas : []);
      setStatus("PRONTO");
    })().catch((e: unknown) => {
      if (!alive) return;
      setStatus("ERRO");
      setErroMsg(e instanceof Error ? e.message : "Erro ao carregar turmas.");
    });

    return () => {
      alive = false;
    };
  }, [dataAula, professorFiltro]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await fetchJson<{ ok: boolean; professores: ProfessorOption[] }>(
        "/api/professor/diario-de-classe/professores"
      );
      if (!alive) return;

      if (!r.ok) {
        if (r.status === 403) {
          setIsAdmin(false);
          setProfessores([]);
          setProfessorFiltro(null);
          return;
        }
        return;
      }

      setIsAdmin(true);
      setProfessores(Array.isArray(r.data.professores) ? r.data.professores : []);
    })().catch(() => {
      if (!alive) return;
    });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setSalvoOk(false);
      setAula(null);
      setPlano(null);
      setPlanoInstancia(null);
      setPlanoErro("");
      setPlanoLoading(false);
      setNotasPosAula("");
      setLinhas([]);
      setAlunos([]);
      setPresencasRegistradas(0);
      baselineRef.current = null;

      if (!turmaId) return;

      setStatus("PENDENTE");
      setErroMsg("");

      const alunosRes = await fetchJson<{ ok: boolean; alunos: Aluno[] }>(
        `/api/professor/diario-de-classe/turmas/${turmaId}/alunos`
      );
      if (!alive) return;

      if (!alunosRes.ok) {
        setStatus("ERRO");
        setErroMsg(alunosRes.message);
        return;
      }

      const listaAlunos = Array.isArray(alunosRes.data.alunos)
        ? alunosRes.data.alunos
        : [];
      setAlunos(listaAlunos);

      const abrirRes = await fetchJson<{ ok: boolean; aula: Aula }>(
        "/api/professor/diario-de-classe/aulas/abrir",
        {
          method: "POST",
          body: JSON.stringify({ turmaId, dataAula }),
        }
      );

      if (!alive) return;

      if (!abrirRes.ok) {
        setStatus("ERRO");
        setErroMsg(abrirRes.message);
        return;
      }

      setAula(abrirRes.data.aula);
      setFecharErro("");
      setFecharPendentes([]);

      const presRes = await fetchJson<{ ok: boolean; presencas: PresencaDb[] }>(
        `/api/professor/diario-de-classe/aulas/${abrirRes.data.aula.id}/presencas`
      );

      if (!alive) return;

      if (!presRes.ok) {
        setStatus("ERRO");
        setErroMsg(presRes.message);
        return;
      }

      const presencas = Array.isArray(presRes.data.presencas)
        ? presRes.data.presencas
        : [];
      setPresencasRegistradas(presencas.length);
      const mapPres = new Map<number, PresencaDb>();
      for (const p of presencas) mapPres.set(p.aluno_pessoa_id, p);

      const linhasMontadas = listaAlunos.map((a) =>
        mapPresencaToLinha(a, mapPres.get(a.aluno_pessoa_id))
      );

      setLinhas(linhasMontadas);
      baselineRef.current = serializeLinhas(linhasMontadas);
      setStatus("PRONTO");
    })().catch((e: unknown) => {
      if (!alive) return;
      setStatus("ERRO");
      setErroMsg(e instanceof Error ? e.message : "Erro ao carregar diario.");
    });

    return () => {
      alive = false;
    };
  }, [turmaId, dataAula]);

  useEffect(() => {
    if (!aula) {
      setPlano(null);
      setPlanoInstancia(null);
      setPlanoErro("");
      setNotasPosAula("");
      return;
    }

    void carregarPlanoSessao();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aula?.id]);

  function setBaseStatus(alunoId: number, novo: PresencaBaseStatus) {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.aluno_pessoa_id !== alunoId) return l;
        if (novo === "PRESENTE") {
          return {
            ...l,
            base_status: "PRESENTE",
            justificativa_ativa: false,
            justificativa_texto: "",
          };
        }
        return {
          ...l,
          base_status: "FALTA",
          atraso_ativo: false,
          minutos_atraso: null,
        };
      })
    );
    setSalvoOk(false);
  }

  function toggleAtraso(alunoId: number) {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.aluno_pessoa_id !== alunoId) return l;
        if (l.base_status !== "PRESENTE") return l;
        const ativo = !l.atraso_ativo;
        return {
          ...l,
          atraso_ativo: ativo,
          minutos_atraso: ativo ? l.minutos_atraso ?? 1 : null,
        };
      })
    );
    setSalvoOk(false);
  }

  function toggleJustificativa(alunoId: number) {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.aluno_pessoa_id !== alunoId) return l;
        if (l.base_status !== "FALTA") return l;
        const ativo = !l.justificativa_ativa;
        return {
          ...l,
          justificativa_ativa: ativo,
          justificativa_texto: ativo ? l.justificativa_texto : "",
        };
      })
    );
    setSalvoOk(false);
  }

  function setMinutosAtraso(alunoId: number, mins: number) {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.aluno_pessoa_id !== alunoId) return l;
        if (l.base_status !== "PRESENTE") return l;
        return { ...l, minutos_atraso: Math.max(1, mins) };
      })
    );
    setSalvoOk(false);
  }

  function setJustificativaTexto(alunoId: number, texto: string) {
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.aluno_pessoa_id !== alunoId) return l;
        if (l.base_status !== "FALTA") return l;
        return { ...l, justificativa_texto: texto };
      })
    );
    setSalvoOk(false);
  }

  function limparLinha(alunoId: number) {
    setLinhas((prev) =>
      prev.map((l) =>
        l.aluno_pessoa_id === alunoId
          ? {
              ...l,
              base_status: "PRESENTE",
              atraso_ativo: false,
              minutos_atraso: null,
              justificativa_ativa: false,
              justificativa_texto: "",
            }
          : l
      )
    );
    setSalvoOk(false);
  }

  function abrirAnotacao(linha: LinhaChamada) {
    const observadoEm = defaultObservadoEm(dataAula, aula?.hora_inicio ?? null);
    setAnotacaoAluno(linha);
    setAnotacaoTitulo("");
    setAnotacaoDescricao("");
    setAnotacaoDataHora(observadoEm);
    setAnotacaoErro("");
    setAnotacaoOpen(true);
  }

  function fecharAnotacao() {
    setAnotacaoOpen(false);
    setAnotacaoAluno(null);
    setAnotacaoTitulo("");
    setAnotacaoDescricao("");
    setAnotacaoDataHora("");
    setAnotacaoErro("");
  }

  async function salvarAnotacao() {
    if (!anotacaoAluno) return;
    if (!anotacaoDescricao.trim()) {
      setAnotacaoErro("Descricao obrigatoria.");
      return;
    }

    if (Number.isNaN(Date.parse(anotacaoDataHora))) {
      setAnotacaoErro("Data/hora invalida.");
      return;
    }

    setAnotacaoSalvando(true);
    setAnotacaoErro("");

    const payload = {
      observado_em: new Date(anotacaoDataHora).toISOString(),
      titulo: anotacaoTitulo.trim() ? anotacaoTitulo.trim() : null,
      descricao: anotacaoDescricao.trim(),
      professor_pessoa_id: null,
    };

    const r = await fetchJson<{ item: unknown }>(
      `/api/pessoas/${anotacaoAluno.aluno_pessoa_id}/observacoes-pedagogicas`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    if (!r.ok) {
      setAnotacaoErro(r.message);
      setAnotacaoSalvando(false);
      return;
    }

    setAnotacaoSalvando(false);
    fecharAnotacao();
  }

  async function salvarFrequencia() {
    if (!aula) return;
    if (salvando) return;

    const faltaSemMotivo = linhas.find(
      (l) => l.base_status === "FALTA" && l.justificativa_ativa && !l.justificativa_texto.trim()
    );
    if (faltaSemMotivo) {
      setStatus("ERRO");
      setErroMsg(`Justificativa obrigatoria para ${faltaSemMotivo.nome}.`);
      return;
    }

    const atrasoSemMinutos = linhas.find(
      (l) =>
        l.base_status === "PRESENTE" &&
        l.atraso_ativo &&
        (!l.minutos_atraso || l.minutos_atraso < 1)
    );
    if (atrasoSemMinutos) {
      setStatus("ERRO");
      setErroMsg(`Minutos de atraso obrigatorios para ${atrasoSemMinutos.nome}.`);
      return;
    }

    setSalvando(true);
    setErroMsg("");
    setFecharErro("");
    setFecharPendentes([]);
    setStatus("PENDENTE");

    try {
      const itens: ItemPresenca[] = linhas.map((l) => {
        if (l.base_status === "FALTA") {
          if (l.justificativa_ativa) {
            return {
              alunoPessoaId: l.aluno_pessoa_id,
              status: "JUSTIFICADA",
              observacao: l.justificativa_texto.trim(),
            };
          }
          return {
            alunoPessoaId: l.aluno_pessoa_id,
            status: "FALTA",
          };
        }

        if (l.atraso_ativo) {
          return {
            alunoPessoaId: l.aluno_pessoa_id,
            status: "ATRASO",
            minutosAtraso: l.minutos_atraso ?? 1,
          };
        }

        return {
          alunoPessoaId: l.aluno_pessoa_id,
          status: "PRESENTE",
        };
      });

      const r = await fetchJson<{ ok: boolean; presencas: PresencaDb[] }>(
        `/api/professor/diario-de-classe/aulas/${aula.id}/presencas`,
        {
          method: "PUT",
          body: JSON.stringify({ itens }),
        }
      );

      if (!r.ok) {
        setStatus("ERRO");
        setErroMsg(r.message);
        return;
      }

      const presencas = Array.isArray(r.data.presencas) ? r.data.presencas : [];
      const mapPres = new Map<number, PresencaDb>();
      for (const p of presencas) mapPres.set(p.aluno_pessoa_id, p);

      const reconciliado = linhas.map((l) => {
        const p = mapPres.get(l.aluno_pessoa_id);
        return p ? mapPresencaToLinha({ aluno_pessoa_id: l.aluno_pessoa_id, nome: l.nome }, p) : l;
      });

      setLinhas(reconciliado);
      baselineRef.current = serializeLinhas(reconciliado);
      setSalvoOk(true);
      setPresencasRegistradas(presencas.length);
      setStatus("PRONTO");
    } catch (e: unknown) {
      setStatus("ERRO");
      setErroMsg(e instanceof Error ? e.message : "Erro ao salvar frequencia.");
    } finally {
      setSalvando(false);
    }
  }

  async function fecharChamada() {
    if (!aula) return;
    if (fechando) return;
    if (dirty) {
      setFecharErro("Salve as alteracoes antes de fechar a chamada.");
      return;
    }

    setFechando(true);
    setFecharErro("");
    setFecharPendentes([]);

    const r = await fetchJson<{ ok: boolean; aula: Aula; pendentes?: number[] }>(
      `/api/professor/diario-de-classe/aulas/${aula.id}/fechar`,
      { method: "POST" }
    );

    if (!r.ok) {
      if (r.status === 422) {
        const raw = r.data as { pendentes?: unknown } | undefined;
        const pendentes = Array.isArray(raw?.pendentes) ? raw?.pendentes : [];
        setFecharPendentes(pendentes);
        setFecharErro(r.message || "Ha alunos pendentes na chamada.");
      } else {
        setFecharErro(r.message || "Erro ao fechar chamada.");
      }
      setFechando(false);
      return;
    }

    setAula(r.data.aula);
    setFechando(false);
  }

  async function carregarPlanoSessao() {
    if (!aula) {
      setPlano(null);
      setPlanoInstancia(null);
      setPlanoErro("");
      setPlanoLoading(false);
      setNotasPosAula("");
      return;
    }

    setPlanoLoading(true);
    setPlanoErro("");

    const r = await fetchJson<{
      ok: boolean;
      aula: Aula;
      plano: PlanoAula | null;
      instancia: PlanoInstancia | null;
    }>(`/api/professor/diario-de-classe/aulas/${aula.id}/plano`);

    if (!r.ok) {
      setPlanoErro(r.message);
      setPlano(null);
      setPlanoInstancia(null);
      setPlanoLoading(false);
      return;
    }

    setPlano(r.data.plano ?? null);
    setPlanoInstancia(r.data.instancia ?? null);
    setNotasPosAula(r.data.instancia?.notas_pos_aula ?? "");
    setPlanoLoading(false);
  }

  async function aplicarPlanoSessao() {
    if (!aula || planoAplicando) return;
    setPlanoAplicando(true);
    setPlanoErro("");

    const r = await fetchJson<{ ok: boolean; instancia: PlanoInstancia }>(
      `/api/professor/diario-de-classe/aulas/${aula.id}/plano/aplicar`,
      { method: "POST" }
    );

    if (!r.ok) {
      setPlanoErro(r.message);
      setPlanoAplicando(false);
      return;
    }

    setPlanoInstancia(r.data.instancia);
    setPlanoAplicando(false);
  }

  async function concluirPlanoSessao() {
    if (!aula || planoConcluindo) return;

    if (!aula.fechada_em) {
      setPlanoErro("Feche a chamada antes de concluir o plano.");
      return;
    }

    setPlanoConcluindo(true);
    setPlanoErro("");

    const r = await fetchJson<{ ok: boolean; instancia: PlanoInstancia }>(
      `/api/professor/diario-de-classe/aulas/${aula.id}/plano/concluir`,
      {
        method: "POST",
        body: JSON.stringify({ notas_pos_aula: notasPosAula.trim() || null }),
      }
    );

    if (!r.ok) {
      setPlanoErro(r.message);
      setPlanoConcluindo(false);
      return;
    }

    setPlanoInstancia(r.data.instancia);
    setPlanoConcluindo(false);
  }

  const turmaSelecionada = useMemo(
    () => turmas.find((t) => t.turma_id === turmaId) ?? null,
    [turmas, turmaId]
  );

  const aulaFechada = Boolean(aula?.fechada_em);
  const statusLabel = status === "ERRO" ? "Erro" : aulaFechada ? "Chamada FECHADA" : "Chamada PENDENTE";
  const statusSubtitle = aulaFechada
    ? `Fechada em ${aula?.fechada_em ? new Date(aula.fechada_em).toLocaleString() : "--"}`
    : "A chamada precisa ser fechada para validar presencas.";
  const dataSemana = weekdayLabelFromISO(dataAula);
  const pendentesCount = Math.max(0, alunos.length - presencasRegistradas);
  const blocosOrdenados = useMemo(() => {
    const blocos = plano?.plano_aula_blocos ?? [];
    return [...blocos].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  }, [plano]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs tracking-widest text-muted-foreground">ACADEMICO</div>
            <h1 className="text-2xl font-semibold">Diario de classe</h1>
            <p className="text-sm text-muted-foreground">
              Selecione a turma e registre a aula do dia: frequencia, plano, observacoes e avaliacoes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/escola/academico/turmas"
              className="rounded-full border px-4 py-2 text-sm hover:bg-muted"
            >
              Turmas
            </Link>
            <Link
              href="/escola/academico/turmas/grade"
              className="rounded-full border px-4 py-2 text-sm hover:bg-muted"
            >
              Grade
            </Link>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-4">
          <Card title="Status" value={statusLabel} subtitle={statusSubtitle} />
          <Card title="Professor" value="-" subtitle="fase API (futuro: auto do usuario)" />
          <TurmaPanel
            turma={turmaSelecionada}
            turmaId={turmaId}
            alunosTotal={alunos.length}
            presencasRegistradas={presencasRegistradas}
            pendentesCount={pendentesCount}
            aulaFechada={aulaFechada}
          />
          <Card title="Data" value={dataAula} subtitle={`aula do dia • ${dataSemana}`} />
        </section>
      </header>

      <section className="rounded-2xl border bg-card p-4">
        <div className="mb-2">
          <div className="text-xs tracking-widest text-muted-foreground">PENDENCIAS DE HOJE</div>
          <div className="text-sm font-medium">Agenda rapida</div>
          <div className="text-xs text-muted-foreground">
            Abra a chamada da turma e registre a frequencia antes de fechar.
          </div>
        </div>

        {status === "ERRO" ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <div className="font-medium">Falha ao carregar turmas</div>
            <div className="text-muted-foreground">{erroMsg || "Erro inesperado."}</div>
          </div>
        ) : turmas.length === 0 ? (
          <div className="text-sm text-muted-foreground">Nenhuma turma disponivel.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {turmas.map((t) => {
              const diasLabel = Array.isArray(t.dias_semana) ? t.dias_semana.join(", ") : "--";
              const horaInicio = normalizeHora(t.hora_inicio);
              const horaFim = normalizeHora(t.hora_fim);
              const horario = horaInicio && horaFim ? `${horaInicio} - ${horaFim}` : horaInicio ?? horaFim ?? "--";
              return (
                <div key={t.turma_id} className="rounded-xl border bg-background p-3">
                  <div className="text-sm font-medium">
                    {t.nome ?? t.titulo ?? `Turma ${t.turma_id}`}
                  </div>
                  <div className="text-xs text-muted-foreground">Dias: {diasLabel}</div>
                  <div className="text-xs text-muted-foreground">Horario: {horario}</div>
                  <button
                    type="button"
                    className="mt-2 rounded-full border px-3 py-1 text-xs hover:bg-muted"
                    onClick={() => {
                      setTurmaId(t.turma_id);
                    }}
                  >
                    Abrir chamada
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <div className="mb-2">
          <div className="text-xs tracking-widest text-muted-foreground">SELECAO</div>
          <div className="text-sm font-medium">Contexto da aula</div>
          <div className="text-xs text-muted-foreground">
            Selecione a turma e a data. Depois, registre a frequencia.
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Turma</span>
            <select
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              value={turmaId ?? ""}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                setTurmaId(v);
              }}
            >
              <option value="">Selecione...</option>
              {turmas.map((t) => (
                <option key={t.turma_id} value={t.turma_id}>
                  {(t.nome ?? t.titulo ?? `Turma ${t.turma_id}`) as string}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Data</span>
            <input
              className="rounded-lg border bg-background px-3 py-2 text-sm"
              type="date"
              value={dataAula}
              onChange={(e) => setDataAula(e.target.value)}
            />
          </div>

          {isAdmin ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Professor</span>
              <select
                className="rounded-lg border bg-background px-3 py-2 text-sm"
                value={professorFiltro ?? ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setProfessorFiltro(v);
                }}
              >
                <option value="">Todos</option>
                {professores.map((p) => (
                  <option key={p.colaborador_id} value={p.colaborador_id}>
                    {p.nome ?? `Colaborador ${p.colaborador_id}`}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Aula</span>
            <div className="rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
              {aula
                ? `Aula #${aula.id} (turma ${aula.turma_id})`
                : turmaId
                  ? "Abrindo aula..."
                  : "Selecione uma turma"}
            </div>
          </div>
        </div>

        {status === "ERRO" && (
          <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <div className="font-medium">Falha</div>
            <div className="text-muted-foreground">{erroMsg || "Erro inesperado."}</div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-card">
        <div className="flex flex-wrap gap-2 border-b p-3">
          <BotaoAba ativo={aba === "frequencia"} onClick={() => setAba("frequencia")}>
            Frequencia
          </BotaoAba>
          <BotaoAba ativo={aba === "plano"} onClick={() => setAba("plano")}>
            Plano de aula
          </BotaoAba>
          <BotaoAba ativo={aba === "conteudo"} onClick={() => setAba("conteudo")}>
            Conteudo do curso
          </BotaoAba>
          <BotaoAba ativo={aba === "observacoes"} onClick={() => setAba("observacoes")}>
            Observacoes
          </BotaoAba>
          <BotaoAba ativo={aba === "avaliacoes"} onClick={() => setAba("avaliacoes")}>
            Avaliacoes
          </BotaoAba>
        </div>

        <div className="p-4">
          <h2 className="text-lg font-semibold">{tituloAba}</h2>

          {aba === "frequencia" ? (
            <div className="mt-3 flex flex-col gap-3">
              <div className="rounded-xl border p-4">
                <div className="text-sm font-medium">Chamada</div>
                <div className="text-xs text-muted-foreground">
                  Registre as presencas e feche a chamada para validar.
                </div>

                {!aulaFechada ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Status pendente: a chamada so sera valida apos o fechamento.
                  </div>
                ) : (
                  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    Chamada fechada. Fechada por: {aula?.fechada_por ?? "nao informado"}.
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-2">
                  {!turmaId ? (
                    <div className="text-sm text-muted-foreground">
                      Selecione uma turma para carregar a chamada.
                    </div>
                  ) : alunos.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Nenhum aluno encontrado para esta turma.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border">
                      <div className="grid grid-cols-12 gap-2 border-b bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                        <div className="col-span-4">Aluno</div>
                        <div className="col-span-3">Presenca</div>
                        <div className="col-span-3">Marcadores</div>
                        <div className="col-span-2 text-right">Acoes</div>
                      </div>

                      {linhas.map((l) => (
                        <div key={l.aluno_pessoa_id} className="border-b px-3 py-4">
                          <div className="grid grid-cols-12 gap-3 items-start">
                            <div className="col-span-12 md:col-span-4">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-medium">{l.nome}</div>
                                <span
                                  className={[
                                    "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
                                    l.base_status === "PRESENTE"
                                      ? "bg-emerald-600 text-white"
                                      : "bg-rose-600 text-white",
                                  ].join(" ")}
                                >
                                  {l.base_status}
                                </span>
                              </div>
                            </div>

                            <div className="col-span-12 md:col-span-3 flex flex-wrap gap-2">
                              <StatusMainButton
                                ativo={l.base_status === "PRESENTE"}
                                tone="present"
                                onClick={() => setBaseStatus(l.aluno_pessoa_id, "PRESENTE")}
                              >
                                Presente
                              </StatusMainButton>
                              <StatusMainButton
                                ativo={l.base_status === "FALTA"}
                                tone="absent"
                                onClick={() => setBaseStatus(l.aluno_pessoa_id, "FALTA")}
                              >
                                Falta
                              </StatusMainButton>
                            </div>

                            <div className="col-span-12 md:col-span-3">
                              <div className="flex flex-wrap gap-2">
                                <ToggleChip
                                  ativo={l.atraso_ativo}
                                  disabled={l.base_status !== "PRESENTE"}
                                  onClick={() => toggleAtraso(l.aluno_pessoa_id)}
                                >
                                  Atraso
                                </ToggleChip>
                                <ToggleChip
                                  ativo={l.justificativa_ativa}
                                  disabled={l.base_status !== "FALTA"}
                                  onClick={() => toggleJustificativa(l.aluno_pessoa_id)}
                                >
                                  Justificar
                                </ToggleChip>
                              </div>

                              {l.atraso_ativo ? (
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Minutos</span>
                                  <input
                                    type="number"
                                    min={1}
                                    className="w-24 rounded-lg border bg-background px-2 py-1 text-sm"
                                    value={l.minutos_atraso ?? 1}
                                    onChange={(e) =>
                                      setMinutosAtraso(l.aluno_pessoa_id, Number(e.target.value))
                                    }
                                  />
                                </div>
                              ) : null}

                              {l.justificativa_ativa ? (
                                <div className="mt-2">
                                  <input
                                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                                    placeholder="Motivo obrigatorio"
                                    value={l.justificativa_texto}
                                    onChange={(e) =>
                                      setJustificativaTexto(l.aluno_pessoa_id, e.target.value)
                                    }
                                  />
                                </div>
                              ) : null}
                            </div>

                            <div className="col-span-12 md:col-span-2 flex justify-end gap-2">
                              <button
                                type="button"
                                className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                                onClick={() => abrirAnotacao(l)}
                              >
                                Anotacao
                              </button>
                              <button
                                type="button"
                                className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                                onClick={() => limparLinha(l.aluno_pessoa_id)}
                              >
                                Limpar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    {dirty
                      ? "Alteracoes pendentes."
                      : salvoOk
                        ? "Presencas salvas. Falta fechar a chamada."
                        : "Sem alteracoes."}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full border px-5 py-2 text-sm font-medium disabled:opacity-50"
                      disabled={!aula || !turmaId || alunos.length === 0 || fechando || aulaFechada || dirty}
                      onClick={() => void fecharChamada()}
                    >
                      {fechando ? "Fechando..." : aulaFechada ? "Chamada fechada" : "Fechar chamada"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      disabled={!aula || !turmaId || alunos.length === 0 || salvando || !dirty || aulaFechada}
                      onClick={() => void salvarFrequencia()}
                    >
                      {salvando ? "Salvando..." : "Salvar frequencia"}
                    </button>
                  </div>
                </div>

                {fecharErro ? (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-sm text-rose-700">
                    {fecharErro}
                    {fecharPendentes.length > 0 ? (
                      <div className="mt-2 text-xs text-rose-700">
                        Pendentes:{" "}
                        {fecharPendentes
                          .map((id) => alunos.find((a) => a.aluno_pessoa_id === id)?.nome ?? `ID ${id}`)
                          .join(", ")}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {aba === "plano" ? (
            <div className="mt-3 flex flex-col gap-3">
              <div className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-sm font-medium">Plano da sessao</div>
                    <div className="text-xs text-muted-foreground">
                      {aula
                        ? `Aula #${aula.aula_numero ?? "--"} • ${dataAula}`
                        : "Selecione uma turma para carregar o plano."}
                    </div>
                    {planoInstancia ? (
                      <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {planoInstancia.status === "CONCLUIDO"
                          ? "Plano concluido"
                          : "Plano em execucao"}
                      </div>
                    ) : plano ? (
                      <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                        Plano nao aplicado
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-full border px-5 py-2 text-sm font-medium disabled:opacity-50"
                      disabled={!plano || planoAplicando || Boolean(planoInstancia)}
                      onClick={() => void aplicarPlanoSessao()}
                    >
                      {planoAplicando ? "Aplicando..." : "Aplicar plano"}
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      disabled={
                        !plano ||
                        !planoInstancia ||
                        planoInstancia.status === "CONCLUIDO" ||
                        planoConcluindo ||
                        !aulaFechada
                      }
                      onClick={() => void concluirPlanoSessao()}
                    >
                      {planoConcluindo ? "Concluindo..." : "Concluir plano"}
                    </button>
                  </div>
                </div>

                {planoErro ? (
                  <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-sm text-rose-700">
                    {planoErro}
                  </div>
                ) : null}

                {planoLoading ? (
                  <div className="mt-3 text-sm text-muted-foreground">Carregando plano...</div>
                ) : null}

                {!planoLoading && aula && !plano ? (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    Nenhum plano encontrado para esta aula.
                  </div>
                ) : null}
              </div>

              {plano ? (
                <div className="grid gap-3">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="text-xs font-semibold text-muted-foreground">
                      Intencao pedagogica
                    </div>
                    <div className="mt-1 text-sm">
                      {plano.intencao_pedagogica?.trim()
                        ? plano.intencao_pedagogica
                        : "Nao informado."}
                    </div>
                    <div className="mt-3 text-xs font-semibold text-muted-foreground">
                      Observacoes gerais
                    </div>
                    <div className="mt-1 text-sm">
                      {plano.observacoes_gerais?.trim()
                        ? plano.observacoes_gerais
                        : "Nenhuma observacao."}
                    </div>
                    {plano.playlist_url ? (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Playlist:{" "}
                        <a
                          className="text-sky-700 underline"
                          href={plano.playlist_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {plano.playlist_url}
                        </a>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="text-sm font-medium">Blocos do plano</div>
                    {blocosOrdenados.length === 0 ? (
                      <div className="mt-3 text-sm text-muted-foreground">
                        Nenhum bloco cadastrado.
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-col gap-3">
                        {blocosOrdenados.map((bloco) => {
                          const subblocos = [...(bloco.plano_aula_subblocos ?? [])].sort(
                            (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
                          );
                          const minutos = [bloco.minutos_min, bloco.minutos_ideal, bloco.minutos_max]
                            .filter((v): v is number => typeof v === "number");
                          const minutosLabel = minutos.length ? minutos.join(" / ") + " min" : null;

                          return (
                            <div key={bloco.id} className="rounded-xl border bg-card p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm font-semibold">
                                  {bloco.ordem}. {bloco.titulo}
                                </div>
                                {minutosLabel ? (
                                  <span className="text-xs text-muted-foreground">{minutosLabel}</span>
                                ) : null}
                              </div>
                              {bloco.objetivo ? (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Objetivo: {bloco.objetivo}
                                </div>
                              ) : null}

                              {subblocos.length ? (
                                <div className="mt-3 grid gap-2">
                                  {subblocos.map((sb) => {
                                    const sbMin = [sb.minutos_min, sb.minutos_ideal, sb.minutos_max]
                                      .filter((v): v is number => typeof v === "number");
                                    const sbLabel = sbMin.length ? sbMin.join(" / ") + " min" : null;
                                    return (
                                      <div
                                        key={sb.id}
                                        className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm"
                                      >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div className="font-medium">
                                            {sb.ordem}. {sb.titulo}
                                          </div>
                                          {sbLabel ? (
                                            <span className="text-xs text-muted-foreground">
                                              {sbLabel}
                                            </span>
                                          ) : null}
                                        </div>
                                        {sb.instrucoes ? (
                                          <div className="mt-1 text-xs text-muted-foreground">
                                            {sb.instrucoes}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Sem sub-blocos.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="text-sm font-medium">Notas pos-aula</div>
                    <textarea
                      className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      rows={4}
                      value={notasPosAula}
                      onChange={(e) => setNotasPosAula(e.target.value)}
                      disabled={planoInstancia?.status === "CONCLUIDO"}
                      placeholder="Registre observacoes da execucao."
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {aba !== "frequencia" && aba !== "plano" ? (
            <div className="mt-3 rounded-xl border p-4">
              <p className="text-sm text-muted-foreground">
                Em construcao. Este item faz parte do Diario de classe do professor.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {anotacaoOpen && anotacaoAluno ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Anotacao pedagogica</div>
                <div className="text-lg font-semibold">{anotacaoAluno.nome}</div>
              </div>
              <button className="rounded-lg border px-3 py-2 text-sm" onClick={fecharAnotacao}>
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Titulo (opcional)</div>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  value={anotacaoTitulo}
                  onChange={(e) => setAnotacaoTitulo(e.target.value)}
                />
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Descricao</div>
                <textarea
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  rows={4}
                  value={anotacaoDescricao}
                  onChange={(e) => setAnotacaoDescricao(e.target.value)}
                />
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Data/hora</div>
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                  type="datetime-local"
                  value={anotacaoDataHora}
                  onChange={(e) => setAnotacaoDataHora(e.target.value)}
                />
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Professor</div>
                <div className="mt-1 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
                  auto do usuario
                </div>
              </div>
            </div>

            {anotacaoErro ? (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50/70 p-3 text-sm text-rose-700">
                {anotacaoErro}
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="rounded-lg border px-4 py-2 text-sm" onClick={fecharAnotacao}>
                Cancelar
              </button>
              <button
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
                onClick={() => void salvarAnotacao()}
                disabled={anotacaoSalvando}
              >
                {anotacaoSalvando ? "Salvando..." : "Salvar anotacao"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Card(props: { title: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs tracking-widest text-muted-foreground">{props.title.toUpperCase()}</div>
      <div className="mt-1 text-lg font-semibold">{props.value}</div>
      {props.subtitle ? <div className="text-xs text-muted-foreground">{props.subtitle}</div> : null}
    </div>
  );
}

function TurmaPanel(props: {
  turma: Turma | null;
  turmaId: number | null;
  alunosTotal: number;
  presencasRegistradas: number;
  pendentesCount: number;
  aulaFechada: boolean;
}) {
  const dias = props.turma?.dias_semana;
  const diasLabel = Array.isArray(dias) && dias.length > 0 ? dias.join(", ") : "--";
  const horaInicio = normalizeHora(props.turma?.hora_inicio);
  const horaFim = normalizeHora(props.turma?.hora_fim);
  const horario = horaInicio && horaFim ? `${horaInicio} - ${horaFim}` : horaInicio ?? horaFim ?? "--";

  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="text-xs tracking-widest text-muted-foreground">TURMA</div>
      <div className="mt-1 text-lg font-semibold">
        {props.turma?.nome ?? props.turma?.titulo ?? (props.turmaId ? `Turma ${props.turmaId}` : "-")}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Dias: {diasLabel} • Horario: {horario}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Total alunos: {props.alunosTotal}</span>
        <span>Marcados: {props.presencasRegistradas}</span>
        <span>Pendentes: {props.pendentesCount}</span>
        <span>Status: {props.aulaFechada ? "FECHADA" : "PENDENTE"}</span>
      </div>
    </div>
  );
}

function BotaoAba(props: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  const base = "rounded-full px-4 py-2 text-sm transition border";
  const ativo = "bg-primary text-primary-foreground border-primary";
  const inativo = "bg-background text-foreground hover:bg-muted border-border";
  return (
    <button type="button" className={`${base} ${props.ativo ? ativo : inativo}`} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

function StatusMainButton(props: {
  ativo: boolean;
  tone: "present" | "absent";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base = "rounded-full border px-4 py-2 text-sm transition";
  const ativo =
    props.tone === "present"
      ? "bg-emerald-600 text-white border-emerald-600"
      : "bg-rose-600 text-white border-rose-600";
  const inativo = "bg-background hover:bg-muted border-border";
  return (
    <button type="button" className={`${base} ${props.ativo ? ativo : inativo}`} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

function ToggleChip(props: {
  ativo: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const base = "rounded-full border px-3 py-1 text-xs transition";
  const ativo = "bg-slate-900 text-white border-slate-900";
  const inativo = "bg-background hover:bg-muted border-border";
  const disabled = "opacity-50 cursor-not-allowed";
  return (
    <button
      type="button"
      className={`${base} ${props.ativo ? ativo : inativo} ${props.disabled ? disabled : ""}`}
      onClick={() => {
        if (props.disabled) return;
        props.onClick();
      }}
    >
      {props.children}
    </button>
  );
}
