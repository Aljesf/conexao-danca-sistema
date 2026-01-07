
"use client";

import { useEffect, useMemo, useState } from "react";
import FormCard from "@/components/FormCard";
import FormInput from "@/components/FormInput";
import PrimaryButton from "@/components/PrimaryButton";

type Curso = {
  id: number;
  nome: string;
  metodologia: string;
  descricao: string;
  ativo: boolean;
};

type CursoApi = {
  id: number;
  nome: string;
  metodologia: string | null;
  observacoes: string | null;
  situacao: string | null;
};

type Nivel = {
  id: number;
  cursoId: number;
  nome: string;
  idadeMinima: number | null;
  idadeMaxima: number | null;
  faixaEtariaSugerida?: string | null;
  observacoes?: string;
  prerequisito?: number | null;
};

type Conteudo = {
  id: number;
  nivelId: number;
  nome: string;
  ordem: number;
  obrigatorio: boolean;
  descricao?: string;
  categoria?: string;
};

type Habilidade = {
  id: number;
  conteudoId: number;
  nome: string;
  tipo: string;
  descricao?: string;
  criterio?: string;
  ordem?: number;
};

const seedsNiveis: Nivel[] = [
  { id: 1, cursoId: 1, nome: "Nivel 1", idadeMinima: 6, idadeMaxima: 8, faixaEtariaSugerida: "6-8 anos" },
  { id: 2, cursoId: 1, nome: "Nivel 2", idadeMinima: 8, idadeMaxima: 10, faixaEtariaSugerida: "8-10 anos" },
  { id: 3, cursoId: 2, nome: "Iniciante", idadeMinima: null, idadeMaxima: null, faixaEtariaSugerida: "Livre" },
];

const seedsConteudos: Conteudo[] = [
  { id: 1, nivelId: 1, nome: "Plies basicos", ordem: 1, obrigatorio: true, descricao: "Fundamentos" },
  { id: 2, nivelId: 1, nome: "Port de bras", ordem: 2, obrigatorio: false, descricao: "Alongamento e fluidez" },
  { id: 3, nivelId: 3, nome: "Isolamentos", ordem: 1, obrigatorio: true, descricao: "Coordenacao" },
];

const seedsHabilidades: Habilidade[] = [
  { id: 1, conteudoId: 1, nome: "Plie em 1a", tipo: "Tecnica", ordem: 1, descricao: "Alinhamento", criterio: "Postura" },
  { id: 2, conteudoId: 1, nome: "Plie em 2a", tipo: "Tecnica", ordem: 2, descricao: "Amplitude", criterio: "Controle" },
  { id: 3, conteudoId: 3, nome: "Isolamento de cabeca", tipo: "Tecnica", ordem: 1, descricao: "Mobilidade", criterio: "Precisao" },
];

function formatFaixa(min: number | null, max: number | null) {
  if (min != null && max != null) return `${min}-${max} anos`;
  if (min != null) return `A partir de ${min} anos`;
  if (max != null) return `Ate ${max} anos`;
  return "";
}

function nextId<T extends { id: number }>(items: T[]) {
  return items.length ? Math.max(...items.map((i) => i.id)) + 1 : 1;
}

