"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { FinanceHelpCard } from "@/components/FinanceHelpCard";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type Pessoa = { id: number; nome: string | null };
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
type FuncaoColaborador = { id: number; nome: string | null; grupo_id: number | null; descricao: string | null; ativo: boolean | null };
type ColaboradorFuncao = { id: number; colaborador_id: number; funcao_id: number; ativo: boolean | null; principal: boolean | null };
type TipoProfessor = { id: number; nome: string | null; ativo?: boolean | null };
type Professor = { id: number; colaborador_id: number; tipo_professor_id: number | null; bio: string | null; ativo: boolean | null };

type ProfessorListaItem = { colaboradorId: number; nome: string; tipo: string; ativo: boolean };

function useSupabaseData() {
  const supabase = getSupabaseBrowser();
  const [loading, setLoading] = useState(true);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [funcoes, setFuncoes] = useState<FuncaoColaborador[]>([]);
  const [funcoesGrupos, setFuncoesGrupos] = useState<FuncaoGrupo[]>([]);
  const [colabFuncoes, setColabFuncoes] = useState<ColaboradorFuncao[]>([]);
  const [tiposProfessor, setTiposProfessor] = useState<TipoProfessor[]>([]);
  const [professores, setProfessores] = useState<Professor[]>([]);

  async function load() {
    setLoading(true);
    const [pessoasRes, colaboradoresRes, funcoesRes, gruposRes, colabFuncoesRes, tiposProfessorRes, professoresRes] =
      await Promise.all([
        supabase.from("pessoas").select("id,nome").order("nome", { ascending: true }),
        supabase
          .from("colaboradores")
          .select("id,pessoa_id,centro_custo_id,tipo_vinculo_id,data_inicio,data_fim,observacoes,ativo"),
        supabase.from("funcoes_colaborador").select("id,nome,grupo_id,descricao,ativo"),
        supabase.from("funcoes_grupo").select("id,nome,pode_lecionar,ativo"),
        supabase.from("colaborador_funcoes").select("id,colaborador_id,funcao_id,ativo,principal"),
        supabase.from("tipos_professor").select("id,nome,ativo"),
        supabase.from("professores").select("id,colaborador_id,tipo_professor_id,bio,ativo"),
      ]);

    setPessoas(pessoasRes.data ?? []);
    setColaboradores(colaboradoresRes.data ?? []);
    setFuncoes(funcoesRes.data ?? []);
    setFuncoesGrupos(gruposRes.data ?? []);
    setColabFuncoes(colabFuncoesRes.data ?? []);
    setTiposProfessor(tiposProfessorRes.data ?? []);
    setProfessores(professoresRes.data ?? []);
    setLoading(false);
  }

  async function refreshProfessores() {
    const { data } = await supabase.from("professores").select("id,colaborador_id,tipo_professor_id,bio,ativo");
    setProfessores(data ?? []);
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
    colaboradores,
    funcoes,
    funcoesGrupos,
    colabFuncoes,
    tiposProfessor,
    professores,
    load,
    refreshProfessores,
    refreshColaboradores,
    refreshFuncoes,
  };
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().slice(0, 10);
}

function avatarUrl(nome: string | null | undefined) {
  const safe = (nome || "Professor").trim().replace(/\s+/g, "+");
  return `https://ui-avatars.com/api/?name=${safe}&background=7c3aed&color=fff&bold=true`;
}

