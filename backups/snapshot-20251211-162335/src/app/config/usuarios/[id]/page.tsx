// src/app/config/usuarios/[id]/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type ProfileData = {
  user_id: string;
  full_name: string | null;
  pessoa_id: number;
  is_admin: boolean;
};

type PessoaData = {
  id: number;
  nome: string;
  email: string | null;
  telefone: string | null;
};

export default function DetalheUsuarioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [pessoa, setPessoa] = useState<PessoaData | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [fullName, setFullName] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingPermissao, setCheckingPermissao] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const userId = params.id as string;

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

        const currentUserId = authData.user.id;

        // 2) Verifica se é admin
        const { data: meuProfile, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("user_id", currentUserId)
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

        // 3) Carrega profile do usuário alvo
        const { data: profileData, error: targetProfileError } = await supabase
          .from("profiles")
          .select("user_id, full_name, pessoa_id, is_admin")
          .eq("user_id", userId)
          .single();

        if (targetProfileError || !profileData) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const typedProfile = profileData as ProfileData;
        setProfile(typedProfile);
        setIsAdmin(typedProfile.is_admin);
        setFullName(typedProfile.full_name || "");

        // 4) Carrega dados da pessoa vinculada
        const { data: pessoaData, error: pessoaError } = await supabase
          .from("pessoas")
          .select("id, nome, email, telefone")
          .eq("id", typedProfile.pessoa_id)
          .single();

        if (pessoaError || !pessoaData) {
          setError("Não foi possível carregar os dados da pessoa vinculada.");
          setLoading(false);
          return;
        }

        setPessoa(pessoaData as PessoaData);
      } catch (err: any) {
        setError(
          err?.message ||
            "Erro inesperado ao carregar detalhes do usuário do sistema."
        );
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function handleSalvar(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      // Atualiza apenas o profile (nome exibido e flag admin)
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() === "" ? null : fullName.trim(),
          is_admin: isAdmin,
        })
        .eq("user_id", profile.user_id);

      if (updateError) {
        setError(updateError.message || "Erro ao atualizar usuário.");
        return;
      }

      setSuccessMessage("Dados do usuário atualizados com sucesso.");
    } catch (err: any) {
      setError(err?.message || "Erro inesperado ao atualizar usuário.");
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
        <h1 className="text-2xl font-semibold mb-2">Detalhes do usuário</h1>
        <p className="text-sm text-red-600">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-2">Detalhes do usuário</h1>
        <p className="text-sm text-gray-600">
          Usuário não encontrado ou já removido.
        </p>
        <button
          className="mt-4 px-4 py-2 rounded-lg border text-sm"
          onClick={() => router.push("/config/usuarios")}
        >
          Voltar para a lista
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">
          Detalhes do usuário do sistema
        </h1>
        <p className="text-sm text-gray-600">
          Consulta e ajustes básicos do acesso ao sistema vinculado a uma
          pessoa.
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

      {loading ? (
        <div className="text-sm text-gray-600">Carregando dados...</div>
      ) : profile && pessoa ? (
        <div className="space-y-6 max-w-xl">
          <div className="bg-white/70 backdrop-blur rounded-xl shadow p-4 space-y-2">
            <h2 className="text-lg font-semibold mb-2">Informações gerais</h2>
            <p className="text-sm">
              <span className="font-medium">UID (Auth): </span>
              <span className="font-mono text-xs">{profile.user_id}</span>
            </p>
            <p className="text-sm">
              <span className="font-medium">Pessoa vinculada: </span>
              {pessoa.nome} (ID {pessoa.id})
            </p>
            <p className="text-sm">
              <span className="font-medium">E-mail da pessoa: </span>
              {pessoa.email || "—"}
            </p>
            <p className="text-sm">
              <span className="font-medium">Telefone: </span>
              {pessoa.telefone || "—"}
            </p>
          </div>

          <form
            onSubmit={handleSalvar}
            className="bg-white/70 backdrop-blur rounded-xl shadow p-4 space-y-4"
          >
            <h2 className="text-lg font-semibold mb-1">
              Configuração do usuário
            </h2>

            <div>
              <label className="block text-sm font-medium mb-1">
                Nome exibido (profile)
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome que aparecerá em telas internas"
              />
              <p className="text-xs text-gray-500 mt-1">
                Este nome é opcional e serve apenas como identificação rápida do
                usuário nas telas internas.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isAdminUser"
                type="checkbox"
                className="h-4 w-4"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
              />
              <label htmlFor="isAdminUser" className="text-sm">
                Usuário possui perfil de <strong>Administrador</strong>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/config/usuarios")}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Voltar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