export default function CursosPage() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [niveis, setNiveis] = useState<Nivel[]>(seedsNiveis);
  const [conteudos, setConteudos] = useState<Conteudo[]>(seedsConteudos);
  const [habilidades, setHabilidades] = useState<Habilidade[]>(seedsHabilidades);

  const [cursosLoading, setCursosLoading] = useState(true);
  const [cursosErro, setCursosErro] = useState<string | null>(null);
  const [cursosMsg, setCursosMsg] = useState<string | null>(null);

  const [filtro, setFiltro] = useState("");
  const [editingCurso, setEditingCurso] = useState<Curso | null>(null);
  const [showCursoForm, setShowCursoForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [cursoForm, setCursoForm] = useState({ nome: "", metodologia: "", descricao: "", ativo: true });

  const [nivelFormOpenFor, setNivelFormOpenFor] = useState<number | null>(null);
  const [nivelEditingId, setNivelEditingId] = useState<number | null>(null);
  const [nivelForm, setNivelForm] = useState({
    nome: "",
    idadeMinima: "" as number | "" | null,
    idadeMaxima: "" as number | "" | null,
    observacoes: "",
    prerequisito: null as number | null,
  });

  const [conteudoFormOpenFor, setConteudoFormOpenFor] = useState<number | null>(null);
  const [conteudoEditingId, setConteudoEditingId] = useState<number | null>(null);
  const [conteudoForm, setConteudoForm] = useState({ nome: "", ordem: 1, obrigatorio: true, descricao: "", categoria: "" });

  const [habilidadeFormOpenFor, setHabilidadeFormOpenFor] = useState<number | null>(null);
  const [habilidadeEditingId, setHabilidadeEditingId] = useState<number | null>(null);
  const [habilidadeForm, setHabilidadeForm] = useState({ nome: "", tipo: "", descricao: "", criterio: "", ordem: 1 });

  const filtradas = useMemo(() => {
    const q = filtro.toLowerCase().trim();
    if (!q) return cursos;
    return cursos.filter((c) => [c.nome, c.metodologia, c.descricao].some((v) => (v || "").toLowerCase().includes(q)));
  }, [cursos, filtro]);

  function mapCurso(row: CursoApi): Curso {
    return {
      id: row.id,
      nome: row.nome,
      metodologia: row.metodologia ?? "",
      descricao: row.observacoes ?? "",
      ativo: (row.situacao ?? "Ativo") === "Ativo",
    };
  }

  async function carregarCursos() {
    setCursosLoading(true);
    setCursosErro(null);
    try {
      const res = await fetch("/api/escola/academico/cursos");
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; data?: CursoApi[]; error?: string; message?: string }
        | null;
      if (!res.ok || !json?.ok) {
        const msg = json?.message ?? json?.error ?? "Falha ao carregar cursos";
        throw new Error(`${res.status} - ${msg}`);
      }
      const lista = Array.isArray(json?.data) ? json.data : [];
      setCursos(lista.map(mapCurso));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao carregar cursos";
      setCursosErro(msg);
    } finally {
      setCursosLoading(false);
    }
  }

  useEffect(() => {
    void carregarCursos();
  }, []);

  function resetCursoForm() {
    setCursoForm({ nome: "", metodologia: "", descricao: "", ativo: true });
    setEditingCurso(null);
    setShowCursoForm(false);
  }
  async function salvarCurso(e: React.FormEvent) {
    e.preventDefault();
    if (!cursoForm.nome.trim()) {
      setCursosErro("Nome do curso e obrigatorio.");
      return;
    }

    setCursosErro(null);
    setCursosMsg(null);

    const payload = {
      nome: cursoForm.nome.trim(),
      metodologia: cursoForm.metodologia.trim() || null,
      observacoes: cursoForm.descricao.trim() || null,
      situacao: cursoForm.ativo ? "Ativo" : "Inativo",
    };

    try {
      const url = editingCurso
        ? `/api/escola/academico/cursos/${editingCurso.id}`
        : "/api/escola/academico/cursos";
      const method = editingCurso ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; message?: string } | null;

      if (!res.ok || !json?.ok) {
        const msg = json?.message ?? json?.error ?? "Falha ao salvar curso";
        throw new Error(`${res.status} - ${msg}`);
      }

      await carregarCursos();
      setCursosMsg(editingCurso ? "Curso atualizado com sucesso." : "Curso criado com sucesso.");
      resetCursoForm();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar curso";
      setCursosErro(msg);
    }
  }

  function editarCurso(curso: Curso) {
    setCursosErro(null);
    setCursosMsg(null);
    setEditingCurso(curso);
    setCursoForm({ nome: curso.nome, metodologia: curso.metodologia, descricao: curso.descricao, ativo: curso.ativo });
    setShowCursoForm(true);
  }

  async function alternarCurso(id: number) {
    const alvo = cursos.find((c) => c.id === id);
    if (!alvo) return;

    setCursosErro(null);
    setCursosMsg(null);

    try {
      const res = await fetch(`/api/escola/academico/cursos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situacao: alvo.ativo ? "Inativo" : "Ativo" }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; message?: string } | null;

      if (!res.ok || !json?.ok) {
        const msg = json?.message ?? json?.error ?? "Falha ao atualizar situacao";
        throw new Error(`${res.status} - ${msg}`);
      }

      await carregarCursos();
      setCursosMsg(alvo.ativo ? "Curso inativado." : "Curso ativado.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao atualizar situacao";
      setCursosErro(msg);
    }
  }

  async function salvarNivel(cursoId: number) {
    if (!nivelForm.nome.trim()) return;
    setCursosErro(null);
    setCursosMsg(null);
    const faixa = formatFaixa(
      nivelForm.idadeMinima === "" ? null : Number(nivelForm.idadeMinima),
      nivelForm.idadeMaxima === "" ? null : Number(nivelForm.idadeMaxima)
    );
    if (nivelEditingId) {
      try {
        const res = await fetch(`/api/escola/academico/niveis/${nivelEditingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: nivelForm.nome,
            faixa_etaria_sugerida: faixa || null,
            pre_requisito_nivel_id: nivelForm.prerequisito ?? null,
            observacoes: nivelForm.observacoes || null,
            idade_minima: nivelForm.idadeMinima === "" ? null : Number(nivelForm.idadeMinima),
            idade_maxima: nivelForm.idadeMaxima === "" ? null : Number(nivelForm.idadeMaxima),
          }),
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; details?: string } | null;
        if (!res.ok || !json?.ok) {
          const msg = json?.details ?? json?.error ?? "Falha ao salvar nivel.";
          throw new Error(msg);
        }
        setNiveis((prev) =>
          prev.map((n) =>
            n.id === nivelEditingId
              ? {
                  ...n,
                  nome: nivelForm.nome,
                  idadeMinima: nivelForm.idadeMinima === "" ? null : Number(nivelForm.idadeMinima),
                  idadeMaxima: nivelForm.idadeMaxima === "" ? null : Number(nivelForm.idadeMaxima),
                  faixaEtariaSugerida: faixa || "",
                  observacoes: nivelForm.observacoes,
                  prerequisito: nivelForm.prerequisito || null,
                }
              : n
          )
        );
        setCursosMsg("Nivel atualizado.");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Falha ao salvar nivel.";
        setCursosErro(msg);
        return;
      }
    } else {
      const novo: Nivel = {
        id: nextId(niveis),
        cursoId,
        nome: nivelForm.nome,
        idadeMinima: nivelForm.idadeMinima === "" ? null : Number(nivelForm.idadeMinima),
        idadeMaxima: nivelForm.idadeMaxima === "" ? null : Number(nivelForm.idadeMaxima),
        faixaEtariaSugerida: faixa || "",
        observacoes: nivelForm.observacoes,
        prerequisito: nivelForm.prerequisito || null,
      };
      setNiveis((prev) => [novo, ...prev]);
      setCursosMsg("Nivel criado localmente.");
    }
    setNivelForm({ nome: "", idadeMinima: "", idadeMaxima: "", observacoes: "", prerequisito: null });
    setNivelFormOpenFor(null);
    setNivelEditingId(null);
  }

  async function salvarConteudo(nivelId: number) {
    if (!conteudoForm.nome.trim()) return;
    setCursosErro(null);
    setCursosMsg(null);
    if (conteudoEditingId) {
      try {
        const res = await fetch(`/api/escola/academico/modulos/${conteudoEditingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: conteudoForm.nome,
            descricao: conteudoForm.descricao || null,
            ordem: conteudoForm.ordem,
            obrigatorio: conteudoForm.obrigatorio,
          }),
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; details?: string } | null;
        if (!res.ok || !json?.ok) {
          const msg = json?.details ?? json?.error ?? "Falha ao salvar modulo.";
          throw new Error(msg);
        }
        setConteudos((prev) =>
          prev.map((c) =>
            c.id === conteudoEditingId
              ? {
                  ...c,
                  nome: conteudoForm.nome,
                  ordem: conteudoForm.ordem,
                  obrigatorio: conteudoForm.obrigatorio,
                  descricao: conteudoForm.descricao,
                  categoria: conteudoForm.categoria,
                }
              : c
          )
        );
        setCursosMsg("Modulo atualizado.");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Falha ao salvar modulo.";
        setCursosErro(msg);
        return;
      }
    } else {
      const novo: Conteudo = {
        id: nextId(conteudos),
        nivelId,
        nome: conteudoForm.nome,
        ordem: conteudoForm.ordem,
        obrigatorio: conteudoForm.obrigatorio,
        descricao: conteudoForm.descricao,
        categoria: conteudoForm.categoria,
      };
      setConteudos((prev) => [novo, ...prev]);
      setCursosMsg("Modulo criado localmente.");
    }
    setConteudoForm({ nome: "", ordem: 1, obrigatorio: true, descricao: "", categoria: "" });
    setConteudoFormOpenFor(null);
    setConteudoEditingId(null);
  }

  async function salvarHabilidade(conteudoId: number) {
    if (!habilidadeForm.nome.trim()) return;
    setCursosErro(null);
    setCursosMsg(null);
    if (habilidadeEditingId) {
      try {
        const res = await fetch(`/api/escola/academico/habilidades/${habilidadeEditingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: habilidadeForm.nome,
            tipo: habilidadeForm.tipo || null,
            descricao: habilidadeForm.descricao || null,
            criterio_avaliacao: habilidadeForm.criterio || null,
            ordem: habilidadeForm.ordem,
          }),
        });
        const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; details?: string } | null;
        if (!res.ok || !json?.ok) {
          const msg = json?.details ?? json?.error ?? "Falha ao salvar habilidade.";
          throw new Error(msg);
        }
        setHabilidades((prev) =>
          prev.map((h) =>
            h.id === habilidadeEditingId
              ? {
                  ...h,
                  nome: habilidadeForm.nome,
                  tipo: habilidadeForm.tipo,
                  descricao: habilidadeForm.descricao,
                  criterio: habilidadeForm.criterio,
                  ordem: habilidadeForm.ordem,
                }
              : h
          )
        );
        setCursosMsg("Habilidade atualizada.");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Falha ao salvar habilidade.";
        setCursosErro(msg);
        return;
      }
    } else {
      const nova: Habilidade = {
        id: nextId(habilidades),
        conteudoId,
        nome: habilidadeForm.nome,
        tipo: habilidadeForm.tipo,
        descricao: habilidadeForm.descricao,
        criterio: habilidadeForm.criterio,
        ordem: habilidadeForm.ordem,
      };
      setHabilidades((prev) => [nova, ...prev]);
      setCursosMsg("Habilidade criada localmente.");
    }
    setHabilidadeForm({ nome: "", tipo: "", descricao: "", criterio: "", ordem: 1 });
    setHabilidadeFormOpenFor(null);
    setHabilidadeEditingId(null);
  }
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {showCursoForm && (
          <FormCard
            title={editingCurso ? "Editar curso" : "Cadastrar novo curso"}
            description="Preencha os dados do curso."
          >
            <form onSubmit={salvarCurso} className="mt-2 grid gap-3 md:grid-cols-2">
              <FormInput
                className="md:col-span-2"
                label="Nome do curso"
                required
                value={cursoForm.nome}
                onChange={(e) => setCursoForm({ ...cursoForm, nome: e.target.value })}
              />
              <FormInput
                label="Metodologia"
                value={cursoForm.metodologia}
                onChange={(e) => setCursoForm({ ...cursoForm, metodologia: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cursoForm.ativo}
                  onChange={(e) => setCursoForm({ ...cursoForm, ativo: e.target.checked })}
                />
                <span className="text-sm text-slate-700">Situacao: {cursoForm.ativo ? "Ativo" : "Inativo"}</span>
              </div>
              <FormInput
                className="md:col-span-2"
                label="Observacoes"
                as="textarea"
                rows={3}
                value={cursoForm.descricao}
                onChange={(e) => setCursoForm({ ...cursoForm, descricao: e.target.value })}
              />
              <div className="md:col-span-2 flex gap-2">
                <PrimaryButton type="submit">{editingCurso ? "Salvar curso" : "Adicionar curso"}</PrimaryButton>
                <PrimaryButton type="button" variant="outline" onClick={resetCursoForm}>
                  Cancelar
                </PrimaryButton>
              </div>
            </form>
          </FormCard>
        )}

        <FormCard
          title="Cursos cadastrados"
          description='Clique em "Ver niveis" para navegar na estrutura do curso.'
          actions={
            <div className="flex items-center gap-2">
              <PrimaryButton variant="outline" onClick={() => setIsEditMode((v) => !v)}>
                {isEditMode ? "Concluir edicao" : "Editar"}
              </PrimaryButton>
              <PrimaryButton onClick={() => setShowCursoForm(true)} icon="+">
                Novo curso
              </PrimaryButton>
            </div>
          }
        >
          {cursosErro ? <div className="text-sm text-red-600">{cursosErro}</div> : null}
          {cursosMsg ? <div className="text-sm text-emerald-700">{cursosMsg}</div> : null}
          {cursosLoading ? <div className="text-sm text-slate-600">Carregando cursos...</div> : null}
          {!cursosLoading && filtradas.length === 0 ? (
            <div className="text-sm text-slate-600">Nenhum curso cadastrado.</div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {filtradas.map((curso) => {
              const niveisDoCurso = niveis.filter((n) => n.cursoId === curso.id);
              return (
                <div key={curso.id} className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{curso.nome}</div>
                      <div className="text-sm text-slate-600">{curso.metodologia || "Sem metodologia"}</div>
                      <div className="text-xs text-slate-500 mt-1">Acesse os niveis deste curso.</div>
                    </div>
                    {isEditMode && (
                      <div className="space-x-2">
                        <PrimaryButton variant="outline" onClick={() => editarCurso(curso)}>
                          Editar
                        </PrimaryButton>
                        <PrimaryButton variant="outline" onClick={() => alternarCurso(curso.id)}>
                          {curso.ativo ? "Inativar" : "Ativar"}
                        </PrimaryButton>
                        <PrimaryButton
                          variant="outline"
                          onClick={() => {
                            setNivelFormOpenFor(curso.id);
                            setNivelEditingId(null);
                            setNivelForm({ nome: "", idadeMinima: "", idadeMaxima: "", observacoes: "", prerequisito: null });
                          }}
                        >
                          + Novo nivel
                        </PrimaryButton>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 space-y-3">
                    {nivelFormOpenFor === curso.id && (
                      <div className="rounded-md border border-violet-100 bg-white p-3 shadow-sm">
                        <div className="text-sm font-semibold text-slate-900 mb-2">
                          {nivelEditingId ? "Editar nivel" : "Novo nivel"}
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 text-sm">
                          <FormInput
                            label="Nome do nivel"
                            value={nivelForm.nome}
                            onChange={(e) => setNivelForm({ ...nivelForm, nome: e.target.value })}
                          />
                          <FormInput
                            label="Idade minima (anos)"
                            type="number"
                            value={nivelForm.idadeMinima ?? ""}
                            onChange={(e) =>
                              setNivelForm({ ...nivelForm, idadeMinima: e.target.value === "" ? "" : Number(e.target.value) })
                            }
                          />
                          <FormInput
                            label="Idade maxima (anos)"
                            type="number"
                            value={nivelForm.idadeMaxima ?? ""}
                            onChange={(e) =>
                              setNivelForm({ ...nivelForm, idadeMaxima: e.target.value === "" ? "" : Number(e.target.value) })
                            }
                          />
                          <FormInput
                            label="Faixa etaria sugerida"
                            disabled
                            value={formatFaixa(
                              nivelForm.idadeMinima === "" ? null : Number(nivelForm.idadeMinima),
                              nivelForm.idadeMaxima === "" ? null : Number(nivelForm.idadeMaxima)
                            )}
                          />
                          <FormInput
                            label="Pre-requisito"
                            as="select"
                            value={nivelForm.prerequisito ?? ""}
                            onChange={(e) =>
                              setNivelForm({
                                ...nivelForm,
                                prerequisito: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          >
                            <option value="">Nenhum</option>
                            {niveisDoCurso
                              .filter((n) => n.id !== nivelEditingId)
                              .map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.nome}
                                </option>
                              ))}
                          </FormInput>
                          <FormInput
                            className="md:col-span-2"
                            label="Observacoes"
                            as="textarea"
                            rows={2}
                            value={nivelForm.observacoes}
                            onChange={(e) => setNivelForm({ ...nivelForm, observacoes: e.target.value })}
                          />
                        </div>
                        <div className="mt-3 flex gap-2">
                          <PrimaryButton onClick={() => salvarNivel(curso.id)}>
                            {nivelEditingId ? "Salvar nivel" : "Adicionar nivel"}
                          </PrimaryButton>
                          <PrimaryButton
                            variant="outline"
                            onClick={() => {
                              setNivelFormOpenFor(null);
                              setNivelEditingId(null);
                              setNivelForm({ nome: "", idadeMinima: "", idadeMaxima: "", observacoes: "", prerequisito: null });
                            }}
                          >
                            Cancelar
                          </PrimaryButton>
                        </div>
                      </div>
                    )}

                    {niveisDoCurso.length === 0 && (
                      <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">Nenhum nivel cadastrado.</div>
                    )}

                    {niveisDoCurso.map((nivel) => {
                      const conteudosDoNivel = conteudos.filter((c) => c.nivelId === nivel.id);
                      const faixa = nivel.faixaEtariaSugerida || formatFaixa(nivel.idadeMinima, nivel.idadeMaxima);
                      const prereqNome = nivel.prerequisito
                        ? niveisDoCurso.find((n) => n.id === nivel.prerequisito)?.nome
                        : "Nenhum";

                      return (
                        <div key={nivel.id} className="rounded-md bg-slate-50 p-3 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-slate-900">{nivel.nome}</div>
                              <div className="text-xs text-slate-600">{faixa || "Sem faixa definida"}</div>
                              <div className="text-xs text-slate-500">
                                Pre-requisito: {prereqNome} | Observacoes: {nivel.observacoes || "Sem observacoes"}
                              </div>
                            </div>
                            {isEditMode && (
                              <div className="flex gap-2">
                                <PrimaryButton
                                  variant="outline"
                                  onClick={() => {
                                    setConteudoFormOpenFor(nivel.id);
                                    setConteudoEditingId(null);
                                    setConteudoForm({ nome: "", ordem: 1, obrigatorio: true, descricao: "", categoria: "" });
                                  }}
                                >
                                  + Novo conteudo
                                </PrimaryButton>
                                <PrimaryButton
                                  variant="outline"
                                  onClick={() => {
                                    setNivelEditingId(nivel.id);
                                    setNivelForm({
                                      nome: nivel.nome,
                                      idadeMinima: nivel.idadeMinima ?? "",
                                      idadeMaxima: nivel.idadeMaxima ?? "",
                                      observacoes: nivel.observacoes || "",
                                      prerequisito: nivel.prerequisito ?? null,
                                    });
                                    setNivelFormOpenFor(curso.id);
                                  }}
                                >
                                  Editar nivel
                                </PrimaryButton>
                                <PrimaryButton variant="outline" onClick={() => setNiveis((prev) => prev.filter((n) => n.id !== nivel.id))}>
                                  Remover nivel
                                </PrimaryButton>
                              </div>
                            )}
                          </div>

                          {isEditMode && conteudoFormOpenFor === nivel.id && (
                            <div className="mt-2 rounded-md border border-violet-100 bg-white p-3 shadow-sm">
                              <div className="text-sm font-semibold text-slate-900 mb-2">
                                {conteudoEditingId ? "Editar conteudo" : "Novo conteudo"}
                              </div>
                              <div className="grid gap-3 md:grid-cols-2 text-sm">
                                <FormInput
                                  label="Nome do conteudo"
                                  value={conteudoForm.nome}
                                  onChange={(e) => setConteudoForm({ ...conteudoForm, nome: e.target.value })}
                                />
                                <FormInput
                                  label="Ordem"
                                  type="number"
                                  value={conteudoForm.ordem}
                                  onChange={(e) => setConteudoForm({ ...conteudoForm, ordem: Number(e.target.value) })}
                                />
                                <FormInput
                                  label="Categoria (opcional)"
                                  value={conteudoForm.categoria}
                                  onChange={(e) => setConteudoForm({ ...conteudoForm, categoria: e.target.value })}
                                />
                                <FormInput
                                  className="md:col-span-2"
                                  label="Descricao"
                                  as="textarea"
                                  rows={3}
                                  value={conteudoForm.descricao}
                                  onChange={(e) => setConteudoForm({ ...conteudoForm, descricao: e.target.value })}
                                />
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={conteudoForm.obrigatorio}
                                    onChange={(e) => setConteudoForm({ ...conteudoForm, obrigatorio: e.target.checked })}
                                  />
                                  Conteudo obrigatorio
                                </label>
                              </div>
                              <div className="mt-3 flex gap-2">
                                <PrimaryButton onClick={() => salvarConteudo(nivel.id)}>
                                  {conteudoEditingId ? "Salvar conteudo" : "Adicionar conteudo"}
                                </PrimaryButton>
                                <PrimaryButton
                                  variant="outline"
                                  onClick={() => {
                                    setConteudoFormOpenFor(null);
                                    setConteudoEditingId(null);
                                    setConteudoForm({ nome: "", ordem: 1, obrigatorio: true, descricao: "", categoria: "" });
                                  }}
                                >
                                  Cancelar
                                </PrimaryButton>
                              </div>
                            </div>
                          )}

                          <div className="mt-3 space-y-3">
                            {conteudosDoNivel.length === 0 && (
                              <div className="text-sm text-slate-600">Nenhum conteudo cadastrado.</div>
                            )}
                            {conteudosDoNivel.map((ct) => {
                              const habs = habilidades.filter((h) => h.conteudoId === ct.id);
                              return (
                                <div key={ct.id} className="rounded-md bg-white p-3 shadow border border-slate-100">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="font-semibold text-slate-900">{ct.nome}</div>
                                      <div className="text-xs text-slate-600">
                                        Ordem {ct.ordem} | {ct.obrigatorio ? "Obrigatorio" : "Opcional"}
                                      </div>
                                      <div className="text-xs text-slate-500">{ct.descricao || "Sem descricao"}</div>
                                    </div>
                                    {isEditMode && (
                                      <div className="flex gap-2">
                                        <PrimaryButton
                                          variant="outline"
                                          onClick={() => {
                                            setHabilidadeFormOpenFor(ct.id);
                                            setHabilidadeEditingId(null);
                                            setHabilidadeForm({ nome: "", tipo: "", descricao: "", criterio: "", ordem: 1 });
                                          }}
                                        >
                                          + Nova habilidade
                                        </PrimaryButton>
                                        <PrimaryButton
                                          variant="outline"
                                          onClick={() => {
                                            setConteudoEditingId(ct.id);
                                            setConteudoForm({
                                              nome: ct.nome,
                                              ordem: ct.ordem,
                                              obrigatorio: ct.obrigatorio,
                                              descricao: ct.descricao || "",
                                              categoria: ct.categoria || "",
                                            });
                                            setConteudoFormOpenFor(nivel.id);
                                          }}
                                        >
                                          Editar conteudo
                                        </PrimaryButton>
                                        <PrimaryButton variant="outline" onClick={() => setConteudos((prev) => prev.filter((p) => p.id !== ct.id))}>
                                          Remover conteudo
                                        </PrimaryButton>
                                      </div>
                                    )}
                                  </div>

                                  {isEditMode && habilidadeFormOpenFor === ct.id && (
                                    <div className="mt-2 rounded-md border border-violet-100 bg-slate-50 p-3 shadow-sm">
                                      <div className="text-sm font-semibold text-slate-900 mb-2">
                                        {habilidadeEditingId ? "Editar habilidade" : "Nova habilidade"}
                                      </div>
                                      <div className="grid gap-3 md:grid-cols-2 text-sm">
                                        <FormInput
                                          label="Nome da habilidade"
                                          value={habilidadeForm.nome}
                                          onChange={(e) => setHabilidadeForm({ ...habilidadeForm, nome: e.target.value })}
                                        />
                                        <FormInput
                                          label="Tipo (Tecnica, Artistica...)"
                                          value={habilidadeForm.tipo}
                                          onChange={(e) => setHabilidadeForm({ ...habilidadeForm, tipo: e.target.value })}
                                        />
                                        <FormInput
                                          className="md:col-span-2"
                                          label="Descricao"
                                          as="textarea"
                                          rows={2}
                                          value={habilidadeForm.descricao}
                                          onChange={(e) => setHabilidadeForm({ ...habilidadeForm, descricao: e.target.value })}
                                        />
                                        <FormInput
                                          className="md:col-span-2"
                                          label="Criterio de avaliacao"
                                          as="textarea"
                                          rows={2}
                                          value={habilidadeForm.criterio}
                                          onChange={(e) => setHabilidadeForm({ ...habilidadeForm, criterio: e.target.value })}
                                        />
                                        <FormInput
                                          label="Ordem"
                                          type="number"
                                          value={habilidadeForm.ordem}
                                          onChange={(e) => setHabilidadeForm({ ...habilidadeForm, ordem: Number(e.target.value) })}
                                        />
                                      </div>
                                      <div className="mt-3 flex gap-2">
                                        <PrimaryButton onClick={() => salvarHabilidade(ct.id)}>
                                          {habilidadeEditingId ? "Salvar habilidade" : "Adicionar habilidade"}
                                        </PrimaryButton>
                                        <PrimaryButton
                                          variant="outline"
                                          onClick={() => {
                                            setHabilidadeFormOpenFor(null);
                                            setHabilidadeEditingId(null);
                                            setHabilidadeForm({ nome: "", tipo: "", descricao: "", criterio: "", ordem: 1 });
                                          }}
                                        >
                                          Cancelar
                                        </PrimaryButton>
                                      </div>
                                    </div>
                                  )}

                                  <div className="mt-2 space-y-1">
                                    {habs.length === 0 && <div className="text-sm text-slate-500">Nenhuma habilidade cadastrada.</div>}
                                    {habs.map((h) => (
                                      <div key={h.id} className="text-sm text-slate-800 flex items-center justify-between">
                                        <div>
                                          <div className="font-semibold">{h.nome}</div>
                                          <div className="text-xs text-slate-500">
                                            {h.tipo} | {h.criterio || "-"} | Ordem {h.ordem ?? "-"}
                                          </div>
                                          <div className="text-xs text-slate-500">{h.descricao || ""}</div>
                                        </div>
                                        {isEditMode && (
                                          <div className="space-x-2">
                                            <PrimaryButton
                                              variant="outline"
                                              onClick={() => {
                                                setHabilidadeEditingId(h.id);
                                                setHabilidadeForm({
                                                  nome: h.nome,
                                                  tipo: h.tipo,
                                                  descricao: h.descricao || "",
                                                  criterio: h.criterio || "",
                                                  ordem: h.ordem || 1,
                                                });
                                                setHabilidadeFormOpenFor(ct.id);
                                              }}
                                            >
                                              Editar
                                            </PrimaryButton>
                                            <PrimaryButton variant="outline" onClick={() => setHabilidades((prev) => prev.filter((x) => x.id !== h.id))}>
                                              Remover
                                            </PrimaryButton>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </FormCard>
      </div>
    </div>
  );
}


