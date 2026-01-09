"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PessoaLookup, { PessoaLookupItem } from "@/components/PessoaLookup";

type RoleSistema = { id: string; codigo: string; nome: string; ativo: boolean };

type ConviteResponse =
  | { ok: true; message?: string; invite?: { redirectTo?: string } }
  | { ok: false; code?: string; message?: string; error?: string; details?: unknown };

function toIntOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string") {
    const n = Number(value.trim());
    if (Number.isInteger(n) && n > 0) return n;
  }
  return null;
}

function asText(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export default function NovoUsuarioPage() {
  const [pessoa, setPessoa] = useState<PessoaLookupItem | null>(null);
  const [email, setEmail] = useState<string>("");
  const [senha, setSenha] = useState<string>("");
  const [confirmarSenha, setConfirmarSenha] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [roles, setRoles] = useState<RoleSistema[]>([]);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  const rolesAtivas = useMemo(() => roles.filter((r) => r.ativo), [roles]);
  const pessoaLabel = useMemo(() => {
    if (!pessoa) return null;
    const parts: string[] = [`ID: ${pessoa.id}`];
    const cpf = asText(pessoa.cpf);
    const emailValue = asText(pessoa.email);
    if (cpf) parts.push(`CPF: ${cpf}`);
    if (emailValue) parts.push(`Email: ${emailValue}`);
    return parts.join(" | ");
  }, [pessoa]);

  useEffect(() => {
    async function carregarRoles() {
      try {
        const res = await fetch("/api/admin/roles", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(json?.roles)) {
          setRoles(json.roles);
        }
      } catch {
        // silencioso
      }
    }
    carregarRoles();
  }, []);

  function toggleRole(roleId: string) {
    setSelecionadas((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }

  async function enviarConvite() {
    setErro(null);
    setMensagem(null);
    setRedirectTo(null);

    const pessoaId = toIntOrNull(pessoa?.id);
    if (!pessoaId) {
      setErro("Selecione uma pessoa valida antes de enviar o convite.");
      return;
    }
    const emailNorm = email.trim().toLowerCase();
    if (!emailNorm || !emailNorm.includes("@")) {
      setErro("Informe um email valido.");
      return;
    }
    if (!senha || senha.length < 6) {
      setErro("SENHA_INVALIDA: a senha deve ter no minimo 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("SENHA_NAO_CONFERE: confirme a senha corretamente.");
      return;
    }
    if (selecionadas.length === 0) {
      setErro("Selecione ao menos um papel (role).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/usuarios/convidar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pessoa_id: pessoaId,
          email: emailNorm,
          senha,
          roles_ids: selecionadas,
          is_admin: isAdmin,
        }),
      });

      const json = (await res.json().catch(() => null)) as ConviteResponse | null;
      if (!res.ok || !json || json.ok === false) {
        const code = json && "code" in json && json.code ? json.code : "ERRO";
        const message =
          json && "message" in json && json.message
            ? json.message
            : json && "error" in json && json.error
              ? json.error
              : `Falha ao criar usuario (status ${res.status})`;
        setErro(`${code}: ${message}`);
        return;
      }

      setMensagem(json.message ?? "Usuario criado e registrado com sucesso.");
      setRedirectTo(json.invite?.redirectTo || null);
      setPessoa(null);
      setEmail("");
      setSenha("");
      setConfirmarSenha("");
      setIsAdmin(false);
      setSelecionadas([]);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro inesperado ao criar usuario.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (pessoa?.email && !email.trim()) {
      setEmail(pessoa.email);
    }
  }, [pessoa, email]);

  const senhaNaoConfere = erro?.includes("SENHA_NAO_CONFERE");
  const senhaInvalida = erro?.includes("SENHA_INVALIDA");
  const senhaErro =
    senhaNaoConfere
      ? "As senhas nao conferem."
      : senhaInvalida
      ? "A senha deve ter no minimo 6 caracteres."
      : null;
  const erroGeral = erro && !senhaNaoConfere && !senhaInvalida ? erro : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Cadastrar novo usuario</h1>
              <p className="text-sm text-slate-600">
                O cadastro de usuarios e feito a partir de uma pessoa existente. Defina a senha e
                os papeis antes de criar o usuario.
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Fluxo: pessoa -&gt; email -&gt; senha -&gt; roles -&gt; criar
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Dados do usuario</h2>
            <p className="text-sm text-slate-600">
              Selecione uma pessoa cadastrada e confirme o email de acesso.
            </p>
          </div>

          <div className="mt-4 grid gap-4">
            <div className="grid gap-3">
              <PessoaLookup
                label="Pessoa (cadastro existente)"
                placeholder="Buscar por nome, e-mail ou CPF (2+ caracteres)"
                value={pessoa}
                onChange={setPessoa}
                ctaNovaPessoaHref="/pessoas/nova"
              />
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Pessoa selecionada
                    </p>
                    <p className="text-sm text-slate-700">
                      {pessoaLabel ?? "Nenhuma pessoa selecionada."}
                    </p>
                  </div>
                  {pessoa ? (
                    <button
                      type="button"
                      onClick={() => setPessoa(null)}
                      className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Trocar pessoa
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">E-mail do usuario</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@exemplo.com"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
              <p className="mt-1 text-xs text-slate-500">Sera o login do usuario.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="min. 6 caracteres"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <p className="mt-1 text-xs text-slate-500">Minimo 6 caracteres.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Confirmar senha</label>
                <input
                  type="password"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="repita a senha"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
                <p className="mt-1 text-xs text-slate-500">Confirme para evitar erros.</p>
              </div>
            </div>

            {senhaErro ? <p className="text-sm text-rose-600">{senhaErro}</p> : null}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Permissoes e criacao</h2>
              <p className="text-sm text-slate-600">
                Defina o perfil de acesso e os papeis vinculados ao usuario.
              </p>
            </div>
            {loading ? <span className="text-xs text-slate-500">Enviando...</span> : null}
          </div>

          <div className="mt-4 grid gap-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                Administrador do sistema
              </label>
              <p className="mt-1 text-xs text-slate-500">
                Libera acesso completo ao painel administrativo.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">Papeis (roles)</div>
                <span className="text-xs text-slate-500">
                  {selecionadas.length} selecionado{selecionadas.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                {rolesAtivas.length === 0 ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 md:col-span-2">
                    Nenhum papel ativo encontrado.
                  </div>
                ) : null}
                {rolesAtivas.map((r) => {
                  const selecionada = selecionadas.includes(r.id);
                  return (
                    <label
                      key={r.id}
                      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                        selecionada
                          ? "border-purple-200 bg-purple-50 text-purple-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selecionada}
                        onChange={() => toggleRole(r.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="flex flex-col">
                        <span className="font-medium">{r.nome}</span>
                        <span className="text-xs text-slate-500">{r.codigo}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {erroGeral ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {erroGeral}
              </div>
            ) : null}

            {mensagem ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {mensagem}
                {redirectTo ? (
                  <div className="mt-2 text-xs text-slate-600">
                    Link de definicao de senha: {redirectTo}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Link
                href="/admin/usuarios"
                className="rounded-md border border-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Voltar
              </Link>
              <button
                onClick={enviarConvite}
                disabled={loading}
                className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Criando usuario..." : "Criar usuario"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
