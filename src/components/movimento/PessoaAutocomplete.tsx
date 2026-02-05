"use client";

import { useEffect, useMemo, useState } from "react";

export type PessoaSugestao = {
  id: string;
  label: string;
  subLabel?: string | null;
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
  const [q, setQ] = useState(value ? value.label : "");
  const [items, setItems] = useState<PessoaSugestao[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (value) setQ(value.label);
  }, [value]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setOpen(false);
      setErro(null);
      setInfo(term.length === 0 ? null : "Digite pelo menos 2 caracteres para buscar.");
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      setErro(null);
      setInfo(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        const json = (await res.json().catch(() => null)) as
          | {
              ok?: boolean;
              pessoas?: Array<{
                id: number;
                nome: string | null;
                email: string | null;
                cpf: string | null;
                cnpj?: string | null;
              }>;
              error?: string;
            }
          | null;

        if (!res.ok || !json?.ok) {
          setErro("Falha na busca.");
          setItems([]);
          setOpen(false);
          return;
        }

        const pessoas = Array.isArray(json.pessoas) ? json.pessoas : [];
        const mapped: PessoaSugestao[] = pessoas.map((p) => {
          const label = p.nome ?? `Pessoa #${p.id}`;
          const subLabel = p.email ?? p.cpf ?? p.cnpj ?? (p.id ? `ID ${p.id}` : null);
          return { id: String(p.id), label, subLabel };
        });

        setItems(mapped);
        setOpen(true);
        if (mapped.length === 0) {
          setInfo("Nenhuma pessoa encontrada.");
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q]);

  const hint = useMemo(() => {
    if (loading) return "Buscando...";
    return null;
  }, [loading]);

  function select(p: PessoaSugestao) {
    onChange(p);
    setQ(p.label);
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
            if (erro) setErro(null);
            if (info) setInfo(null);
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
                    <div className="font-medium text-slate-900">{p.label}</div>
                    <div className="text-xs text-slate-600">
                      {p.subLabel ?? `ID: ${p.id}`}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>

      {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
      {info ? <div className="text-xs text-slate-500">{info}</div> : null}
      {erro ? <div className="text-xs text-rose-600">{erro}</div> : null}

      {value ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
          Selecionado: <span className="font-medium">{value.label}</span> - Pessoa ID:{" "}
          <span className="font-medium">{value.id}</span>
        </div>
      ) : null}
    </div>
  );
}
