"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import FormCard from "@/components/FormCard";
import FormInput from "@/components/FormInput";
import PrimaryButton from "@/components/PrimaryButton";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type FuncaoGrupo = {
  id: number;
  nome: string | null;
  pode_lecionar: boolean | null;
  descricao: string | null;
  ativo: boolean | null;
  ordem: number | null;
};

type Funcao = {
  id: number;
  grupo_id: number | null;
  nome: string | null;
  descricao: string | null;
  ativo: boolean | null;
};

function useFuncoesData() {
  const supabase = getSupabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [grupos, setGrupos] = useState<FuncaoGrupo[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);

  const refresh = async () => {
    setLoading(true);
    const [gruposRes, funcoesRes] = await Promise.all([
      supabase
        .from("funcoes_grupo")
        .select("id,nome,pode_lecionar,descricao,ativo,ordem")
        .order("ordem", { ascending: true, nullsFirst: true })
        .order("nome", { ascending: true }),
      supabase.from("funcoes_colaborador").select("id,grupo_id,nome,descricao,ativo").order("nome", { ascending: true }),
    ]);

    setGrupos(gruposRes.data ?? []);
    setFuncoes(funcoesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const funcoesPorGrupo = useMemo(() => {
    const map: Record<number, Funcao[]> = {};
    funcoes.forEach((fn) => {
      if (!fn.grupo_id) return;
      if (!map[fn.grupo_id]) map[fn.grupo_id] = [];
      map[fn.grupo_id].push(fn);
    });
    Object.values(map).forEach((lista) => lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || "")));
    return map;
  }, [funcoes]);

  return { supabase, loading, grupos, funcoes, funcoesPorGrupo, refresh };
}

