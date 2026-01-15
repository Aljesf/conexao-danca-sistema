"use client";

import { useEffect, useMemo, useState } from "react";

type PessoaItem = {
  id: number;
  nome: string;
  cpf: string | null;
};

type PessoaBuscaProps = {
  disabled?: boolean;
  onSelect: (payload: { pessoaId: number | null }) => void;
};

export default function PessoaBusca({ disabled, onSelect }: PessoaBuscaProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PessoaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<PessoaItem | null>(null);

  const queryTrim = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (disabled) return;
    if (!queryTrim) {
      setItems([]);
      setErro(null);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      setErro(null);
      try {
        const res = await fetch(`/api/pessoas/busca?q=${encodeURIComponent(queryTrim)}`);
        const json = (await res.json().catch(() => null)) as
          | { items?: PessoaItem[]; error?: string }
          | null;

        if (!res.ok) {
          setErro(json?.error || "erro_ao_buscar");
          setItems([]);
          return;
        }

        setItems(json?.items ?? []);
      } catch (e) {
        setErro("erro_ao_buscar");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [queryTrim, disabled]);

  function handleSelect(item: PessoaItem) {
    setSelecionado(item);
    setItems([]);
    setQuery(item.cpf ? `${item.nome} (${item.cpf})` : item.nome);
    onSelect({ pessoaId: item.id });
  }

  return (
    <div className="space-y-2">
      <label className="text-sm">Destinatario (opcional)</label>
      <input
        className="w-full rounded-lg border px-3 py-2"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelecionado(null);
          onSelect({ pessoaId: null });
        }}
        placeholder="Buscar destinatario por nome ou CPF"
        disabled={disabled}
      />

      {loading ? <div className="text-xs text-slate-500">Carregando...</div> : null}
      {erro ? <div className="text-xs text-red-600">{erro}</div> : null}

      {items.length > 0 ? (
        <div className="rounded-lg border bg-white shadow-sm">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
              onClick={() => handleSelect(item)}
              disabled={disabled}
            >
              <span className="font-medium">{item.nome}</span>
              <span className="text-xs text-slate-500">{item.cpf ?? "-"}</span>
            </button>
          ))}
        </div>
      ) : null}

      {selecionado ? (
        <div className="text-xs text-slate-500">Selecionado: {selecionado.nome}</div>
      ) : null}
    </div>
  );
}
