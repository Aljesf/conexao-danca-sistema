"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ProjetoSocial = {
  id: number;
  nome: string;
  descricao: string | null;
  ativo: boolean;
};

type ApiResp<T> = { ok: true; data: T } | { ok: false; error: string; detail?: string | null };

export function ProjetoSocialAutocomplete(props: {
  label?: string;
  placeholder?: string;
  valueId: number | null;
  valueLabel: string;
  onChange: (p: ProjetoSocial | null) => void;
  initialQuery?: string;
  disabled?: boolean;
}) {
  const {
    label = "Projeto social (busca por nome)",
    placeholder = "Digite 2+ caracteres...",
    valueId,
    valueLabel,
    onChange,
    initialQuery,
    disabled,
  } = props;

  const [query, setQuery] = useState(initialQuery ?? valueLabel ?? "");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ProjetoSocial[]>([]);
  const [open, setOpen] = useState(false);

  const boxRef = useRef<HTMLDivElement | null>(null);

  const canSearch = useMemo(() => query.trim().length >= 2, [query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const el = e.target as Node | null;
      if (boxRef.current && el && !boxRef.current.contains(el)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!canSearch || disabled) {
        setItems([]);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(`/api/projetos-sociais/busca?nome=${encodeURIComponent(query.trim())}`);
        const json = (await res.json()) as ApiResp<ProjetoSocial[]>;
        if (cancelled) return;

        if (json.ok) {
          setItems(json.data);
          setOpen(true);
        } else {
          setItems([]);
          setOpen(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const t = window.setTimeout(run, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, canSearch, disabled]);

  return (
    <div className="space-y-1" ref={boxRef}>
      <label className="text-sm">{label}</label>

      <div className="relative">
        <input
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={query}
          disabled={disabled}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (valueId !== null) onChange(null);
          }}
          placeholder={placeholder}
        />

        {open ? (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-3 py-2 text-xs text-muted-foreground">
              <span>{loading ? "Buscando..." : canSearch ? "Selecione um projeto" : "Digite 2+ caracteres"}</span>
              {valueId ? <span>Selecionado: #{valueId}</span> : null}
            </div>

            <div className="max-h-56 overflow-auto">
              {items.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    onChange(p);
                    setQuery(p.nome);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">{p.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    #{p.id} {p.descricao ? `- ${p.descricao}` : ""}
                  </span>
                </button>
              ))}

              {items.length === 0 && canSearch && !loading ? (
                <div className="px-3 py-3 text-sm text-muted-foreground">Nenhum projeto social encontrado.</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {valueId ? (
        <p className="text-xs text-muted-foreground">
          Selecionado: <span className="font-medium">{valueLabel}</span> (#{valueId})
        </p>
      ) : null}
    </div>
  );
}
