// src/app/relatorios/auditoria/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type LogRow = {
  id: number;
  created_at: string;
  user_id: string;
  acao: string;
  entidade: string | null;
  entidade_id: string | null;
  detalhes: any;
};

type PerfilRow = {
  user_id: string;
  full_name: string | null;
  pessoa_id: number | null;
};

type PessoaRow = {
  id: number;
  nome: string;
};

type UsuarioRoleRow = {
  user_id: string;
  roles_sistema: {
    codigo: string;
    nome: string;
  } | null;
};

export default function AuditoriaPage() {
  const supabase = getSupabaseBrowser();

  const [loading, setLoading] = useState(true);
  const [checkingPermissao, setCheckingPermissao] = useState(true);
  const [semPermissao, setSemPermissao] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logs, setLogs] = useState<LogRow[]>([]);

  // Futuramente podemos preencher essas métricas com dados reais
  const [totalLogins, setTotalLogins] = useState<number | null>(null);
  const [totalOperacoes, setTotalOperacoes] = useState<number | null>(null);

  // Mapa auxiliar para exibir nome do usuário ao invés do user_id
  const [mapNomeUsuario, setMapNomeUsuario] = useState<
    Record<string, string>
  >({});

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

        // 2) Verifica se é ADMIN ou AUDITOR
        const [{ data: profileData, error: profileError }, { data: rolesData, error: rolesError }] =
          await Promise.all([
            supabase
              .from("profiles")
              .select("is_admin")
              .eq("user_id", userIdAtual)
              .single(),
            supabase
              .from("usuario_roles")
              .select("user_id, roles_sistema(codigo, nome)")
              .eq("user_id", userIdAtual),
          ]);

        if (profileError) {
          setError("Não foi possível carregar seu perfil de acesso.");
          setCheckingPermissao(false);
          setLoading(false);
          return;
        }

        const isAdmin = !!profileData?.is_admin;
        const roles = (rolesData || []) as UsuarioRoleRow[];
        const codigosRoles = roles
          .map((r) => r.roles_sistema?.codigo)
          .filter((c): c is string => !!c);

        const isAuditor = codigosRoles.includes("AUDITOR");

        if (!isAdmin && !isAuditor) {
          setSemPermissao(true);
          setCheckingPermissao(false);
          setLoading(false);
          return;
        }

        setCheckingPermissao(false);

        // 3) Carrega logs de auditoria (últimos 200, por exemplo)
        const { data: logsData, error: logsError } = await supabase
          .from("auditoria_logs")
          .select("id, created_at, user_id, acao, entidade, entidade_id, detalhes")
          .order("created_at", { ascending: false })
          .limit(200);

        if (logsError) {
          setError(logsError.message || "Erro ao carregar logs de auditoria.");
          setLoading(false);
          return;
        }

        const logs = (logsData || []) as LogRow[];
        setLogs(logs);

        // 4) (Opcional) Preenche algumas métricas simples
        const totalLoginCount = logs.filter((l) => l.acao === "LOGIN").length;
        setTotalLogins(totalLoginCount);
        setTotalOperacoes(logs.length);

        // 5) Monta mapa user_id -> nome (via profiles + pessoas)
        const userIds = Array.from(new Set(logs.map((l) => l.user_id)));

        if (userIds.length > 0) {
          const { data: perfisData, error: perfisError } = await supabase
            .from("profiles")
            .select("user_id, full_name, pessoa_id")
            .in("user_id", userIds);

          if (!perfisError && perfisData) {
            const perfis = perfisData as PerfilRow[];
            const pessoaIds = perfis
              .map((p) => p.pessoa_id)
              .filter((id): id is number => id !== null);

            let mapPessoas: Record<number, PessoaRow> = {};
            if (pessoaIds.length > 0) {
              const { data: pessoasData, error: pessoasError } = await supabase
                .from("pessoas")
                .select("id, nome")
                .in("id", pessoaIds);

              if (!pessoasError && pessoasData) {
                (pessoasData as PessoaRow[]).forEach((p) => {
                  mapPessoas[p.id] = p;
                });
              }
            }

            const mapNomes: Record<string, string> = {};
            perfis.forEach((p) => {
              const nomePessoa =
                (p.pessoa_id && mapPessoas[p.pessoa_id]?.nome) || p.full_name;
              mapNomes[p.user_id] = nomePessoa || p.user_id;
            });

            setMapNomeUsuario(mapNomes);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message ||
            "Erro inesperado ao carregar a auditoria do sistema."
        );
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <h1 className="text-2xl font-semibold mb-2">Auditoria do Sistema</h1>
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
        <h1 className="text-2xl font-semibold mb-1">Auditoria do Sistema</h1>
        <p className="text-sm text-gray-600">
          Visualização dos registros de ações realizadas no sistema. Inicialmente
          são apresentados os eventos de login, logout e outras operações
          registradas pelo módulo de auditoria.
        </p>
      </div>

      {/* Cards/resumo – por enquanto com informações simples */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 shadow rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-gray-500 uppercase">
            Total de registros de auditoria (carregados)
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {loading ? "…" : logs.length}
          </div>
        </div>

        <div className="bg-white/80 shadow rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-gray-500 uppercase">
            Logins registrados
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {loading || totalLogins === null ? "…" : totalLogins}
          </div>
        </div>

        <div className="bg-white/80 shadow rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-gray-500 uppercase">
            Ações (placeholder)
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Aqui futuramente podemos destacar outras métricas relevantes
            (alunos ativos, últimos acessos, etc.).
          </div>
        </div>
      </div>

      {/* Filtros – estrutura pronta, ainda simples */}
      <div className="bg-white/80 shadow rounded-xl px-4 py-3 space-y-3">
        <div className="text-sm font-medium text-gray-700">
          Filtros rápidos
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="(Em breve) Filtrar por usuário"
            disabled
          />
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="(Em breve) Filtrar por ação"
            disabled
          />
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="(Em breve) Data inicial"
            disabled
          />
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="(Em breve) Data final"
            disabled
          />
        </div>
        <p className="text-xs text-gray-500">
          A estrutura de filtros já está preparada. Depois vamos ligar esses
          campos aos parâmetros de busca (por usuário, ação, período, etc.).
        </p>
      </div>

      {/* Tabela de logs */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Logs recentes</h2>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Carregando logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhum registro de auditoria encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white/70 backdrop-blur shadow">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                  <th className="text-left px-4 py-2">Data / Hora</th>
                  <th className="text-left px-4 py-2">Usuário</th>
                  <th className="text-left px-4 py-2">Ação</th>
                  <th className="text-left px-4 py-2">Entidade</th>
                  <th className="text-left px-4 py-2">ID Entidade</th>
                  <th className="text-left px-4 py-2">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-purple-50/60">
                    <td className="px-4 py-2 align-middle whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      {mapNomeUsuario[log.user_id] || log.user_id}
                    </td>
                    <td className="px-4 py-2 align-middle">{log.acao}</td>
                    <td className="px-4 py-2 align-middle">
                      {log.entidade || "—"}
                    </td>
                    <td className="px-4 py-2 align-middle">
                      {log.entidade_id || "—"}
                    </td>
                    <td className="px-4 py-2 align-middle text-xs max-w-xs">
                      {log.detalhes
                        ? JSON.stringify(log.detalhes)
                        : "—"}
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
