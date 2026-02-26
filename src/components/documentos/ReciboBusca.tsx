"use client";

import * as React from "react";

type Item = {
  tipo: "COBRANCA" | "RECEBIMENTO";
  ref_id: number;
  pessoa_id: number;
  pessoa_nome: string;
  pessoa_cpf: string;
  pessoa_telefone: string;
  competencia_ano_mes: string;
  valor_centavos: number;
  status: string;
  created_at: string;
  cobranca_id: number | null;
};

type Props = {
  onSelect: (sel: {
    tipo: "COBRANCA" | "RECEBIMENTO";
    id: number;
    cobrancaId?: number | null;
    pessoaId: number;
  }) => void;
};

function brlFromCentavos(v: number): string {
  const n = v / 100;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ReciboBusca({ onSelect }: Props) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<Item[]>([]);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const v = q.trim();
    if (v.length < 2) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      return;
    }

    setLoading(true);
    setOpen(true);

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/documentos/busca-recibo?q=${encodeURIComponent(v)}&limit=20`, {
          signal: ac.signal,
          cache: "no-store",
        });
        const json = (await res.json()) as { ok: boolean; items?: Item[] };
        setItems(json.items ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q]);

  const cobrancas = items.filter((i) => i.tipo === "COBRANCA");
  const recebimentos = items.filter((i) => i.tipo === "RECEBIMENTO");

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700">
        Buscar por pessoa, CPF, telefone, competencia ou ID
      </label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder='Ex.: "Maria", "123.456...", "91 9xxxx", "2026-02", "9876"'
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-slate-400 focus:outline-none"
      />

      {open && (loading || items.length > 0) && (
        <div className="absolute z-20 mt-2 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500">
            <span>{loading ? "Buscando..." : `${items.length} resultado(s)`}</span>
            <span className="text-slate-400">Clique para selecionar</span>
          </div>

          {cobrancas.length > 0 && (
            <div className="border-t border-slate-100">
              <div className="px-3 py-2 text-xs font-semibold text-slate-700">Cobrancas</div>
              {cobrancas.map((it) => (
                <button
                  key={`c:${it.ref_id}`}
                  type="button"
                  onClick={() => {
                    setQ("");
                    setOpen(false);
                    onSelect({ tipo: "COBRANCA", id: it.ref_id, pessoaId: it.pessoa_id });
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-900">
                      {it.pessoa_nome} <span className="text-slate-400">|</span> Cobranca #{it.ref_id}
                    </div>
                    <div className="text-sm text-slate-900">{brlFromCentavos(it.valor_centavos)}</div>
                  </div>
                  <div className="text-xs text-slate-600">
                    {it.pessoa_cpf ? `CPF: ${it.pessoa_cpf} | ` : ""}
                    {it.pessoa_telefone ? `Tel: ${it.pessoa_telefone} | ` : ""}
                    {it.competencia_ano_mes ? `Comp: ${it.competencia_ano_mes} | ` : ""}
                    Status: {it.status}
                  </div>
                </button>
              ))}
            </div>
          )}

          {recebimentos.length > 0 && (
            <div className="border-t border-slate-100">
              <div className="px-3 py-2 text-xs font-semibold text-slate-700">Recebimentos</div>
              {recebimentos.map((it) => (
                <button
                  key={`r:${it.ref_id}`}
                  type="button"
                  onClick={() => {
                    setQ("");
                    setOpen(false);
                    onSelect({ tipo: "RECEBIMENTO", id: it.ref_id, cobrancaId: it.cobranca_id, pessoaId: it.pessoa_id });
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-900">
                      {it.pessoa_nome} <span className="text-slate-400">|</span> Recebimento #{it.ref_id}
                      {it.cobranca_id ? <span className="text-slate-500"> (Cobranca #{it.cobranca_id})</span> : null}
                    </div>
                    <div className="text-sm text-slate-900">{brlFromCentavos(it.valor_centavos)}</div>
                  </div>
                  <div className="text-xs text-slate-600">
                    {it.pessoa_cpf ? `CPF: ${it.pessoa_cpf} | ` : ""}
                    {it.pessoa_telefone ? `Tel: ${it.pessoa_telefone} | ` : ""}
                    {it.competencia_ano_mes ? `Comp: ${it.competencia_ano_mes} | ` : ""}
                    Status: {it.status}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="border-t border-slate-100 px-3 py-3 text-sm text-slate-600">
              Nenhum resultado. Tente nome, CPF, telefone, competencia (YYYY-MM) ou ID.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

