"use client";

import * as React from "react";

type Pessoa = {
  id: number;
  nome: string | null;
  cpf: string | null;
};

type Props = {
  valuePessoaId: number | null;
  onChangePessoaId: (id: number | null) => void;
  placeholder?: string;
  createHref?: string;
  disabled?: boolean;
};

function formatCpf(cpf: string | null): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function PessoaAutocomplete({
  valuePessoaId,
  onChangePessoaId,
  placeholder = "Buscar pessoa (2+ caracteres)...",
  createHref = "/admin/pessoas/nova",
  disabled,
}: Props): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<Pessoa[]>([]);
  const [selected, setSelected] = React.useState<Pessoa | null>(null);

  React.useEffect(() => {
    if (!valuePessoaId) {
      setSelected(null);
      return;
    }
    const found = items.find((p) => p.id === valuePessoaId) ?? null;
    if (found) setSelected(found);
  }, [valuePessoaId, items]);

  React.useEffect(() => {
    let alive = true;

    async function fetchPessoas(): Promise<void> {
      const q = query.trim();
      if (q.length < 2) {
        setItems([]);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/pessoas/search?q=${encodeURIComponent(q)}&limit=20`);
        if (!res.ok) return;
        const json = (await res.json()) as { pessoas: Pessoa[] };
        if (!alive) return;
        setItems(Array.isArray(json.pessoas) ? json.pessoas : []);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    void fetchPessoas();
    return () => {
      alive = false;
    };
  }, [query]);

  const selectedLabel = selected?.nome?.trim()
    ? selected.nome
    : valuePessoaId
      ? `Pessoa ID: ${valuePessoaId}`
      : "Nenhuma pessoa selecionada";

  return (
    <div className="w-full">
      <div className="relative">
        <input
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          disabled={disabled}
        />

        {open && query.trim().length >= 2 ? (
          <div className="absolute z-20 mt-2 w-full rounded-md border bg-white shadow-sm">
            <div className="px-3 py-2 text-xs text-gray-500">
              {loading
                ? "Buscando..."
                : items.length === 0
                  ? "Nenhuma pessoa encontrada."
                  : "Resultados"}
            </div>

            {items.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                {items.map((p) => {
                  const cpfFmt = formatCpf(p.cpf);
                  const nome = p.nome?.trim() || "(Sem nome)";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="flex w-full flex-col border-t px-3 py-2 text-left text-sm hover:bg-gray-50"
                      onClick={() => {
                        onChangePessoaId(p.id);
                        setSelected(p);
                        setQuery(nome);
                        setOpen(false);
                      }}
                    >
                      <span className="font-medium">{nome}</span>
                      <span className="text-xs text-gray-500">
                        Pessoa ID: {p.id}
                        {cpfFmt ? ` - CPF: ${cpfFmt}` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {items.length === 0 && !loading ? (
              <div className="border-t px-3 py-2 text-xs">
                <a className="text-blue-600 underline" href={createHref}>
                  Criar pessoa
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{selectedLabel}</span>
        <a className="text-blue-600 underline" href={createHref}>
          Criar pessoa
        </a>
      </div>
    </div>
  );
}
