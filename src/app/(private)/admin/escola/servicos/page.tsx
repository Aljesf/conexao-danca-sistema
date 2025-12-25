"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Servico = {
  id: number;
  tipo: string;
  ano_referencia: number | null;
  ativo: boolean;
  titulo: string | null;
};

export default function AdminEscolaServicosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    (async () => {
      try {
        setErro(null);
        const r = await fetch("/api/admin/servicos", { signal: controller.signal });
        const j = (await r.json()) as { ok: boolean; servicos?: Servico[]; message?: string };
        if (!alive) return;
        if (!r.ok || !j.ok) {
          setErro(j.message ?? "Falha ao carregar servicos.");
          return;
        }
        setServicos(j.servicos ?? []);
      } catch (e: unknown) {
        if (!alive) return;
        setErro(e instanceof Error ? e.message : "Falha ao carregar servicos.");
      }
    })();
    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700 }}>Escola (Admin) - Servicos</h1>
      <p style={{ marginTop: 4, opacity: 0.8 }}>
        Configure itens e precos por servico (turmas, cursos livres e projetos).
      </p>

      {erro ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #fca5a5", background: "#fee2e2" }}>
          {erro}
        </div>
      ) : null}

      <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={{ textAlign: "left", padding: 10 }}>ID</th>
              <th style={{ textAlign: "left", padding: 10 }}>Tipo</th>
              <th style={{ textAlign: "left", padding: 10 }}>Ano</th>
              <th style={{ textAlign: "left", padding: 10 }}>Ativo</th>
              <th style={{ textAlign: "left", padding: 10 }}>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {servicos.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: 10 }}>{s.id}</td>
                <td style={{ padding: 10 }}>{s.tipo}</td>
                <td style={{ padding: 10 }}>{s.ano_referencia ?? "-"}</td>
                <td style={{ padding: 10 }}>{s.ativo ? "Sim" : "Nao"}</td>
                <td style={{ padding: 10 }}>
                  <Link href={`/admin/escola/servicos/${s.id}`}>Configurar itens e precos</Link>
                </td>
              </tr>
            ))}
            {servicos.length === 0 ? (
              <tr>
                <td style={{ padding: 10 }} colSpan={5}>
                  Nenhum servico encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
