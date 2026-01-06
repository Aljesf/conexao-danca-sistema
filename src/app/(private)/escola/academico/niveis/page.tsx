"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import FormCard from "@/components/FormCard";
import FormInput from "@/components/FormInput";
import PrimaryButton from "@/components/PrimaryButton";

type Curso = { id: number; nome: string };
type Nivel = {
  id: number;
  cursoId: number;
  nome: string;
  idadeMinima: number | null;
  idadeMaxima: number | null;
  faixaEtariaSugerida?: string | null;
  prerequisito?: number | null;
  observacoes?: string;
};

type Conteudo = {
  id: number;
  nivelId: number;
  nome: string;
  ordem: number;
  obrigatorio: boolean;
  descricao?: string;
};

type Habilidade = {
  id: number;
  conteudoId: number;
  nome: string;
  tipo: string;
  criterio?: string;
};

const cursosSeed: Curso[] = [
  { id: 1, nome: "Ballet" },
  { id: 2, nome: "Jazz" },
];

const niveisSeed: Nivel[] = [
  {
    id: 1,
    cursoId: 1,
    nome: "Nivel 1",
    idadeMinima: 6,
    idadeMaxima: 8,
    faixaEtariaSugerida: "6-8 anos",
  },
  {
    id: 2,
    cursoId: 1,
    nome: "Nivel 2",
    idadeMinima: 8,
    idadeMaxima: 10,
    faixaEtariaSugerida: "8-10 anos",
  },
  {
    id: 3,
    cursoId: 2,
    nome: "Iniciante",
    idadeMinima: null,
    idadeMaxima: null,
    faixaEtariaSugerida: "",
  },
];

const conteudosSeed: Conteudo[] = [
  { id: 1, nivelId: 1, nome: "Plies basicos", ordem: 1, obrigatorio: true, descricao: "Fundamentos" },
  { id: 2, nivelId: 1, nome: "Port de bras", ordem: 2, obrigatorio: false, descricao: "Alongamento" },
  { id: 3, nivelId: 2, nome: "Adagio", ordem: 1, obrigatorio: true, descricao: "Controle" },
  { id: 4, nivelId: 3, nome: "Isolamentos", ordem: 1, obrigatorio: true, descricao: "Coordenação" },
];

const habilidadesSeed: Habilidade[] = [
  { id: 1, conteudoId: 1, nome: "Plie em 1a", tipo: "Tecnica", criterio: "Alinhamento" },
  { id: 2, conteudoId: 4, nome: "Isolamento de cabeça", tipo: "Tecnica", criterio: "Controle" },
];

function formatFaixa(min: number | null, max: number | null) {
  if (min != null && max != null) return `${min}-${max} anos`;
  if (min != null) return `A partir de ${min} anos`;
  if (max != null) return `Até ${max} anos`;
  return "";
}

