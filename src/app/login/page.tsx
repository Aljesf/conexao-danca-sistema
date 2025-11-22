"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  async function entrar() {
    setMsg("");

    // 1) Autentica o usuário
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    const user = data?.user;

    // 2) AUDITORIA DE LOGIN
    if (user) {
      try {
        await fetch("/api/auditoria/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            acao: "LOGIN",
            entidade: "auth",
            entidadeId: user.id,
            detalhes: { email },
          }),
        });
      } catch (err) {
        console.error("Erro ao registrar auditoria de login:", err);
      }
    }

    // 3) Redireciona para home
    router.replace("/");
  }

  async function cadastrar() {
    setMsg("");

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Cadastro criado! Se exigir confirmação, verifique seu e-mail.");
  }

  return (
    <main
      style={{ padding: 24, maxWidth: 420, margin: "40px auto", textAlign: "center" }}
    >
      <h1 style={{ marginBottom: 20 }}>Entrar</h1>

      <input
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          display: "block",
          margin: "8px auto",
          padding: 10,
          width: "100%",
          borderRadius: 6,
        }}
      />

      <input
        placeholder="Senha"
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        style={{
          display: "block",
          margin: "8px auto",
          padding: 10,
          width: "100%",
          borderRadius: 6,
        }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "center" }}>
        <button onClick={entrar} style={{ padding: "8px 16px" }}>
          Entrar
        </button>
        <button onClick={cadastrar} style={{ padding: "8px 16px" }}>
          Cadastrar
        </button>
      </div>

      {msg && (
        <p style={{ color: "tomato", marginTop: 12 }}>
          {msg}
        </p>
      )}
    </main>
  );
}
