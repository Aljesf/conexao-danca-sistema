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

  const [showInativos, setShowInativos] = useState(false);

  const [codigo, setCodigo] = useState("2026");
  const [titulo, setTitulo] = useState("Periodo Letivo 2026");
  const [ano, setAno] = useState(2026);
  const [dataInicio, setDataInicio] = useState("2026-01-12");
  const [dataFim, setDataFim] = useState("2026-12-19");
  const [inicioJaneiro, setInicioJaneiro] = useState("2026-01-12");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const qs = showInativos ? "?include_inativos=1" : "";
      const res = await fetch(`/api/academico/periodos-letivos${qs}`);
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
  }, [showInativos]);

  async function criarPeriodo() {
    setErr(null);
    try {
      if (!codigo.trim()) throw new Error("Codigo e obrigatorio.");
      if (!titulo.trim()) throw new Error("Titulo e obrigatorio.");

      const payload = {
        codigo,
        titulo,
        ano_referencia: ano,
        data_inicio: dataInicio,
        data_fim: dataFim,
        inicio_letivo_janeiro: inicioJaneiro || null,
        ativo: true,
      };

      const res = await fetch("/api/academico/periodos-letivos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao criar periodo letivo");

      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado");
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Academico • Periodos letivos</h1>
        <p className="text-sm text-muted-foreground">
          Fonte unica de verdade para matricula, turmas REGULAR e calendario (feriados/ponto facultativo/sem aula).
        </p>
      </div>

      <div className="rounded-2xl border bg-white/60 backdrop-blur p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Novo periodo letivo</div>
          <label className="text-xs text-muted-foreground flex items-center gap-2">
            <input type="checkbox" checked={showInativos} onChange={(e) => setShowInativos(e.target.checked)} />
            Mostrar inativos
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <div className="md:col-span-1">
            <div className="text-xs text-muted-foreground">Codigo</div>
            <input className="w-full border rounded-xl px-3 py-2 text-sm" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground">Titulo</div>
            <input className="w-full border rounded-xl px-3 py-2 text-sm" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>

          <div className="md:col-span-1">
            <div className="text-xs text-muted-foreground">Ano</div>
            <input className="w-full border rounded-xl px-3 py-2 text-sm" type="number" value={ano} onChange={(e) => setAno(Number(e.target.value))} />
          </div>

          <div className="md:col-span-1">
            <div className="text-xs text-muted-foreground">Inicio</div>
            <input className="w-full border rounded-xl px-3 py-2 text-sm" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>

          <div className="md:col-span-1">
            <div className="text-xs text-muted-foreground">Fim</div>
            <input className="w-full border rounded-xl px-3 py-2 text-sm" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <div className="text-xs text-muted-foreground">Inicio letivo de janeiro (pro-rata)</div>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              type="date"
              value={inicioJaneiro}
              onChange={(e) => setInicioJaneiro(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button className="px-4 py-2 rounded-xl border text-sm shadow-sm" onClick={() => void criarPeriodo()}>
              Criar periodo letivo
            </button>
          </div>
        </div>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}
      </div>

      {loading ? <div className="rounded-lg border p-4 text-sm">Carregando...</div> : null}

      <div className="rounded-2xl border bg-white/60 backdrop-blur overflow-hidden shadow-sm">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="text-sm font-semibold">Lista</div>
          <div className="text-xs text-muted-foreground">{items.length} item(ns)</div>
        </div>

        {items.length === 0 && !loading ? (
          <div className="p-4 text-sm text-muted-foreground">Nenhum periodo letivo encontrado.</div>
        ) : (
          <div className="divide-y">
            {items.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{p.titulo}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.codigo} • {p.ano_referencia} • {p.data_inicio} → {p.data_fim} • {p.ativo ? "ativo" : "inativo"}
                  </div>
                </div>
                <Link className="px-3 py-2 rounded-xl border text-sm" href={`/escola/academico/periodos-letivos/${p.id}`}>
                  Abrir
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