export default function NiveisPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const initialCurso = Number(searchParams?.curso || 0) || 1;
  const [cursos] = useState<Curso[]>(cursosSeed);
  const [lista, setLista] = useState<Nivel[]>(niveisSeed);
  const [conteudos, setConteudos] = useState<Conteudo[]>(conteudosSeed);
  const [habilidades, setHabilidades] = useState<Habilidade[]>(habilidadesSeed);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Nivel | null>(null);
  const [conteudoFormOpenFor, setConteudoFormOpenFor] = useState<number | null>(null);
  const [conteudoEditingId, setConteudoEditingId] = useState<number | null>(null);
  const [conteudoForm, setConteudoForm] = useState({
    nome: "",
    ordem: 1,
    obrigatorio: true,
    descricao: "",
  });
  const [habilidadeFormOpenFor, setHabilidadeFormOpenFor] = useState<number | null>(null);
  const [habilidadeEditingId, setHabilidadeEditingId] = useState<number | null>(null);
  const [habilidadeForm, setHabilidadeForm] = useState({
    nome: "",
    tipo: "",
    criterio: "",
  });

  const [filtroCurso, setFiltroCurso] = useState<number>(
    initialCurso
  );
  const [form, setForm] = useState({
    cursoId: initialCurso || cursos[0].id,
    nome: "",
    idadeMinima: "" as number | "" | null,
    idadeMaxima: "" as number | "" | null,
    prerequisito: null as number | null,
    observacoes: "",
  });

  const filtrados = useMemo(() => {
    return lista.filter((n) => n.cursoId === filtroCurso);
  }, [lista, filtroCurso]);

  function reset() {
    setEditing(null);
    setForm({
      cursoId: filtroCurso || cursos[0]?.id,
      nome: "",
      idadeMinima: "",
      idadeMaxima: "",
      prerequisito: null,
      observacoes: "",
    });
    setShowForm(false);
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      setLista((prev) =>
        prev.map((n) =>
          n.id === editing.id
            ? {
                ...n,
                ...form,
                cursoId: Number(form.cursoId),
                idadeMinima: form.idadeMinima === "" ? null : Number(form.idadeMinima),
                idadeMaxima: form.idadeMaxima === "" ? null : Number(form.idadeMaxima),
                prerequisito: form.prerequisito ? Number(form.prerequisito) : null,
                faixaEtariaSugerida: formatFaixa(
                  form.idadeMinima === "" ? null : Number(form.idadeMinima),
                  form.idadeMaxima === "" ? null : Number(form.idadeMaxima)
                ),
              }
            : n
        )
      );
    } else {
      const novo: Nivel = {
        id: lista.length ? Math.max(...lista.map((n) => n.id)) + 1 : 1,
        cursoId: Number(form.cursoId),
        nome: form.nome,
        idadeMinima: form.idadeMinima === "" ? null : Number(form.idadeMinima),
        idadeMaxima: form.idadeMaxima === "" ? null : Number(form.idadeMaxima),
        prerequisito: form.prerequisito ? Number(form.prerequisito) : null,
        observacoes: form.observacoes,
        faixaEtariaSugerida: formatFaixa(
          form.idadeMinima === "" ? null : Number(form.idadeMinima),
          form.idadeMaxima === "" ? null : Number(form.idadeMaxima)
        ),
      };
      setLista((prev) => [novo, ...prev]);
    }
    reset();
  }

  function editar(n: Nivel) {
    setEditing(n);
    setShowForm(true);
    setForm({
      cursoId: n.cursoId,
      nome: n.nome,
      idadeMinima: n.idadeMinima ?? "",
      idadeMaxima: n.idadeMaxima ?? "",
      prerequisito: n.prerequisito ?? null,
      observacoes: n.observacoes ?? "",
    });
  }

  function remover(id: number) {
    if (!confirm("Remover nivel?")) return;
    setLista((prev) => prev.filter((n) => n.id !== id));
  }

  function salvarConteudo(nivelId: number) {
    if (!conteudoForm.nome.trim()) return;
    if (conteudoEditingId) {
      setConteudos((prev) =>
        prev.map((c) =>
          c.id === conteudoEditingId
            ? {
                ...c,
                nome: conteudoForm.nome,
                ordem: conteudoForm.ordem,
                obrigatorio: conteudoForm.obrigatorio,
                descricao: conteudoForm.descricao,
              }
            : c
        )
      );
    } else {
      const novo: Conteudo = {
        id: conteudos.length ? Math.max(...conteudos.map((c) => c.id)) + 1 : 1,
        nivelId,
        nome: conteudoForm.nome,
        ordem: conteudoForm.ordem,
        obrigatorio: conteudoForm.obrigatorio,
        descricao: conteudoForm.descricao,
      };
      setConteudos((prev) => [novo, ...prev]);
    }
    setConteudoForm({ nome: "", ordem: 1, obrigatorio: true, descricao: "" });
    setConteudoFormOpenFor(null);
    setConteudoEditingId(null);
  }

  function salvarHabilidade(conteudoId: number) {
    if (!habilidadeForm.nome.trim()) return;
    if (habilidadeEditingId) {
      setHabilidades((prev) =>
        prev.map((h) =>
          h.id === habilidadeEditingId
            ? { ...h, nome: habilidadeForm.nome, tipo: habilidadeForm.tipo, criterio: habilidadeForm.criterio }
            : h
        )
      );
    } else {
      const nova: Habilidade = {
        id: habilidades.length ? Math.max(...habilidades.map((h) => h.id)) + 1 : 1,
        conteudoId,
        nome: habilidadeForm.nome,
        tipo: habilidadeForm.tipo,
        criterio: habilidadeForm.criterio,
      };
      setHabilidades((prev) => [nova, ...prev]);
    }
    setHabilidadeForm({ nome: "", tipo: "", criterio: "" });
    setHabilidadeFormOpenFor(null);
    setHabilidadeEditingId(null);
  }

  const cursoAtual = cursos.find((c) => c.id === filtroCurso);
  const qtdNiveisCurso = lista.filter((n) => n.cursoId === filtroCurso).length;
  const breadcrumb = `Curso (${cursoAtual?.nome || "-"}) → Niveis`;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-lg bg-white p-4 shadow-sm border border-slate-100">
          <div className="text-sm font-semibold text-slate-800">{breadcrumb}</div>
          <div className="text-xs text-slate-500">Jornada visual · Curso → Niveis → Conteudos → Habilidades</div>
        </div>

        <FormCard
          title="Contexto do curso"
          description="Veja abaixo os niveis deste curso e avance para conteudos e habilidades dentro dos cards."
        >
          <div className="grid gap-3 md:grid-cols-3 text-sm text-slate-700">
            <div>
              <div className="text-xs text-slate-500">Curso</div>
              <div className="font-semibold text-slate-900">{cursoAtual?.nome || "Selecione um curso"}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Metodologia</div>
              <div className="font-medium text-slate-800">-</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Niveis cadastrados</div>
              <div className="font-medium text-slate-800">{qtdNiveisCurso}</div>
            </div>
          </div>
        </FormCard>

        {showForm && (
          <FormCard
            title={editing ? "Editar nivel" : "Cadastrar novo nivel"}
            description='Observacao: nao inclua horarios ou dias da semana. Esses dados serao definidos na turma.'
          >
            <form onSubmit={salvar} className="mt-2 grid gap-3 md:grid-cols-2">
              <FormInput
                label="Curso"
                as="select"
                value={form.cursoId}
                onChange={(e) => setForm({ ...form, cursoId: Number(e.target.value) })}
              >
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </FormInput>
              <FormInput
                label="Nome do nivel"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
              />
              <FormInput
                label="Idade minima (anos)"
                type="number"
                value={form.idadeMinima ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    idadeMinima: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
              <FormInput
                label="Idade maxima (anos)"
                type="number"
                value={form.idadeMaxima ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    idadeMaxima: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
              />
              <FormInput
                className="md:col-span-2"
                label="Faixa etaria sugerida"
                value={formatFaixa(
                  form.idadeMinima === "" ? null : Number(form.idadeMinima),
                  form.idadeMaxima === "" ? null : Number(form.idadeMaxima)
                )}
                disabled
              />
              <FormInput
                label="Pre-requisito"
                as="select"
                value={form.prerequisito ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    prerequisito: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">Nenhum</option>
                {lista
                  .filter((n) => n.cursoId === form.cursoId)
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
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
              <div className="md:col-span-2 flex gap-2">
                <PrimaryButton type="submit">
                  {editing ? "Salvar alteracoes" : "Salvar nivel"}
                </PrimaryButton>
                {editing && (
                  <PrimaryButton type="button" variant="outline" onClick={reset}>
                    Cancelar
                  </PrimaryButton>
                )}
              </div>
            </form>
          </FormCard>
        )}

        <div className="space-y-4">
          {lista
            .filter((n) => n.cursoId === filtroCurso)
            .map((n) => {
              const prereq = lista.find((p) => p.id === n.prerequisito);
              const faixa = n.faixaEtariaSugerida || formatFaixa(n.idadeMinima ?? null, n.idadeMaxima ?? null);
              const conteudosDoNivel = conteudos.filter((c) => c.nivelId === n.id);
              return (
                <div key={n.id} className="rounded-lg bg-white p-4 shadow-sm border border-slate-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{n.nome}</div>
                      <div className="text-sm text-slate-700">{faixa || "-"}</div>
                      <div className="text-xs text-slate-500">
                        Pré-requisito: {prereq?.nome || "Nenhum"} • Observacoes: {n.observacoes || "Sem observacoes"}
                      </div>
                    </div>
                    <div className="space-x-2">
                      <PrimaryButton
                        variant="outline"
                        onClick={() => {
                          setConteudoFormOpenFor(n.id);
                          setConteudoEditingId(null);
                          setConteudoForm({ nome: "", ordem: 1, obrigatorio: true, descricao: "" });
                        }}
                      >
                        + Novo conteudo
                      </PrimaryButton>
                      <PrimaryButton variant="outline" onClick={() => editar(n)}>
                        Editar nivel
                      </PrimaryButton>
                      <PrimaryButton variant="outline" onClick={() => remover(n.id)}>
                        Remover nivel
                      </PrimaryButton>
                    </div>
                  </div>

                  {conteudoFormOpenFor === n.id && (
                    <div className="mt-2 rounded-md border border-violet-100 bg-white p-3 shadow-sm">
                      <div className="text-sm font-semibold text-slate-900 mb-2">
                        {conteudoEditingId ? "Editar conteudo" : "Novo conteudo"}
                      </div>
                      <div className="grid gap-2 md:grid-cols-2 text-sm">
                        <input
                          className="input"
                          placeholder="Nome do conteudo"
                          value={conteudoForm.nome}
                          onChange={(e) => setConteudoForm({ ...conteudoForm, nome: e.target.value })}
                        />
                        <input
                          className="input"
                          type="number"
                          placeholder="Ordem"
                          value={conteudoForm.ordem}
                          onChange={(e) => setConteudoForm({ ...conteudoForm, ordem: Number(e.target.value) })}
                        />
                        <textarea
                          className="input md:col-span-2"
                          placeholder="Descricao"
                          value={conteudoForm.descricao}
                          onChange={(e) => setConteudoForm({ ...conteudoForm, descricao: e.target.value })}
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={conteudoForm.obrigatorio}
                            onChange={(e) =>
                              setConteudoForm({ ...conteudoForm, obrigatorio: e.target.checked })
                            }
                          />
                          Conteudo obrigatorio
                        </label>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <PrimaryButton onClick={() => salvarConteudo(n.id)}>
                          {conteudoEditingId ? "Salvar conteudo" : "Adicionar conteudo"}
                        </PrimaryButton>
                        <PrimaryButton
                          variant="outline"
                          onClick={() => {
                            setConteudoFormOpenFor(null);
                            setConteudoEditingId(null);
                            setConteudoForm({ nome: "", ordem: 1, obrigatorio: true, descricao: "" });
                          }}
                        >
                          Cancelar
                        </PrimaryButton>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 space-y-3">
                    {conteudosDoNivel.map((ct) => {
                      const habs = habilidades.filter((h) => h.conteudoId === ct.id);
                      return (
                        <div key={ct.id} className="rounded-md bg-slate-50 p-3 border border-slate-100 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-slate-900">{ct.nome}</div>
                              <div className="text-xs text-slate-600">
                                Ordem {ct.ordem} • {ct.obrigatorio ? "Obrigatorio" : "Opcional"}
                              </div>
                              <div className="text-xs text-slate-500">{ct.descricao || "Sem descricao"}</div>
                            </div>
                            <div className="flex gap-2">
                              <PrimaryButton
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setHabilidadeFormOpenFor(ct.id);
                                  setHabilidadeEditingId(null);
                                  setHabilidadeForm({ nome: "", tipo: "", criterio: "" });
                                }}
                              >
                                + Nova habilidade
                              </PrimaryButton>
                              <PrimaryButton
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setConteudoEditingId(ct.id);
                                  setConteudoForm({
                                    nome: ct.nome,
                                    ordem: ct.ordem,
                                    obrigatorio: ct.obrigatorio,
                                    descricao: ct.descricao || "",
                                  });
                                  setConteudoFormOpenFor(n.id);
                                }}
                              >
                                Editar conteudo
                              </PrimaryButton>
                              <PrimaryButton
                                variant="outline"
                                size="sm"
                                onClick={() => setConteudos((prev) => prev.filter((p) => p.id !== ct.id))}
                              >
                                Remover conteudo
                              </PrimaryButton>
                            </div>
                          </div>
                          {habilidadeFormOpenFor === ct.id && (
                            <div className="mt-2 rounded-md border border-violet-100 bg-white p-3 shadow-sm">
                              <div className="text-sm font-semibold text-slate-900 mb-2">
                                {habilidadeEditingId ? "Editar habilidade" : "Nova habilidade"}
                              </div>
                              <div className="grid gap-2 md:grid-cols-2 text-sm">
                                <input
                                  className="input"
                                  placeholder="Nome da habilidade"
                                  value={habilidadeForm.nome}
                                  onChange={(e) =>
                                    setHabilidadeForm({ ...habilidadeForm, nome: e.target.value })
                                  }
                                />
                                <input
                                  className="input"
                                  placeholder="Tipo (Tecnica, Artistica...)"
                                  value={habilidadeForm.tipo}
                                  onChange={(e) =>
                                    setHabilidadeForm({ ...habilidadeForm, tipo: e.target.value })
                                  }
                                />
                                <textarea
                                  className="input md:col-span-2"
                                  placeholder="Criterio"
                                  value={habilidadeForm.criterio}
                                  onChange={(e) =>
                                    setHabilidadeForm({ ...habilidadeForm, criterio: e.target.value })
                                  }
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
                                    setHabilidadeForm({ nome: "", tipo: "", criterio: "" });
                                  }}
                                >
                                  Cancelar
                                </PrimaryButton>
                              </div>
                            </div>
                          )}
                          <div className="mt-2 space-y-1">
                            {habs.length === 0 && (
                              <div className="text-sm text-slate-500">Nenhuma habilidade cadastrada.</div>
                            )}
                            {habs.map((h) => (
                              <div
                                key={h.id}
                                className="text-sm text-slate-800 flex items-center justify-between rounded bg-white px-2 py-1"
                              >
                                <div>
                                  <div>{h.nome}</div>
                                  <div className="text-xs text-slate-500">{h.tipo}</div>
                                </div>
                                <div className="space-x-2">
                                  <PrimaryButton
                                    variant="outline"
                                    onClick={() => {
                                      setHabilidadeEditingId(h.id);
                                      setHabilidadeForm({
                                        nome: h.nome,
                                        tipo: h.tipo,
                                        criterio: h.criterio || "",
                                      });
                                      setHabilidadeFormOpenFor(ct.id);
                                    }}
                                  >
                                    Editar
                                  </PrimaryButton>
                                  <PrimaryButton
                                    variant="outline"
                                    onClick={() => setHabilidades((prev) => prev.filter((x) => x.id !== h.id))}
                                  >
                                    Remover
                                  </PrimaryButton>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {conteudosDoNivel.length === 0 && (
                      <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
                        Nenhum conteudo cadastrado.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
