"use client";

import { useEffect, useMemo, useState } from "react";
import PessoaLookup, { PessoaLookupItem } from "@/components/PessoaLookup";

type RoleSistema = { id: string; codigo: string; nome: string; ativo: boolean };

export default function NovoUsuarioPage() {
  const [pessoa, setPessoa] = useState<PessoaLookupItem | null>(null);
  const [email, setEmail] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [roles, setRoles] = useState<RoleSistema[]>([]);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);

  const rolesAtivas = useMemo(() => roles.filter((r) => r.ativo), [roles]);

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

    if (!pessoa) {
      setErro("Selecione a pessoa.");
      return;
    }
    if (!email.trim()) {
      setErro("Informe o email do usuário.");
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
          pessoa_id: pessoa.id,
          email: email.trim(),
          roles_ids: selecionadas,
          is_admin: isAdmin,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        const msg = json?.error || json?.details || `Falha ao enviar convite (status ${res.status})`;
        setErro(msg);
        return;
      }

      setMensagem("Convite enviado para o e-mail. A pessoa deve abrir o link e definir a senha.");
      setRedirectTo(json?.invite?.redirectTo || null);
      setPessoa(null);
      setEmail("");
      setIsAdmin(false);
      setSelecionadas([]);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro inesperado ao enviar convite.");
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
        O cadastro de usuários é feito a partir de uma pessoa existente. Envie um convite e peça
        para a pessoa definir a senha pelo link recebido.
      </p>

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <PessoaLookup
          label="Pessoa (cadastro existente)"
          placeholder="Buscar por nome, e-mail ou CPF (2+ caracteres)"
          value={pessoa}
          onChange={setPessoa}
          ctaNovaPessoaHref="/pessoas/nova"
        />

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
          {loading ? "Enviando convite..." : "Enviar convite"}
        </button>
      </div>
    </div>
  );
}