export default function TiposFuncaoPage() {
  const { supabase, loading, grupos, funcoesPorGrupo, refresh } = useFuncoesData();

  const [editMode, setEditMode] = useState(false);

  const [grupoFormVisible, setGrupoFormVisible] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<FuncaoGrupo | null>(null);
  const [grupoForm, setGrupoForm] = useState({ nome: "", pode_lecionar: false, descricao: "", ativo: true });
  const [savingGrupo, setSavingGrupo] = useState(false);

  const [funcaoFormOpenFor, setFuncaoFormOpenFor] = useState<number | null>(null);
  const [funcaoEditingId, setFuncaoEditingId] = useState<number | null>(null);
  const [funcaoForm, setFuncaoForm] = useState({ nome: "", descricao: "", ativo: true });
  const [savingFuncao, setSavingFuncao] = useState(false);

  const gruposOrdenados = useMemo(
    () =>
      [...grupos].sort((a, b) => {
        const ordA = a.ordem ?? 0;
        const ordB = b.ordem ?? 0;
        if (ordA !== ordB) return ordA - ordB;
        return (a.nome || "").localeCompare(b.nome || "");
      }),
    [grupos]
  );

  useEffect(() => {
    if (!editMode) {
      setGrupoFormVisible(false);
      setEditingGrupo(null);
      setFuncaoFormOpenFor(null);
      setFuncaoEditingId(null);
    }
  }, [editMode]);

  function resetGrupoForm() {
    setGrupoForm({ nome: "", pode_lecionar: false, descricao: "", ativo: true });
    setGrupoFormVisible(false);
    setEditingGrupo(null);
  }

  async function salvarGrupo(e: FormEvent) {
    e.preventDefault();
    if (!grupoForm.nome.trim()) return;
    setSavingGrupo(true);
    const payload = {
      nome: grupoForm.nome.trim(),
      pode_lecionar: grupoForm.pode_lecionar,
      descricao: grupoForm.descricao.trim() || null,
      ativo: grupoForm.ativo,
    };

    if (editingGrupo) {
      await supabase.from("funcoes_grupo").update(payload).eq("id", editingGrupo.id);
    } else {
      const nextOrder = grupos.reduce((max, g) => Math.max(max, g.ordem ?? 0), 0) + 1;
      await supabase.from("funcoes_grupo").insert({ ...payload, ordem: nextOrder });
    }

    await refresh();
    setSavingGrupo(false);
    resetGrupoForm();
  }

  function abrirEdicaoGrupo(grupo: FuncaoGrupo) {
    setEditingGrupo(grupo);
    setGrupoForm({
      nome: grupo.nome ?? "",
      pode_lecionar: grupo.pode_lecionar ?? false,
      descricao: grupo.descricao ?? "",
      ativo: grupo.ativo ?? true,
    });
    setGrupoFormVisible(true);
  }

  async function alternarGrupo(grupo: FuncaoGrupo) {
    await supabase.from("funcoes_grupo").update({ ativo: !(grupo.ativo ?? true) }).eq("id", grupo.id);
    await refresh();
  }

  async function removerGrupo(grupo: FuncaoGrupo) {
    const vinculadas = funcoesPorGrupo[grupo.id] ?? [];
    if (vinculadas.length > 0) {
      window.alert("Remova ou mova as funções deste grupo antes de apagá-lo.");
      return;
    }
    if (!window.confirm(`Remover o grupo "${grupo.nome}"?`)) return;
    await supabase.from("funcoes_grupo").delete().eq("id", grupo.id);
    await refresh();
  }

  function resetFuncaoForm() {
    setFuncaoForm({ nome: "", descricao: "", ativo: true });
    setFuncaoFormOpenFor(null);
    setFuncaoEditingId(null);
  }

  async function salvarFuncao(e: FormEvent) {
    e.preventDefault();
    if (!funcaoFormOpenFor || !funcaoForm.nome.trim()) return;
    setSavingFuncao(true);
    const payload = {
      grupo_id: funcaoFormOpenFor,
      nome: funcaoForm.nome.trim(),
      descricao: funcaoForm.descricao.trim() || null,
      ativo: funcaoForm.ativo,
    };

    if (funcaoEditingId) {
      const { grupo_id, ...rest } = payload;
      await supabase.from("funcoes_colaborador").update(rest).eq("id", funcaoEditingId);
    } else {
      await supabase.from("funcoes_colaborador").insert(payload);
    }

    await refresh();
    setSavingFuncao(false);
    resetFuncaoForm();
  }

  function abrirNovaFuncao(grupoId: number) {
    setFuncaoForm({ nome: "", descricao: "", ativo: true });
    setFuncaoEditingId(null);
    setFuncaoFormOpenFor(grupoId);
  }

  function abrirEdicaoFuncao(funcao: Funcao) {
    if (!funcao.grupo_id) return;
    setFuncaoEditingId(funcao.id);
    setFuncaoForm({
      nome: funcao.nome ?? "",
      descricao: funcao.descricao ?? "",
      ativo: funcao.ativo ?? true,
    });
    setFuncaoFormOpenFor(funcao.grupo_id);
  }

  async function alternarFuncao(funcao: Funcao) {
    await supabase.from("funcoes_colaborador").update({ ativo: !(funcao.ativo ?? true) }).eq("id", funcao.id);
    await refresh();
  }

  async function removerFuncao(funcao: Funcao) {
    if (!window.confirm(`Remover a função "${funcao.nome}"?`)) return;
    await supabase.from("funcoes_colaborador").delete().eq("id", funcao.id);
    await refresh();
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {grupoFormVisible && (
          <FormCard title={editingGrupo ? "Editar grupo de função" : "Cadastrar novo grupo"} description="Preencha os dados do grupo.">
            <form onSubmit={salvarGrupo} className="mt-2 grid gap-3 md:grid-cols-2">
              <FormInput
                className="md:col-span-2"
                label="Nome do grupo"
                required
                value={grupoForm.nome}
                onChange={(e) => setGrupoForm({ ...grupoForm, nome: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={grupoForm.pode_lecionar}
                  onChange={(e) => setGrupoForm({ ...grupoForm, pode_lecionar: e.target.checked })}
                />
                <span className="text-sm text-slate-700">Pode lecionar</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={grupoForm.ativo}
                  onChange={(e) => setGrupoForm({ ...grupoForm, ativo: e.target.checked })}
                />
                <span className="text-sm text-slate-700">Situação: {grupoForm.ativo ? "Ativo" : "Inativo"}</span>
              </div>
              <FormInput
                className="md:col-span-2"
                label="Descrição"
                as="textarea"
                rows={3}
                value={grupoForm.descricao}
                onChange={(e) => setGrupoForm({ ...grupoForm, descricao: e.target.value })}
              />
              <div className="md:col-span-2 flex gap-2">
                <PrimaryButton type="submit" disabled={savingGrupo}>
                  {editingGrupo ? "Salvar grupo" : "Adicionar grupo"}
                </PrimaryButton>
                <PrimaryButton type="button" variant="outline" onClick={resetGrupoForm}>
                  Cancelar
                </PrimaryButton>
              </div>
            </form>
          </FormCard>
        )}

        {funcaoFormOpenFor && (
          <FormCard title={funcaoEditingId ? "Editar função" : "Cadastrar nova função"} description="Preencha os dados da função.">
            <form onSubmit={salvarFuncao} className="mt-2 grid gap-3 md:grid-cols-2">
              <FormInput
                className="md:col-span-2"
                label="Nome da função"
                required
                value={funcaoForm.nome}
                onChange={(e) => setFuncaoForm({ ...funcaoForm, nome: e.target.value })}
              />
              <FormInput
                className="md:col-span-2"
                label="Descrição"
                as="textarea"
                rows={3}
                value={funcaoForm.descricao}
                onChange={(e) => setFuncaoForm({ ...funcaoForm, descricao: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={funcaoForm.ativo}
                  onChange={(e) => setFuncaoForm({ ...funcaoForm, ativo: e.target.checked })}
                />
                <span className="text-sm text-slate-700">Situação: {funcaoForm.ativo ? "Ativo" : "Inativo"}</span>
              </div>
              <div className="md:col-span-2 flex gap-2">
                <PrimaryButton type="submit" disabled={savingFuncao}>
                  {funcaoEditingId ? "Salvar função" : "Adicionar função"}
                </PrimaryButton>
                <PrimaryButton type="button" variant="outline" onClick={resetFuncaoForm}>
                  Cancelar
                </PrimaryButton>
              </div>
            </form>
          </FormCard>
        )}

        <FormCard
          title="Tipos de função"
          description="Configure aqui os tipos de função que podem ser atribuídos aos colaboradores da escola."
          actions={
            <div className="flex items-center gap-2">
              <PrimaryButton variant="outline" onClick={() => setEditMode((v) => !v)}>
                {editMode ? "Concluir edição" : "Editar"}
              </PrimaryButton>
              {editMode && (
                <PrimaryButton
                  onClick={() => {
                    setGrupoForm({ nome: "", pode_lecionar: false, descricao: "", ativo: true });
                    setGrupoFormVisible(true);
                    setEditingGrupo(null);
                  }}
                  icon="+"
                >
                  Novo grupo
                </PrimaryButton>
              )}
            </div>
          }
        >
          {loading ? (
            <div className="text-sm text-slate-600">Carregando...</div>
          ) : gruposOrdenados.length === 0 ? (
            <div className="text-sm text-slate-600">Nenhum grupo cadastrado.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {gruposOrdenados.map((grupo) => {
                const listaFuncoes = funcoesPorGrupo[grupo.id] ?? [];
                const ativo = grupo.ativo ?? true;
                return (
                  <div key={grupo.id} className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div
                        className={editMode ? "cursor-pointer" : ""}
                        onClick={() => {
                          if (editMode) abrirEdicaoGrupo(grupo);
                        }}
                      >
                        <div className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                          {grupo.nome || "Sem nome"}
                          {!ativo && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Inativo</span>}
                          {grupo.pode_lecionar ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Pode lecionar</span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Não leciona</span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600">{grupo.descricao || "Sem descrição"}</div>
                      </div>
                      {editMode && (
                        <div className="flex flex-wrap gap-2 justify-end">
                          <PrimaryButton variant="outline" onClick={() => abrirEdicaoGrupo(grupo)}>
                            Editar grupo
                          </PrimaryButton>
                          <PrimaryButton variant="outline" onClick={() => alternarGrupo(grupo)}>
                            {ativo ? "Inativar" : "Ativar"}
                          </PrimaryButton>
                          <PrimaryButton variant="outline" onClick={() => abrirNovaFuncao(grupo.id)}>
                            + Nova função
                          </PrimaryButton>
                          <PrimaryButton variant="outline" onClick={() => removerGrupo(grupo)}>
                            Remover grupo
                          </PrimaryButton>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      {listaFuncoes.length === 0 && (
                        <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">Nenhuma função neste grupo.</div>
                      )}

                      {listaFuncoes.map((funcao) => {
                        const funcAtiva = funcao.ativo ?? true;
                        return (
                          <div
                            key={funcao.id}
                            className={`rounded-md bg-slate-50 p-3 shadow-sm border border-slate-100 ${
                              editMode ? "cursor-pointer hover:border-violet-200" : ""
                            }`}
                            onClick={() => {
                              if (editMode) abrirEdicaoFuncao(funcao);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-semibold text-slate-900">{funcao.nome || "Função sem nome"}</div>
                                <div className="text-xs text-slate-600">{funcao.descricao || "Sem descrição"}</div>
                                {!funcAtiva && <div className="text-xs text-slate-500 mt-1">Inativa</div>}
                              </div>
                              {editMode && (
                                <div className="space-x-2">
                                  <PrimaryButton variant="outline" onClick={() => abrirEdicaoFuncao(funcao)}>
                                    Editar
                                  </PrimaryButton>
                                  <PrimaryButton variant="outline" onClick={() => alternarFuncao(funcao)}>
                                    {funcAtiva ? "Inativar" : "Ativar"}
                                  </PrimaryButton>
                                  <PrimaryButton variant="outline" onClick={() => removerFuncao(funcao)}>
                                    Remover
                                  </PrimaryButton>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </FormCard>
      </div>
    </div>
  );
}
