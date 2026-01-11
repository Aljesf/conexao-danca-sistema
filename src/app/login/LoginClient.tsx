"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type Props = {
  onSuccessRedirect?: string;
};

export default function LoginClient({ onSuccessRedirect = "/pessoas" }: Props) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  async function entrar() {
    setMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    const user = data?.user;

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

    router.replace(onSuccessRedirect);
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            padding: 12,
            width: "100%",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
          }}
        />

        <input
          placeholder="Senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={{
            padding: 12,
            width: "100%",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
          }}
        />

        <button
          onClick={entrar}
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: "#2563eb",
            color: "#fff",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          Entrar
        </button>
      </div>

      {msg ? (
        <p style={{ color: "tomato", marginTop: 12, textAlign: "center", fontSize: 13 }}>{msg}</p>
      ) : null}
    </>
  );
}