function ProfessoresPage() {
  const {
    supabase,
    loading,
    pessoas,
    colaboradores,
    funcoes,
    funcoesGrupos,
    colabFuncoes,
    tiposProfessor,
    professores,
    load,
    refreshProfessores,
    refreshColaboradores,
    refreshFuncoes,
  } = useSupabaseData();

  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [profForm, setProfForm] = useState({ tipo_professor_id: null as number | null, ativo: true, bio: "" });
  const [datasColab, setDatasColab] = useState({ data_inicio: "", data_fim: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  const pessoasMap = useMemo(() => new Map(pessoas.map((p) => [p.id, p])), [pessoas]);
  const funcoesMap = useMemo(() => new Map(funcoes.map((f) => [f.id, f])), [funcoes]);
  const gruposMap = useMemo(() => new Map(funcoesGrupos.map((g) => [g.id, g])), [funcoesGrupos]);
  const tiposProfessorMap = useMemo(() => new Map(tiposProfessor.map((t) => [t.id, t])), [tiposProfessor]);

  const colaboradoresQueLecionam = useMemo(() => {
    const set = new Set<number>();
    colabFuncoes.forEach((rel) => {
      if (!rel.ativo) return;
      const func = funcoesMap.get(rel.funcao_id);
      if (!func || !(func.ativo ?? true)) return;
      if (!func.grupo_id) return;
      const grupo = gruposMap.get(func.grupo_id);
      if (grupo?.pode_lecionar) set.add(rel.colaborador_id);
    });
    return set;
  }, [colabFuncoes, funcoesMap, gruposMap]);

  const professoresLista: ProfessorListaItem[] = useMemo(() => {
    return colaboradores
      .filter((c) => colaboradoresQueLecionam.has(c.id))
      .map((c) => {
        const pessoa = pessoasMap.get(c.pessoa_id ?? -1);
        const prof = professores.find((p) => p.colaborador_id === c.id);
        const tipo = prof?.tipo_professor_id ? tiposProfessorMap.get(prof.tipo_professor_id)?.nome || "Não definido" : "Não definido";
        const ativo = prof?.ativo ?? true;
        return {
          colaboradorId: c.id,
          nome: pessoa?.nome || "Sem nome",
          tipo,
          ativo,
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [colaboradores, colaboradoresQueLecionam, pessoasMap, professores, tiposProfessorMap]);

  const colabSelecionado = useMemo(() => colaboradores.find((c) => c.id === selecionado) || null, [colaboradores, selecionado]);
  const profSelecionado = useMemo(() => professores.find((p) => p.colaborador_id === selecionado) || null, [professores, selecionado]);

  useEffect(() => {
    if (selecionado === null && professoresLista.length) {
      setSelecionado(professoresLista[0].colaboradorId);
    }
  }, [professoresLista, selecionado]);

  useEffect(() => {
    if (!colabSelecionado) return;
    setDatasColab({
      data_inicio: formatDate(colabSelecionado.data_inicio),
      data_fim: formatDate(colabSelecionado.data_fim),
    });
    setProfForm({
      tipo_professor_id: profSelecionado?.tipo_professor_id ?? null,
      ativo: profSelecionado?.ativo ?? true,
      bio: profSelecionado?.bio ?? "",
    });
  }, [colabSelecionado, profSelecionado]);

  async function salvarProfessor(e: FormEvent) {
    e.preventDefault();
    if (!colabSelecionado) return;
    setSaving(true);

    if (profSelecionado) {
      await supabase
        .from("professores")
        .update({
          tipo_professor_id: profForm.tipo_professor_id,
          bio: profForm.bio,
          ativo: profForm.ativo,
        })
        .eq("id", profSelecionado.id);
    } else {
      await supabase.from("professores").insert({
        colaborador_id: colabSelecionado.id,
        tipo_professor_id: profForm.tipo_professor_id,
        bio: profForm.bio,
        ativo: profForm.ativo,
      });
    }

    await supabase
      .from("colaboradores")
      .update({ data_inicio: datasColab.data_inicio || null, data_fim: datasColab.data_fim || null })
      .eq("id", colabSelecionado.id);

    await Promise.all([refreshProfessores(), refreshColaboradores()]);
    setSaving(false);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-800">Professores</h1>
          <p className="text-sm text-slate-600">Lista e detalhes dos professores vinculados à escola.</p>
        </div>

        <FinanceHelpCard
          subtitle="Entenda esta tela"
          items={[
            "Esta tela mostra apenas colaboradores com função de professor (grupos que podem lecionar).",
            "Aqui você define o tipo de professor e gerencia a bio.",
            "As turmas vinculadas serão exibidas aqui futuramente.",
          ]}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800">Professores cadastrados</h3>
            <p className="text-sm text-slate-600">Selecione um professor para ver detalhes.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Nome</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Tipo</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-sm text-slate-600">
                        Carregando...
                      </td>
                    </tr>
                  )}
                  {!loading && professoresLista.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-sm text-slate-600">
                        Nenhum professor encontrado. Cadastre funções com grupos que podem lecionar para colaboradores.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    professoresLista.map((item) => (
                      <tr
                        key={item.colaboradorId}
                        className={`cursor-pointer hover:bg-slate-50 ${selecionado === item.colaboradorId ? "bg-purple-50" : ""}`}
                        onClick={() => setSelecionado(item.colaboradorId)}
                      >
                        <td className="px-3 py-2 text-slate-800">{item.nome}</td>
                        <td className="px-3 py-2 text-slate-700">{item.tipo}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              item.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {item.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">Dados do professor</h3>
              {selecionado && colabSelecionado ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <p className="text-sm text-slate-500">Nome</p>
                    <p className="text-base font-semibold text-slate-800">
                      {pessoasMap.get(colabSelecionado.pessoa_id ?? -1)?.nome || "-"}
                    </p>
                  </div>
                  <label className="text-sm text-slate-700">
                    Tipo de professor
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                      value={profForm.tipo_professor_id ?? ""}
                      onChange={(e) =>
                        setProfForm((prev) => ({
                          ...prev,
                          tipo_professor_id: e.target.value ? Number(e.target.value) : null,
                          ativo: true,
                        }))
                      }
                    >
                      <option value="">Não definido</option>
                      {tiposProfessor
                        .filter((t) => t.ativo ?? true)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nome}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={profForm.ativo}
                      onChange={(e) => setProfForm((prev) => ({ ...prev, ativo: e.target.checked }))}
                    />
                    Ativo
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-slate-700">
                      Data início (colaborador)
                      <input
                        type="date"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                        value={datasColab.data_inicio}
                        onChange={(e) => setDatasColab((prev) => ({ ...prev, data_inicio: e.target.value }))}
                      />
                    </label>
                    <label className="text-sm text-slate-700">
                      Data saída (colaborador)
                      <input
                        type="date"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                        value={datasColab.data_fim}
                        onChange={(e) => setDatasColab((prev) => ({ ...prev, data_fim: e.target.value }))}
                      />
                    </label>
                  </div>
                  <form onSubmit={salvarProfessor} className="space-y-2">
                    <label className="text-sm text-slate-700">
                      Bio / Notas internas
                      <textarea
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                        rows={4}
                        value={profForm.bio}
                        onChange={(e) => setProfForm((prev) => ({ ...prev, bio: e.target.value }))}
                        placeholder="Resumo do professor, experiência, enfoque pedagógico..."
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow disabled:opacity-60"
                    >
                      Salvar bio
                    </button>
                  </form>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Selecione um professor para ver os detalhes.</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">Turmas deste professor</h3>
              <p className="mt-2 text-sm text-slate-600">
                Aqui serão exibidas todas as turmas às quais este professor está vinculado.
                <br />
                Essa informação virá da relação entre turmas e professores (turma_professores), que será implementada em etapa futura.
              </p>
              <p className="mt-2 text-xs text-slate-500">TODO: Integrar com turmas → tabela turma_professores.</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800">Visualização (currículo)</h3>
              {selecionado && colabSelecionado ? (
                <div className="mt-3 space-y-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={avatarUrl(pessoasMap.get(colabSelecionado.pessoa_id ?? -1)?.nome)}
                      alt="Foto do professor"
                      className="h-16 w-16 rounded-full border border-slate-200 shadow-sm"
                    />
                    <div className="space-y-1">
                      <div className="text-lg font-semibold text-slate-900">
                        {pessoasMap.get(colabSelecionado.pessoa_id ?? -1)?.nome || "Sem nome"}
                      </div>
                      <div className="text-sm text-slate-600">
                        {profForm.tipo_professor_id ? tiposProfessorMap.get(profForm.tipo_professor_id)?.nome || "Tipo não definido" : "Tipo não definido"}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className={`rounded-full px-3 py-1 font-semibold ${profForm.ativo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                          {profForm.ativo ? "Ativo" : "Inativo"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                          Início: {datasColab.data_inicio || "—"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                          Saída: {datasColab.data_fim || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                    <div className="text-sm font-semibold text-slate-800">Funções que permitem lecionar</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {colabFuncoes
                        .filter((r) => r.colaborador_id === colabSelecionado.id && r.ativo)
                        .map((rel) => funcoesMap.get(rel.funcao_id))
                        .filter((f): f is FuncaoColaborador => Boolean(f && f.grupo_id && (gruposMap.get(f.grupo_id)?.pode_lecionar ?? false)))
                        .map((f) => (
                          <span key={f.id} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                            {f.nome}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-slate-800">Bio</div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                      {profForm.bio?.trim() ? profForm.bio : "Sem bio cadastrada."}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Selecione um professor para visualizar o currículo.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfessoresPage;
