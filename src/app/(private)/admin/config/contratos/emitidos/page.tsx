"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Emitido = {
  id: number;
  matricula_id: number;
  contrato_modelo_id: number;
  status_assinatura: string;
  created_at: string;
  updated_at: string;
  pdf_url: string | null;
};

export default function AdminContratosEmitidosPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [itens, setItens] = useState<Emitido[]>([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/contratos/emitidos");
      const json = (await res.json()) as { data?: Emitido[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar emitidos.");
      setItens(json.data ?? []);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Contratos Emitidos</h1>
      <div style={{ marginTop: 8, opacity: 0.8 }}>
        <Link href="/admin/config/contratos" style={{ textDecoration: "none" }}>
          Voltar ao hub de Contratos
        </Link>
      </div>

      {erro ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #f00", borderRadius: 8 }}>{erro}</div>
      ) : null}

      {loading ? (
        <p style={{ marginTop: 12 }}>Carregando...</p>
      ) : itens.length === 0 ? (
        <p style={{ marginTop: 12 }}>Nenhum contrato emitido ainda.</p>
      ) : (
        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          {itens.map((c) => (
            <div key={c.id} style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>Contrato #{c.id}</div>
              <div style={{ opacity: 0.75, marginTop: 6 }}>
                Matricula: {c.matricula_id} | Modelo: {c.contrato_modelo_id} | Status: {c.status_assinatura}
              </div>
              <div style={{ opacity: 0.75, marginTop: 6 }}>
                Criado: {new Date(c.created_at).toLocaleString("pt-BR")}
              </div>
              <div style={{ opacity: 0.75, marginTop: 6 }}>
                PDF: {c.pdf_url ? "Disponivel" : "-"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
