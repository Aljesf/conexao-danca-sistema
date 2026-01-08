"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

function cardClass() {
  return "rounded-2xl border bg-white/60 backdrop-blur shadow-sm";
}

export default function PeriodosLetivosDashboardPage() {
  const [items, setItems] = useState<Periodo[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showInativos, setShowInativos] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const qs = showInativos ? "?include_inativos=1" : "";
      const res = await fetch(`/api/academico/periodos-letivos${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar períodos letivos");
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

  const ativos = useMemo(() => items.filter((p) => p.ativo), [items]);
  const inativos = useMemo(() => items.filter((p) => !p.ativo), [items]);

  const ultimoAno = useMemo(() => {
    if (!items.length) return null;
    return items.reduce((max, p) => (p.ano_referencia > max ? p.ano_referencia : max), items[0].ano_referencia);
  }, [items]);

  return (
    <div className="p-6 space-y-4">
      <div className={cardClass() + " p-5"}>
        <div className="text-xs tracking-widest text-muted-foreground uppercase">Acadêmico</div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Períodos letivos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Aqui você constrói o ano letivo da Escola: faixas (semestres/férias) e exceções (feriados, pontos
              facultativos, sem aula).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              className="px-4 py-2 rounded-full border text-sm shadow-sm bg-white/70"
              href="/escola/academico/periodos-letivos/novo"
            >
              Criar período letivo
            </Link>

            <label className="text-xs text-muted-foreground flex items-center gap-2 px-3 py-2 rounded-full border bg-white/50">
              <input type="checkbox" checked={showInativos} onChange={(e) => setShowInativos(e.target.checked)} />
              Mostrar inativos
            </label>
          </div>
        </div>
      </div>

      {err ? <div className={cardClass() + " p-4 text-sm text-red-600"}>{err}</div> : null}
      {loading ? <div className={cardClass() + " p-4 text-sm"}>Carregando…</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className={cardClass() + " p-4"}>
          <div className="text-xs text-muted-foreground">Total</div>
          <div className="text-2xl font-semibold">{items.length}</div>
          <div className="text-xs text-muted-foreground mt-1">períodos cadastrados</div>
        </div>

        <div className={cardClass() + " p-4"}>
          <div className="text-xs text-muted-foreground">Ativos</div>
          <div className="text-2xl font-semibold">{ativos.length}</div>
          <div className="text-xs text-muted-foreground mt-1">em uso na escola</div>
        </div>

        <div className={cardClass() + " p-4"}>
          <div className="text-xs text-muted-foreground">Inativos</div>
          <div className="text-2xl font-semibold">{inativos.length}</div>
          <div className="text-xs text-muted-foreground mt-1">histórico</div>
        </div>

        <div className={cardClass() + " p-4"}>
          <div className="text-xs text-muted-foreground">Último ano</div>
          <div className="text-2xl font-semibold">{ultimoAno ?? "—"}</div>
          <div className="text-xs text-muted-foreground mt-1">referência</div>
        </div>
      </div>

      <div className={cardClass() + " overflow-hidden"}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="text-sm font-semibold">Lista</div>
          <div className="text-xs text-muted-foreground">{items.length} item(ns)</div>
        </div>

        {items.length === 0 && !loading ? (
          <div className="p-4 text-sm text-muted-foreground">
            Nenhum período letivo encontrado.
            <div className="mt-2">
              <Link
                className="px-4 py-2 rounded-full border text-sm bg-white/70 inline-block"
                href="/escola/academico/periodos-letivos/novo"
              >
                Criar o primeiro período letivo
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {items.map((p) => (
              <div key={p.id} className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold">{p.titulo}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.codigo} • {p.ano_referencia} • {p.data_inicio} → {p.data_fim} • {p.ativo ? "ativo" : "inativo"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Início letivo de janeiro: {p.inicio_letivo_janeiro ?? "—"}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    className="px-3 py-2 rounded-full border text-sm bg-white/70"
                    href={`/escola/academico/periodos-letivos/${p.id}`}
                  >
                    Construir período
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={cardClass() + " p-4 text-sm text-muted-foreground"}>
        Observação: o Calendário da Escola apenas exibe o que foi definido aqui (faixas e exceções). Eventos internos
        continuam no módulo de Eventos Internos.
      </div>
    </div>
  );
}
