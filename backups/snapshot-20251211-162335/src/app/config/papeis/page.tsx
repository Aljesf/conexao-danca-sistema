// src/app/config/papeis/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type RoleRow = {
  id: string; // uuid no banco
  codigo: string;
  nome: string;
  descricao: string | null;
  permissoes: any | null;
  ativo: boolean | null;
};

type RoleFormState = {
  id?: string;
  codigo: string;
  nome: string;
  descricao: string;
  permissoesText: string;
  ativo: boolean;
};

export default function PapeisPage() {
  const supabase = getSupabaseBrowser();

  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingPermissao, setCheckingPermissao] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<RoleFormState>({
    codigo: "",
    nome: "",
    descricao: "",
    permissoesText: "", // começa vazio para não dar erro de JSON
    ativo: true,
  });

  const isEditando = !!form.id;

  useEffect(() => {
    async function init() {
      try {
        setCheckingPermissao(true);
        setLoading(true);
        setError(null);

        // 1) Verifica usuário logado
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData?.user) {
          setError("Você não está autenticado.");
          setCheckingPermissao(false);
          setLoading(false);
          return;
        }

        const userIdAtual = authData.user.id;

        // 2) Confirma se é admin
        const { data: perfil, error: perfilError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("user_id", userIdAtual)
          .single();

        if (perfilError || !perfil) {
          setError("Não foi possível carregar seu perfil de acesso.");
          setCheckingPermissao(false);
          setLoading(false);
          return;
        }

        if (!perfil.is_admin) {
          setSemPermissao(true);
          setCheckingPermissao(false);
          setLoading(false);
          return;
        }

        setCheckingPermissao(false);

        // 3) Carrega papéis
        const { data: rolesData, error: rolesError } = await supabase
          .from("roles_sistema")
          .select("id, codigo, nome, descricao, permissoes, ativo")
          .order("nome", { ascending: true });

        if (rolesError) {
          setError(rolesError.message || "Erro ao carregar papéis.");
          setLoading(false);
          return;
        }

        setRoles((rolesData || []) as RoleRow[]);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message ||
            "Erro inesperado ao carregar a lista de papéis do sistema."
        );
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function limparFormulario() {
    setForm({
      codigo: "",
      nome: "",
      descricao: "",
      permissoesText: "",
      ativo: true,
    });
  }

  function iniciarNovoPapel() {
    setError(null);
    limparFormulario();
  }

  function iniciarEdicao(role: RoleRow) {
    setError(null);
    setForm({
      id: role.id,
      codigo: role.codigo,
      nome: role.nome,
      descricao: role.descricao || "",
      permissoesText: role.permissoes
        ? JSON.stringify(role.permissoes, null, 2)
        : "",
      ativo: role.ativo ?? true,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.codigo.trim()) {
      setError("Informe um código interno para o papel.");
      return;
    }
    if (!form.nome.trim()) {
      setError("Informe o nome do papel.");
      return;
    }

    // Permissões: texto opcional em JSON
    let permissoesParsed: any = null;
    const texto = form.permissoesText.trim();

    if (texto) {
      try {
        permissoesParsed = JSON.parse(texto);
      } catch (err: any) {
        setError("O campo 'Permissões (JSON)' não é um JSON válido.");
        return;
      }
    }

    try {
      setSaving(true);

      if (isEditando && form.id) {
        // UPDATE
        const { data, error: updError } = await supabase
          .from("roles_sistema")
          .update({
            codigo: form.codigo.trim(),
            nome: form.nome.trim(),
            descricao: form.descricao.trim() || null,
            permissoes: permissoesParsed,
            ativo: form.ativo,
          })
          .eq("id", form.id)
          .select("id, codigo, nome, descricao, permissoes, ativo")
          .single();

        if (updError || !data) {
          setError(updError?.message || "Erro ao atualizar papel.");
          return;
        }

        setRoles((prev) =>
          prev.map((r) => (r.id === data.id ? (data as RoleRow) : r))
        );
      } else {
        // INSERT
        const { data, error: insError } = await supabase
          .from("roles_sistema")
          .insert({
            codigo: form.codigo.trim(),
            nome: form.nome.trim(),
            descricao: form.descricao.trim() || null,
            permissoes: permissoesParsed,
            ativo: form.ativo,
          })
          .select("id, codigo, nome, descricao, permissoes, ativo")
          .single();

        if (insError || !data) {
          setError(insError?.message || "Erro ao criar novo papel.");
          return;
        }

        setRoles((prev) => [...prev, data as RoleRow]);
        limparFormulario();
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Erro inesperado ao salvar papel.");
    } finally {
      setSaving(false);
    }
  }

  if (checkingPermissao) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-600">Verificando permissões...</p>
      </div>
    );
  }

  if (semPermissao) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Papéis &amp; Permissões</h1>
        <p className="text-sm text-red-600">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-semibold mb-1">Papéis &amp; Permissões</h1>
        <p className="text-sm text-gray-600">
          Nesta tela você visualiza os papéis do sistema, suas permissões
          associadas e pode cadastrar novos papéis de acesso.
        </p>
      </div>

      {/* Formulário de criação/edição */}
      <div className="bg-white/80 shadow rounded-xl p-4 space-y-4 max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {isEditando ? "Editar papel" : "Criar novo papel"}
            </h2>
            <p className="text-xs text-gray-500">
              Defina um código interno, um nome amigável e, se desejar, o JSON
              de permissões para este papel.
            </p>
          </div>
          <button
            type="button"
            onClick={iniciarNovoPapel}
            className="text-xs px-3 py-1 rounded-lg border hover:bg-gray-50"
          >
            Novo papel
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Código interno
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.codigo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, codigo: e.target.value }))
                }
                placeholder="ADMIN, PROFESSOR, ADM_FIN, AUDITOR..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Usado internamente para vincular o papel ao usuário.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                Nome do papel
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={form.nome}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nome: e.target.value }))
                }
                placeholder="Administrador do sistema, Professor, Administrativo..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.descricao}
              onChange={(e) =>
                setForm((f) => ({ ...f, descricao: e.target.value }))
              }
              placeholder="Resumo das responsabilidades deste papel."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[auto_max-content] gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Permissões (JSON)
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-xs font-mono"
                rows={10}
                value={form.permissoesText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, permissoesText: e.target.value }))
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Estrutura livre em JSON. Depois podemos padronizar por módulo
                (pessoas, alunos, financeiro, etc.). Por enquanto, serve como
                registro das permissões deste papel.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 pt-1">
              <label className="inline-flex items-center gap-2 text-sm mt-1">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={form.ativo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ativo: e.target.checked }))
                  }
                />
                <span>Papel ativo</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-60"
            >
              {saving
                ? isEditando
                  ? "Salvando alterações..."
                  : "Criando papel..."
                : isEditando
                ? "Salvar alterações"
                : "Criar papel"}
            </button>
            {isEditando && (
              <button
                type="button"
                onClick={iniciarNovoPapel}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de papéis existentes */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Papéis cadastrados</h2>

        {loading ? (
          <p className="text-sm text-gray-500">Carregando papéis...</p>
        ) : roles.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum papel cadastrado até o momento.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white/70 backdrop-blur shadow">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <th className="text-left px-4 py-2">Código</th>
                  <th className="text-left px-4 py-2">Nome</th>
                  <th className="text-left px-4 py-2">Descrição</th>
                  <th className="text-left px-4 py-2">Ativo</th>
                  <th className="text-left px-4 py-2">Permissões (resumo)</th>
                  <th className="text-right px-4 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => {
                  const resumo =
                    r.permissoes != null
                      ? JSON.stringify(r.permissoes)
                      : "";

                  const resumoCortado =
                    resumo.length > 120
                      ? resumo.slice(0, 120) + "..."
                      : resumo || "—";

                return (
                  <tr key={r.id} className="border-t hover:bg-purple-50/60">
                    <td className="px-4 py-2 align-middle whitespace-nowrap">
                      {r.codigo}
                    </td>
                    <td className="px-4 py-2 align-middle">{r.nome}</td>
                    <td className="px-4 py-2 align-middle">
                      {r.descricao || "—"}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      {r.ativo === false ? "Não" : "Sim"}
                    </td>
                    <td className="px-4 py-2 align-middle text-xs max-w-xs">
                      {resumoCortado}
                    </td>
                    <td className="px-4 py-2 align-middle text-right">
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(r)}
                        className="px-3 py-1 rounded-lg border text-xs hover:bg-gray-50"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
