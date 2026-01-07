"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Periodo = {
  id: number;
  codigo: string;
  titulo: string;
  ano_referencia: number;
  data_inicio: string;
  data_fim: string;
  inicio_letivo_janeiro: string | null;
  ativo: boolean;
};

export default function PeriodosLetivosPage() {
  const [items, setItems] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/academico/periodos-letivos");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar periodos letivos");
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Academico • Periodos letivos</h1>
        <p className="text-sm text-muted-foreground">
          Fonte de verdade da Escola para: matricula, turmas REGULAR, calendario e calculo de dias letivos.
        </p>
      </div>

      {err ? <div className="rounded-lg border p-4 text-sm text-red-600">{err}</div> : null}
      {loading ? <div className="rounded-lg border p-4 text-sm">Carregando...</div> : null}

      <div className="rounded-lg border overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="text-sm font-medium">Lista</div>
          <div className="text-xs text-muted-foreground">{items.length} item(ns)</div>
        </div>

        {items.length === 0 && !loading ? (
          <div className="p-4 text-sm text-muted-foreground">Nenhum periodo letivo cadastrado.</div>
        ) : (
          <div className="divide-y">
            {items.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{p.titulo}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.codigo} • {p.ano_referencia} • {p.data_inicio} {" -> "} {p.data_fim} •{" "}
                    {p.ativo ? "ativo" : "inativo"}
                  </div>
                </div>
                <Link className="px-3 py-2 rounded-md border text-sm" href={`/escola/academico/periodos-letivos/${p.id}`}>
                  Abrir
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        MVP: criacao por UI completa entra na proxima iteracao. Por enquanto, voce pode cadastrar via API (POST
        /api/academico/periodos-letivos) e depois editar aqui.
      </div>
    </div>
  );
}
