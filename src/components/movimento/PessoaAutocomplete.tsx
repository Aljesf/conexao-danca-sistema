"use client";

import { useEffect, useMemo, useState } from "react";

export type PessoaSugestao = {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
};

type Props = {
  label: string;
  value: PessoaSugestao | null;
  onChange: (p: PessoaSugestao | null) => void;
  placeholder?: string;
  criarHref?: string;
};

export function PessoaAutocomplete({
  label,
  value,
  onChange,
  placeholder,
  criarHref,
}: Props) {
  const [q, setQ] = useState(value ? value.nome : "");
  const [items, setItems] = useState<PessoaSugestao[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value) setQ(value.nome);
  }, [value]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) {
      setItems([]);
      setOpen(false);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/movimento/pessoas/buscar?q=${encodeURIComponent(term)}`
        );
        const json = (await res.json()) as {
          ok: boolean;
          data: PessoaSugestao[];
        };
        setItems(json.ok ? json.data : []);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q]);

  const hint = useMemo(() => {
    if (q.trim().length < 3) return "Digite pelo menos 3 letras para buscar.";
    if (loading) return "Buscando...";
    if (open && items.length === 0) return "Nenhuma pessoa encontrada.";
    return null;
  }, [q, loading, open, items.length]);

  function select(p: PessoaSugestao) {
    onChange(p);
    setQ(p.nome);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQ("");
    setItems([]);
    setOpen(false);
  }

  return (
    <div className="space-y-1">
      <label className="text-sm text-slate-700">{label}</label>

      <div className="relative">
        <input
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (value) onChange(null);
          }}
          placeholder={placeholder ?? "Digite nome, CPF ou email"}
          onFocus={() => {
            if (items.length > 0) setOpen(true);
          }}
        />

        {value ? (
          <button
            type="button"
            className="absolute right-2 top-2 text-xs text-slate-600 hover:text-slate-900"
            onClick={clear}
            aria-label="Limpar pessoa selecionada"
          >
            Limpar
          </button>
        ) : null}

        {open ? (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {items.length === 0 ? (
              <div className="p-3 text-sm text-slate-600">
                Nenhuma pessoa encontrada.
                {criarHref ? (
                  <a
                    className="ml-2 font-medium text-purple-700 hover:underline"
                    href={criarHref}
                  >
                    Criar pessoa
                  </a>
                ) : null}
              </div>
            ) : (
              <ul className="max-h-72 overflow-auto">
                {items.map((p) => (
                  <li
                    key={p.id}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={() => select(p)}
                  >
                    <div className="font-medium text-slate-900">{p.nome}</div>
                    <div className="text-xs text-slate-600">
                      ID: {p.id}
                      {p.cpf ? ` • CPF: ${p.cpf}` : ""}
                      {p.email ? ` • ${p.email}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}

      {value ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          Selecionado: <span className="font-medium">{value.nome}</span> •
          Pessoa ID: <span className="font-medium">{value.id}</span>
        </div>
      ) : null}
    </div>
  );
}
