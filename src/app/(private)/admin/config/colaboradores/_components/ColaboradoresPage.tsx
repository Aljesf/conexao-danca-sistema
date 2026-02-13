"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";

type Pessoa = { id: number; nome: string | null };
type TipoVinculo = { id: number; nome: string | null; codigo: string | null; ativo: boolean | null };
type Colaborador = {
  id: number;
  pessoa_id: number | null;
  centro_custo_id: number | null;
  tipo_vinculo_id: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  observacoes: string | null;
  ativo: boolean | null;
};
type FuncaoGrupo = { id: number; nome: string | null; pode_lecionar: boolean | null; ativo: boolean | null };
type Funcao = { id: number; nome: string | null; grupo_id: number | null; descricao: string | null; ativo: boolean | null };
type ColaboradorFuncao = { id: number; colaborador_id: number; funcao_id: number; ativo: boolean | null; principal: boolean | null };

type ComboboxItem = { id: number; label: string };

function TextCombobox({
  label,
  items,
  value,
  onChange,
  placeholder = "Digite para buscar",
}: {
  label: string;
  items: ComboboxItem[];
  value: number | null;
  onChange: (id: number | null) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const selected = useMemo(() => items.find((i) => i.id === value)?.label ?? "", [items, value]);
  const filtered = useMemo(() => {
    const q = text.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(q));
  }, [items, text]);

  return (
    <div className="relative">
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      <input
        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
        value={open ? text : selected || text}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
      />
      {open && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow">
          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-slate-600">Nenhum resultado</div>}
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-start px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(item.id);
                setText(item.label);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function useSupabaseData() {
  const supabase = getSupabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [tipos, setTipos] = useState<TipoVinculo[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [funcoesGrupos, setFuncoesGrupos] = useState<FuncaoGrupo[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [colabFuncoes, setColabFuncoes] = useState<ColaboradorFuncao[]>([]);

  async function load() {
    setLoading(true);

    const [pessoasRes, tiposRes, funcoesRes, funcoesGrupoRes, colaboradoresRes, colabFuncoesRes] = await Promise.all([
      supabase.from("pessoas").select("id,nome"),
      supabase.from("tipos_vinculo_colaborador").select("id,nome,codigo,ativo"),
      supabase.from("funcoes_colaborador").select("id,nome,grupo_id,descricao,ativo"),
      supabase.from("funcoes_grupo").select("id,nome,pode_lecionar,ativo"),
      supabase
        .from("colaboradores")
        .select("id,pessoa_id,centro_custo_id,tipo_vinculo_id,data_inicio,data_fim,observacoes,ativo"),
      supabase.from("colaborador_funcoes").select("id,colaborador_id,funcao_id,ativo,principal"),
    ]);

    setPessoas(pessoasRes.data ?? []);
    setTipos(tiposRes.data ?? []);
    setFuncoes(funcoesRes.data ?? []);
    setFuncoesGrupos(funcoesGrupoRes.data ?? []);
    setColaboradores(colaboradoresRes.data ?? []);
    setColabFuncoes(colabFuncoesRes.data ?? []);
    setLoading(false);
  }

  async function refreshColaboradores() {
    const { data } = await supabase
      .from("colaboradores")
      .select("id,pessoa_id,centro_custo_id,tipo_vinculo_id,data_inicio,data_fim,observacoes,ativo");
    setColaboradores(data ?? []);
  }

  async function refreshFuncoes() {
    const [{ data: rels }, { data: funcs }] = await Promise.all([
      supabase.from("colaborador_funcoes").select("id,colaborador_id,funcao_id,ativo,principal"),
      supabase.from("funcoes_colaborador").select("id,nome,grupo_id,descricao,ativo"),
    ]);
    setColabFuncoes(rels ?? []);
    setFuncoes(funcs ?? []);
  }

  return {
    supabase,
    loading,
    pessoas,
    tipos,
    funcoes,
    funcoesGrupos,
    colaboradores,
    colabFuncoes,
    load,
    refreshColaboradores,
    refreshFuncoes,
  };
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().slice(0, 10);
}

function ColaboradoresPage() {
  const { supabase, loading, load, pessoas, tipos, funcoes, funcoesGrupos, colaboradores, colabFuncoes, refreshColaboradores, refreshFuncoes } =
    useSupabaseData();

  const [filters, setFilters] = useState({ tipo: "all", status: "ativos" });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    pessoa_id: null as number | null,
    tipo_vinculo_id: null as number | null,
    data_inicio: "",
    data_fim: "",
    observacoes: "",
    ativo: true,
  });
  const [selectedFuncoes, setSelectedFuncoes] = useState<number[]>([]);
  const [principalFuncaoId, setPrincipalFuncaoId] = useState<number | null>(null);

  useEffect(() => {
    void load();
  }, []);

  const pessoasOptions: ComboboxItem[] = useMemo(
    () => pessoas.map((p) => ({ id: p.id, label: p.nome || "Sem nome" })),
    [pessoas]
  );

  const funcoesGruposMap = useMemo(() => {
    const map = new Map<number, FuncaoGrupo>();
    funcoesGrupos.forEach((g) => {
      map.set(g.id, g);
    });
    return map;
  }, [funcoesGrupos]);

  const funcoesAgrupadas = useMemo(() => {
    const ativos = funcoes.filter((f) => f.ativo ?? true);
    const gruposMap: Record<string, { grupoId: number | null; grupoNome: string; lista: Funcao[] }> = {};

    ativos.forEach((f) => {
      const g = f.grupo_id ? funcoesGruposMap.get(f.grupo_id) : null;
      const key = f.grupo_id ? String(f.grupo_id) : "sem-grupo";
      if (!gruposMap[key]) {
        gruposMap[key] = {
          grupoId: f.grupo_id,
          grupoNome: g?.nome || "Sem grupo",
          lista: [],
        };
      }
      gruposMap[key].lista.push(f);
    });

    return Object.values(gruposMap).sort((a, b) => a.grupoNome.localeCompare(b.grupoNome)).map((grp) => ({
      ...grp,
      lista: grp.lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || "")),
    }));
  }, [funcoes, funcoesGruposMap]);

  const colaboradoresFiltrados = useMemo(() => {
    return colaboradores.filter((c) => {
      if (filters.status === "ativos" && !c.ativo) return false;
      if (filters.tipo !== "all" && c.tipo_vinculo_id !== Number(filters.tipo)) return false;
      return true;
    });
  }, [colaboradores, filters]);

  function resetForm() {
    setEditingId(null);
    setForm({
      pessoa_id: null,
      tipo_vinculo_id: null,
      data_inicio: "",
      data_fim: "",
      observacoes: "",
      ativo: true,
    });
    setSelectedFuncoes([]);
    setPrincipalFuncaoId(null);
  }

  function openCreateModal() {
    resetForm();
    setShowModal(true);
  }

  function openEditModal(colab: Colaborador) {
    setEditingId(colab.id);
    setForm({
      pessoa_id: colab.pessoa_id,
      tipo_vinculo_id: colab.tipo_vinculo_id,
      data_inicio: formatDate(colab.data_inicio),
      data_fim: formatDate(colab.data_fim),
      observacoes: colab.observacoes || "",
      ativo: colab.ativo ?? true,
    });

    const rels = colabFuncoes.filter((r) => r.colaborador_id === colab.id);
    const ativos = rels.filter((r) => r.ativo).map((r) => r.funcao_id);
    const principal = rels.find((r) => r.principal)?.funcao_id ?? null;

    setSelectedFuncoes(ativos);
    setPrincipalFuncaoId(principal && ativos.includes(principal) ? principal : ativos[0] ?? null);
    setShowModal(true);
  }

  function toggleFuncaoSelecionada(funcaoId: number) {
    setSelectedFuncoes((prev) => {
      const set = new Set(prev);
      if (set.has(funcaoId)) {
        set.delete(funcaoId);
        if (principalFuncaoId === funcaoId) {
          const remaining = Array.from(set);
          setPrincipalFuncaoId(remaining[0] ?? null);
        }
      } else {
        set.add(funcaoId);
        if (!principalFuncaoId) setPrincipalFuncaoId(funcaoId);
      }
      return Array.from(set);
    });
  }

  function funcoesTexto(colabId: number) {
    return colabFuncoes
      .filter((f) => f.colaborador_id === colabId && f.ativo)
      .map((rel) => funcoes.find((fn) => fn.id === rel.funcao_id)?.nome)
      .filter(Boolean)
      .join("; ");
  }

  function isProfessor(colabId: number) {
    return colabFuncoes.some((rel) => {
      if (!rel.ativo) return false;
      const func = funcoes.find((fn) => fn.id === rel.funcao_id);
      if (!func || !func.grupo_id) return false;
      const grupo = funcoesGruposMap.get(func.grupo_id);
      return grupo?.pode_lecionar ?? false;
    });
  }

  async function persistFuncoes(colabId: number, targetPrincipal: number | null) {
    const current = colabFuncoes.filter((r) => r.colaborador_id === colabId);
    const selectedSet = new Set(selectedFuncoes);
    const desiredPrincipal = targetPrincipal && selectedSet.has(targetPrincipal) ? targetPrincipal : selectedFuncoes[0] ?? null;

    const updates = current.map((rel) => {
      const shouldBeActive = selectedSet.has(rel.funcao_id);
      const desired = { ativo: shouldBeActive, principal: desiredPrincipal === rel.funcao_id };
      selectedSet.delete(rel.funcao_id);
      return supabase.from("colaborador_funcoes").update(desired).eq("id", rel.id);
    });

    const inserts: { colaborador_id: number; funcao_id: number; ativo: boolean; principal: boolean }[] = [];
    selectedSet.forEach((funcId) => {
      inserts.push({
        colaborador_id: colabId,
        funcao_id: funcId,
        ativo: true,
        principal: desiredPrincipal === funcId,
      });
    });

    if (inserts.length > 0) {
      updates.push(supabase.from("colaborador_funcoes").insert(inserts));
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      await refreshFuncoes();
    }
  }

  async function saveColaborador(e: FormEvent) {
    e.preventDefault();
    if (!form.pessoa_id) return;
    setSaving(true);

    let colabId = editingId;
    const payload = {
      pessoa_id: form.pessoa_id,
      // Centro de custo não é mais atribuído diretamente ao colaborador.
      // A origem financeira é definida no modelo de pagamento.
      centro_custo_id: null,
      tipo_vinculo_id: form.tipo_vinculo_id,
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      observacoes: form.observacoes || null,
      ativo: form.ativo,
    };

    if (editingId) {
      await supabase.from("colaboradores").update(payload).eq("id", editingId);
    } else {
      const { data, error } = await supabase.from("colaboradores").insert(payload).select("id").single();
      if (error || !data) {
        setSaving(false);
        return;
      }
      colabId = data.id;
    }

    if (colabId) {
      await persistFuncoes(colabId, principalFuncaoId);
    }

    await refreshColaboradores();
    await refreshFuncoes();

    setSaving(false);
    setShowModal(false);
    resetForm();
  }

  async function toggleAtivo(colabId: number, ativo: boolean | null) {
    await supabase.from("colaboradores").update({ ativo: !ativo }).eq("id", colabId);
    await refreshColaboradores();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Gestão de colaboradores</h1>
              <p className="text-sm text-slate-600">
                Central para cadastro e funções dos colaboradores da escola, loja e café.
              </p>
            </div>
            <button
              className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
              onClick={openCreateModal}
            >
              Adicionar colaborador
            </button>
          </div>
        </div>

        <FinanceHelpCard
          subtitle="Entenda esta tela"
          items={[
            "Todo colaborador está ligado a uma pessoa do cadastro geral.",
            "Tipos de vínculo definem se o colaborador é CLT, autônomo, convidado, etc.",
            "Funções definem se o colaborador é professor, administrativo ou apoio.",
          ]}
        />

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Colaboradores cadastrados</h3>
              <p className="text-sm text-slate-600">Clique em editar para abrir o formulário.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <select
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filters.tipo}
                onChange={(e) => setFilters((f) => ({ ...f, tipo: e.target.value }))}
              >
                <option value="all">Todos os vínculos</option>
                {tipos
                  .filter((t) => t.ativo)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
              </select>
              <select
                className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              >
                <option value="ativos">Ativos</option>
                <option value="todos">Todos</option>
              </select>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Nome</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Tipo de vínculo</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Funções</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Professor?</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Ativo</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-3 py-3 text-sm text-slate-600">
                      Carregando...
                    </td>
                  </tr>
                )}
                {!loading && colaboradoresFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-3 text-sm text-slate-600">
                      Nenhum colaborador encontrado.
                    </td>
                  </tr>
                )}
                {!loading &&
                  colaboradoresFiltrados.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-800">{pessoas.find((p) => p.id === c.pessoa_id)?.nome}</td>
                      <td className="px-3 py-2 text-slate-700">{tipos.find((t) => t.id === c.tipo_vinculo_id)?.nome}</td>
                      <td className="px-3 py-2 text-slate-700">{funcoesTexto(c.id) || "-"}</td>
                      <td className="px-3 py-2 text-slate-700">{isProfessor(c.id) ? "Sim" : "Não"}</td>
                      <td className="px-3 py-2 text-slate-700">{c.ativo ? "Sim" : "Não"}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                            href={`/admin/config/colaboradores/${c.id}`}
                          >
                            Abrir
                          </Link>
                          <button
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                            onClick={() => openEditModal(c)}
                          >
                            Editar
                          </button>
                          <button
                            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                            onClick={() => toggleAtivo(c.id, c.ativo)}
                          >
                            {c.ativo ? "Desativar" : "Ativar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingId ? "Editar colaborador" : "Novo colaborador"}
                </h3>
                <p className="text-sm text-slate-600">Inclua os dados e as funções no mesmo fluxo.</p>
              </div>
              <button className="text-sm text-slate-600" onClick={() => setShowModal(false)}>
                Fechar
              </button>
            </div>

            <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={saveColaborador}>
              <div className="space-y-3">
                <TextCombobox
                  label="Pessoa"
                  items={pessoasOptions}
                  value={form.pessoa_id}
                  onChange={(id) => setForm((f) => ({ ...f, pessoa_id: id }))}
                  placeholder="Selecione a pessoa"
                />


                <label className="text-sm font-semibold text-slate-700">
                  Tipo de vínculo
                  <select
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                    value={form.tipo_vinculo_id ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, tipo_vinculo_id: e.target.value ? Number(e.target.value) : null }))}
                  >
                    <option value="">Selecione</option>
                    {tipos
                      .filter((t) => t.ativo)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome}
                        </option>
                      ))}
                  </select>
                </label>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Data início
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                      value={form.data_inicio}
                      onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))}
                    />
                  </label>
                  <label className="text-sm font-semibold text-slate-700">
                    Data fim
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                      value={form.data_fim}
                      onChange={(e) => setForm((f) => ({ ...f, data_fim: e.target.value }))}
                    />
                  </label>
                </div>

                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.ativo}
                    onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                  />
                  Ativo
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Observações
                  <textarea
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                    rows={4}
                    value={form.observacoes}
                    onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  />
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Funções do colaborador</div>
                  <div className="text-xs text-slate-600">Selecione funções e marque uma como principal, se quiser.</div>
                </div>

                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {funcoesAgrupadas.map((grupo) => (
                    <div key={grupo.grupoId ?? "sem-grupo"} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="text-sm font-semibold text-slate-800">{grupo.grupoNome}</div>
                      <div className="mt-2 space-y-2">
                        {grupo.lista.map((f) => {
                          const checked = selectedFuncoes.includes(f.id);
                          const grupoPodeLecionar = f.grupo_id ? funcoesGruposMap.get(f.grupo_id)?.pode_lecionar : false;
                          return (
                            <div key={f.id} className="rounded border border-slate-200 bg-white px-3 py-2">
                              <label className="flex items-start gap-2 text-sm text-slate-800">
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4"
                                  checked={checked}
                                  onChange={() => toggleFuncaoSelecionada(f.id)}
                                />
                                <div>
                                  <div className="font-semibold">{f.nome || "Função"}</div>
                                  <div className="text-xs text-slate-600">{f.descricao || "Sem descrição"}</div>
                                  {grupoPodeLecionar && <div className="text-xs text-emerald-700">Permite lecionar</div>}
                                </div>
                              </label>
                              {checked && (
                                <label className="mt-2 flex items-center gap-2 text-xs text-slate-700">
                                  <input
                                    type="radio"
                                    name="principal"
                                    checked={principalFuncaoId === f.id}
                                    onChange={() => setPrincipalFuncaoId(f.id)}
                                  />
                                  Marcar como principal
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {funcoesAgrupadas.length === 0 && (
                    <div className="rounded border border-slate-200 bg-white p-3 text-sm text-slate-600">
                      Nenhuma função ativa cadastrada.
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
                >
                  {editingId ? "Salvar alterações" : "Salvar colaborador"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return <ColaboradoresPage />;
}




