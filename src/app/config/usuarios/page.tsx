// src/app/config/usuarios/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type UsuarioLista = {
  userId: string;
  nomePessoa: string;
  emailLogin: string;
  papeis: string[];
  isAdmin: boolean;
  pessoaId: number | null;
  criadoEm: string | null;
};

type PerfilRow = {
  user_id: string;
  pessoa_id: number | null;
  is_admin: boolean;
  created_at: string | null;
};

type PessoaRow = {
  id: number;
  nome: string;
  email: string | null;
};

type UsuarioRoleRow = {
  user_id: string;
  roles_sistema: {
    codigo: string;
    nome: string;
  } | null;
};

export default function UsuariosPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [usuarios, setUsuarios] = useState<UsuarioLista[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingPermissao, setCheckingPermissao] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

        // 2) Verifica se é admin
        const { data: meuProfile, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("user_id", userIdAtual)
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

        // 3) Carrega profiles (já com created_at)
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, pessoa_id, is_admin, created_at")
          .order("created_at", { ascending: true });

        if (profilesError) {
          setError(profilesError.message || "Erro ao carregar usuários.");
          setLoading(false);
          return;
        }

        const profiles = (profilesData || []) as PerfilRow[];

        if (profiles.length === 0) {
          setUsuarios([]);
          setLoading(false);
          return;
        }

        // 4) Carrega pessoas relacionadas
        const pessoaIds = profiles
          .map((p) => p.pessoa_id)
          .filter((id): id is number => id !== null);

        const { data: pessoasData, error: pessoasError } = await supabase
          .from("pessoas")
          .select("id, nome, email")
          .in("id", pessoaIds);

        if (pessoasError) {
          setError(pessoasError.message || "Erro ao carregar pessoas.");
          setLoading(false);
          return;
        }

        const pessoas = (pessoasData || []) as PessoaRow[];
        const mapPessoas = new Map<number, PessoaRow>();
        pessoas.forEach((p) => mapPessoas.set(p.id, p));

        // 5) Carrega papéis (usuario_roles + roles_sistema)
        const { data: rolesData, error: rolesError } = await supabase
          .from("usuario_roles")
          .select("user_id, roles_sistema(codigo, nome)");

        if (rolesError) {
          setError(
            rolesError.message || "Erro ao carregar papéis dos usuários."
          );
          setLoading(false);
          return;
        }

        const usuarioRoles = (rolesData || []) as UsuarioRoleRow[];

        // Monta mapa user_id -> lista de papéis
        const mapPapeis = new Map<string, string[]>();

        for (const ur of usuarioRoles) {
          if (!ur.roles_sistema) continue;
          const atual = mapPapeis.get(ur.user_id) || [];
          atual.push(ur.roles_sistema.nome); // ou roles_sistema.codigo, se preferir
          mapPapeis.set(ur.user_id, atual);
        }

        // 6) Monta lista final para exibição
        const usuariosLista: UsuarioLista[] = profiles.map((p) => {
          const pessoa =
            p.pessoa_id !== null ? mapPessoas.get(p.pessoa_id) : undefined;

          const papeis = mapPapeis.get(p.user_id) || [];

          // Se o usuário é admin e não tem papel ADMIN explícito, marcamos na visualização
          const papeisComAdmin =
            p.is_admin && !papeis.includes("Administrador")
              ? ["Administrador", ...papeis]
              : papeis;

          return {
            userId: p.user_id,
            pessoaId: p.pessoa_id,
            nomePessoa: pessoa?.nome || "—",
            emailLogin: pessoa?.email || "",
            papeis: papeisComAdmin,
            isAdmin: p.is_admin,
            criadoEm: p.created_at, // string ISO ou null
          };
        });

        setUsuarios(usuariosLista);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message ||
            "Erro inesperado ao carregar a lista de usuários do sistema."
        );
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function irParaCadastroPessoa(pessoaId: number | null) {
    if (!pessoaId) return;
    // Ajuste a rota abaixo se o caminho do cadastro de pessoa for diferente
    router.push(`/pessoas/${pessoaId}`);
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
        <h1 className="text-2xl font-semibold mb-2">Usuários &amp; Perfis</h1>
        <p className="text-sm text-red-600">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Usuários &amp; Perfis</h1>
        <p className="text-sm text-gray-600">
          Administração dos usuários que possuem acesso ao sistema Conexão
          Dados. Somente perfis autorizados podem visualizar e alterar estas
          informações.
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push("/config/usuarios/novo")}
        className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
      >
        + Criar novo usuário
      </button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Usuários cadastrados</h2>

        {loading ? (
          <p className="text-sm text-gray-500">Carregando usuários...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum usuário cadastrado até o momento.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white/70 backdrop-blur shadow">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <th className="text-left px-4 py-2">Nome</th>
                  <th className="text-left px-4 py-2">E-mail de login</th>
                  <th className="text-left px-4 py-2">Papéis</th>
                  <th className="text-left px-4 py-2">Criado em</th>
                  <th className="text-right px-4 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr
                    key={u.userId}
                    className="border-t hover:bg-purple-50/60"
                  >
                    <td className="px-4 py-2 align-middle">
                      {u.nomePessoa || "—"}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      {u.emailLogin || "—"}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      {u.papeis.length > 0
                        ? u.papeis.join(", ")
                        : u.isAdmin
                        ? "Administrador"
                        : "—"}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      {u.criadoEm
                        ? new Date(u.criadoEm).toLocaleString("pt-BR")
                        : "—"}
                    </td>
                    <td className="px-4 py-2 align-middle text-right">
                      {u.pessoaId ? (
                        <button
                          type="button"
                          onClick={() => irParaCadastroPessoa(u.pessoaId)}
                          className="px-3 py-1 rounded-lg border text-xs hover:bg-gray-50"
                        >
                          Ver cadastro da pessoa
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Sem pessoa
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
