"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "../lib/supabaseBrowser";

type Linha = {
  id: number;
  created_at?: string | null;
  conteudo?: string | null;
  user_id?: string | null;
  user_email?: string | null;
};

export default function Home() {
  const supabase = getSupabaseBrowser();

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [dados, setDados] = useState<Linha[]>([]);
  const [erro, setErro] = useState("");
  const [texto, setTexto] = useState("");

  async function checarSessao() {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    setSessionEmail(user?.email ?? null);

    // 🔎 busca no perfil se o usuário é admin (precisa da tabela `profiles` e policy de leitura)
    if (user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .single();
      setIsAdmin(!!prof?.is_admin);
    } else {
      setIsAdmin(false);
    }
  }

  async function carregar() {
    setErro("");
    const { data, error } = await supabase
      .from("teste")
      .select("*")
      .order("id", { ascending: true })
      .limit(50);

    if (error) setErro(error.message);
    else setDados(data ?? []);
  }

  async function inserir() {
    setErro("");
    if (!texto.trim()) return;
    const { error } = await supabase
      .from("teste")
      .insert([{ conteudo: texto.trim() }]);

    if (error) setErro(error.message);
    setTexto("");
    await carregar();
  }

  async function sair() {
    await supabase.auth.signOut();
    setDados([]);
    setSessionEmail(null);
    setIsAdmin(false);
  }

  useEffect(() => {
    checarSessao();
    carregar();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      checarSessao();
      carregar();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!sessionEmail)
    return (
      <main style={{ padding: 24 }}>
        <h1>Conexão Dados 🔐</h1>
        <p>Você precisa entrar para ver os dados.</p>
        <a href="/login">Ir para login</a>
        {erro && <p style={{ color: "tomato" }}>Erro: {erro}</p>}
      </main>
    );

  return (
    <main style={{ padding: 20, color: "white", background: "black", minHeight: "100vh" }}>
      {/* 👇 Aqui está o cabeçalho com o selo (admin) */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h1>Conexão Dados 🔐</h1>
        <span style={{ opacity: 0.8 }}>
          ({sessionEmail}{isAdmin ? " • admin" : ""})
        </span>
        <button onClick={sair}>Sair</button>
      </div>

      <div style={{ margin: "12px 0" }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma mensagem"
          style={{ padding: 8, width: 300, marginRight: 8 }}
        />
        <button onClick={inserir} style={{ marginRight: 8 }}>Inserir</button>
        <button onClick={carregar}>Recarregar</button>
      </div>

      {erro && <p style={{ color: "tomato" }}>Erro: {erro}</p>}

      <ul>
        {dados.map((r) => (
          <li key={r.id} style={{ marginBottom: 8 }}>
            <div><b>#{r.id}</b> — {r.conteudo ?? "(sem texto)"}</div>
            <div style={{ opacity: 0.8, fontSize: 12 }}>
              por: {r.user_email ?? r.user_id ?? "desconhecido"} • {r.created_at && new Date(r.created_at).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
