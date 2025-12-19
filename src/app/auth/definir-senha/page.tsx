"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

function getHashParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const hash = window.location.hash?.replace(/^#/, "") ?? "";
  const params = new URLSearchParams(hash);
  const out: Record<string, string> = {};
  params.forEach((v, k) => (out[k] = v));
  return out;
}

export default function DefinirSenhaPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClientComponentClient(), []);
  const [loading, setLoading] = useState<boolean>(true);
  const [ready, setReady] = useState<boolean>(false);
  const [senha, setSenha] = useState<string>("");
  const [senha2, setSenha2] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      setErro(null);
      try {
        const { data: s1 } = await supabase.auth.getSession();
        if (s1.session) {
          setReady(true);
          return;
        }

        const hp = getHashParams();
        const access_token = hp["access_token"];
        const refresh_token = hp["refresh_token"];

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          setReady(true);
          return;
        }

        setErro("Link inválido ou expirado. Peça para reenviar o convite.");
      } catch (e: unknown) {
        setErro(e instanceof Error ? e.message : "Falha ao validar sessão.");
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  async function salvarSenha() {
    setErro(null);
    setOk(false);

    const s = senha.trim();
    const s2 = senha2.trim();

    if (s.length < 8) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (s !== s2) {
      setErro("As senhas não conferem.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: s });
      if (error) throw error;
      setOk(true);

      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", window.location.pathname);
      }

      setTimeout(() => router.push("/login"), 900);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao definir senha.");
    }
  }

  if (loading) {
    return <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>Carregando...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Definir senha</h1>
      <p style={{ marginTop: 0, opacity: 0.75 }}>Defina sua senha para acessar o Sistema Conexão Dança.</p>

      {!ready ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgba(255,0,0,0.25)",
            background: "rgba(255,0,0,0.06)",
          }}
        >
          {erro ?? "Não foi possível validar o link."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, opacity: 0.8, marginBottom: 6 }}>Nova senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, opacity: 0.8, marginBottom: 6 }}>Confirmar senha</label>
            <input
              type="password"
              value={senha2}
              onChange={(e) => setSenha2(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)" }}
            />
          </div>

          {erro && (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(255,0,0,0.25)",
                background: "rgba(255,0,0,0.06)",
              }}
            >
              {erro}
            </div>
          )}

          {ok && (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "rgba(0,0,0,0.03)",
              }}
            >
              Senha definida com sucesso. Redirecionando para o login...
            </div>
          )}

          <button
            onClick={salvarSenha}
            style={{ padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}
          >
            Salvar senha
          </button>
        </div>
      )}
    </div>
  );
}
