"use client";

import { useEffect, useState } from "react";

type EventoInterno = {
  id: number;
  dominio: string;
  categoria: string;
  subcategoria: string | null;
  titulo: string;
  descricao: string | null;
  inicio: string;
  fim: string | null;
  local: string | null;
  formato: string;
  status: string;
  visibilidade: string;
};

export default function EventosInternosPage() {
  const [items, setItems] = useState<EventoInterno[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [dominio, setDominio] = useState("ORGANIZACIONAL");
  const [categoria, setCategoria] = useState("REUNIAO");
  const [subcategoria, setSubcategoria] = useState("REUNIAO_COM_PAIS");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/calendario/eventos-internos");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar eventos internos");
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

  async function criar() {
    setErr(null);
    try {
      if (!titulo.trim()) throw new Error("Titulo e obrigatorio.");
      if (!inicio.trim()) throw new Error("Inicio e obrigatorio.");

      const payload = {
        dominio,
        categoria,
        subcategoria,
        titulo,
        inicio: new Date(inicio).toISOString(),
        fim: fim ? new Date(fim).toISOString() : null,
      };

      const res = await fetch("/api/calendario/eventos-internos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao criar evento interno");

      setTitulo("");
      setInicio("");
      setFim("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro inesperado");
    }
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div>
        <h2 className="text-lg font-medium">Eventos internos</h2>
        <p className="text-sm text-muted-foreground">
          Reunioes, plantao pedagogico, acolhimento e demais eventos internos com data e hora.
        </p>
      </div>

      <div className="rounded-md border p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Dominio</div>
            <input
              className="w-full border rounded-md px-2 py-2 text-sm"
              value={dominio}
              onChange={(e) => setDominio(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Categoria</div>
            <input
              className="w-full border rounded-md px-2 py-2 text-sm"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Subcategoria</div>
            <input
              className="w-full border rounded-md px-2 py-2 text-sm"
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Titulo</div>
            <input
              className="w-full border rounded-md px-2 py-2 text-sm"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Inicio (datetime local)</div>
            <input
              className="w-full border rounded-md px-2 py-2 text-sm"
              type="datetime-local"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Fim (opcional)</div>
            <input
              className="w-full border rounded-md px-2 py-2 text-sm"
              type="datetime-local"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </div>
        </div>

        <button className="px-3 py-2 rounded-md border text-sm" onClick={() => void criar()}>
          Criar evento interno
        </button>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}
      </div>

      <div className="rounded-md border">
        <div className="p-3 text-sm font-medium">Lista</div>
        {loading ? <p className="p-3 text-sm">Carregando...</p> : null}
        {!loading && items.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">Nenhum evento interno.</p>
        ) : null}
        <div className="divide-y">
          {items.map((it) => (
            <div key={it.id} className="p-3">
              <div className="text-sm font-medium">{it.titulo}</div>
              <div className="text-xs text-muted-foreground">
                {it.dominio}/{it.categoria}/{it.subcategoria ?? "-"} • {new Date(it.inicio).toLocaleString("pt-BR")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
