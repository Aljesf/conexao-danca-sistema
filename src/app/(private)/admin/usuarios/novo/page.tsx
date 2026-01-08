"use client";

import { useEffect, useMemo, useState } from "react";
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
      } catch (e) {
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

      setMensagem(json.message ?? "Usuario criado com senha definida pelo administrador.");
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

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Cadastrar novo usuário</h1>
      <p style={{ color: "rgba(0,0,0,0.65)", fontSize: 14, marginTop: 0 }}>
        O cadastro de usuarios e feito a partir de uma pessoa existente. Defina a senha aqui e
        crie o usuario diretamente.
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <PessoaLookup
          label="Pessoa (cadastro existente)"
          placeholder="Buscar por nome, e-mail ou CPF (2+ caracteres)"
          value={pessoa}
          onChange={setPessoa}
          ctaNovaPessoaHref="/pessoas/nova"
        />
        {pessoaLabel ? <div style={{ fontSize: 13, opacity: 0.75 }}>{pessoaLabel}</div> : null}

        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
            E-mail do usuário
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@exemplo.com"
            style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </div>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="min. 6 caracteres"
              autoComplete="new-password"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Confirmar senha
            </label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="repita a senha"
              autoComplete="new-password"
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
            />
          </div>
        </div>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          Administrador do sistema
        </label>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Papéis (roles)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {rolesAtivas.length === 0 && (
              <span style={{ color: "rgba(0,0,0,0.55)" }}>Nenhum papel ativo encontrado.</span>
            )}
            {rolesAtivas.map((r) => (
              <label
                key={r.id}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  padding: "6px 10px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  background: selecionadas.includes(r.id) ? "rgba(37,99,235,0.08)" : "#fff",
                }}
              >
                <input
                  type="checkbox"
                  checked={selecionadas.includes(r.id)}
                  onChange={() => toggleRole(r.id)}
                />
                {r.nome} ({r.codigo})
              </label>
            ))}
          </div>
        </div>

        {erro && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(255,0,0,0.25)",
              background: "rgba(255,0,0,0.06)",
              color: "#b91c1c",
            }}
          >
            {erro}
          </div>
        )}

        {mensagem && (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid rgba(16,185,129,0.25)",
              background: "rgba(16,185,129,0.08)",
              color: "#065f46",
            }}
          >
            {mensagem}
            {redirectTo ? (
              <div style={{ marginTop: 6, fontSize: 12, color: "#0f172a" }}>
                Link de definição de senha: {redirectTo}
              </div>
            ) : null}
          </div>
        )}

        <button
          onClick={enviarConvite}
          disabled={loading}
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #2563eb",
            background: loading ? "rgba(37,99,235,0.65)" : "#2563eb",
            color: "#fff",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 10px 30px rgba(37,99,235,0.25)",
          }}
        >
          {loading ? "Criando usuario..." : "Criar usuario"}
        </button>
      </div>
    </div>
  );
}





