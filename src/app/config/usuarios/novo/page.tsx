// src/app/config/usuarios/novo/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type PessoaOption = {
  id: number;
  nome: string;
  email: string | null;
};

type RoleOption = {
  id: string;
  codigo: string;
  nome: string;
};

export default function NovoUsuarioPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [pessoas, setPessoas] = useState<PessoaOption[]>([]);
  const [pessoaId, setPessoaId] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  // Papéis
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [rolesSelecionados, setRolesSelecionados] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingPermissao, setCheckingPermissao] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

        const userId = authData.user.id;

        // 2) Verifica se é admin
        const { data: meuProfile, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("user_id", userId)
          .single();

        if (profileError || !meuProfile) {
          setError("Não foi possível carregar seu perfil de acesso.");
          setCheckingPermissao(false);
          setLoading(false);
          return;
        }

        if (!meuProfile.is_admin) {
          setSemPermissao(true);
          setCheckingPermissao(false);
          setLoading(false);
          return;
        }

        setCheckingPermissao(false);

        // 3) Carrega pessoas
        const { data: pessoasData, error: pessoasError } = await supabase
          .from("pessoas")
          .select("id, nome, email")
          .order("nome", { ascending: true });

        if (pessoasError) {
          setError(pessoasError.message || "Erro ao carregar pessoas.");
          setLoading(false);
          return;
        }

        setPessoas((pessoasData || []) as PessoaOption[]);

        // 4) Carrega papéis (roles_sistema)
        const { data: rolesData, error: rolesError } = await supabase
          .from("roles_sistema")
          .select("id, codigo, nome")
          .order("nome", { ascending: true });

        if (rolesError) {
          setError(
            rolesError.message || "Erro ao carregar papéis de usuário."
          );
          setLoading(false);
          return;
        }

        setRoles((rolesData || []) as RoleOption[]);
      } catch (err: any) {
        setError(
          err?.message || "Erro inesperado ao preparar criação de usuário."
        );
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChangePessoa(idStr: string) {
    if (!idStr) {
      setPessoaId(null);
      return;
    }
    const id = Number(idStr);
    setPessoaId(id);

    const pessoa = pessoas.find((p) => p.id === id);
    if (pessoa && pessoa.email && pessoa.email.trim() !== "") {
      // só preenche o email se o campo ainda estiver vazio
      setEmail((prev) => (prev.trim() === "" ? pessoa.email || "" : prev));
    }
  }

  function toggleRole(roleId: string) {
    setRolesSelecionados((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!pessoaId) {
      setError("Selecione uma pessoa para vincular ao usuário.");
      return;
    }
    if (!email.trim()) {
      setError("Informe o e-mail de acesso do usuário.");
      return;
    }
    if (!senha.trim()) {
      setError("Informe uma senha provisória para o usuário.");
      return;
    }

    try {
      setSaving(true);

      // IMPORTANTE:
      // Esta rota deve ser criada em /app/api/usuarios/create-from-pessoa/route.ts
      // usando a Service Role Key (apenas no servidor).
      const res = await fetch("/api/usuarios/create-from-pessoa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pessoaId,
          email: email.trim(),
          senha: senha.trim(),
          roles: rolesSelecionados, // <--- papéis selecionados
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body?.error || "Erro ao criar usuário.");
        return;
      }

      setSuccessMessage("Usuário criado com sucesso.");
      // opcional: redirecionar após alguns segundos
      setTimeout(() => {
        router.push("/config/usuarios");
      }, 1200);
    } catch (err: any) {
      setError(err?.message || "Erro inesperado ao criar usuário.");
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
        <h1 className="text-2xl font-semibold mb-2">
          Criar novo usuário do sistema
        </h1>
        <p className="text-sm text-red-600">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">
          Criar novo usuário do sistema
        </h1>
        <p className="text-sm text-gray-600">
          Esta tela permite criar um novo acesso ao sistema para uma pessoa já
          cadastrada no Conexão Dança.
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {successMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white/70 backdrop-blur rounded-xl shadow p-4 space-y-4 max-w-xl"
      >
        <div>
          <label className="block text-sm font-medium mb-1">
            Pessoa vinculada
          </label>
          {loading ? (
            <p className="text-xs text-gray-500">Carregando pessoas...</p>
          ) : (
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={pessoaId ?? ""}
              onChange={(e) => handleChangePessoa(e.target.value)}
            >
              <option value="">Selecione uma pessoa...</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} (ID {p.id})
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Apenas pessoas já cadastradas podem receber acesso ao sistema.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            E-mail de acesso
          </label>
          <input
            type="email"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Senha provisória
          </label>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Defina uma senha inicial"
          />
          <p className="text-xs text-gray-500 mt-1">
            A senha poderá ser alterada depois pelo próprio usuário.
          </p>
        </div>

        {/* PAPÉIS DO USUÁRIO */}
        <div className="space-y-1">
          <span className="block text-sm font-medium">Papéis de acesso</span>
          {loading ? (
            <p className="text-xs text-gray-500">Carregando papéis...</p>
          ) : roles.length === 0 ? (
            <p className="text-xs text-gray-500">
              Nenhum papel configurado. Cadastre papéis em Configurações &gt;
              Papéis.
            </p>
          ) : (
            <div className="space-y-1">
              {roles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={rolesSelecionados.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                  <span>
                    <strong>{role.nome}</strong>{" "}
                    <span className="text-xs text-gray-500">
                      ({role.codigo})
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">
            Você poderá ajustar os papéis deste usuário depois, na tela de
            detalhes.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || loading}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-60"
          >
            {saving ? "Criando usuário..." : "Criar usuário"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/config/usuarios")}
            className="px-4 py-2 rounded-lg border text-sm"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
