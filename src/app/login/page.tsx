"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  async function entrar() {
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) return setMsg(error.message);
    router.replace("/"); // volta pra home
  }

  async function cadastrar() {
    setMsg("");
    const { error } = await supabase.auth.signUp({ email, password: senha });
    if (error) return setMsg(error.message);
    setMsg("Cadastro criado! Se exigir confirmação, verifique seu e-mail.");
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1>Entrar</h1>
      <input
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ display: "block", margin: "8px 0", padding: 8, width: "100%" }}
      />
      <input
        placeholder="senha"
        type="password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        style={{ display: "block", margin: "8px 0", padding: 8, width: "100%" }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={entrar}>Entrar</button>
        <button onClick={cadastrar}>Cadastrar</button>
      </div>
      {msg && <p style={{ color: "tomato", marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
