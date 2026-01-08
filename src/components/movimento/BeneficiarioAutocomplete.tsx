"use client";

import { useEffect, useMemo, useState } from "react";

export type BeneficiarioSugestao = {
  beneficiario_id: string;
  pessoa_id: string;
  status: string;
  pessoa_nome: string | null;
  pessoa_cpf: string | null;
  pessoa_email: string | null;
};

type Props = {
  value: BeneficiarioSugestao | null;
  onChange: (b: BeneficiarioSugestao | null) => void;
  criarBeneficiarioHref?: string;
};

export function BeneficiarioAutocomplete({
  value,
  onChange,
  criarBeneficiarioHref,
}: Props) {
  const [q, setQ] = useState(value?.pessoa_nome ?? "");
  const [items, setItems] = useState<BeneficiarioSugestao[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value?.pessoa_nome) setQ(value.pessoa_nome);
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
          `/api/admin/movimento/beneficiarios/buscar?q=${encodeURIComponent(
            term
          )}`
        );
        const json = (await res.json()) as {
          ok: boolean;
          data: BeneficiarioSugestao[];
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
    if (q.trim().length < 3)
      return "Digite pelo menos 3 letras para buscar beneficiario.";
    if (loading) return "Buscando...";
    if (open && items.length === 0) return "Nenhum beneficiario encontrado.";
    return null;
  }, [q, loading, open, items.length]);

  function select(b: BeneficiarioSugestao) {
    onChange(b);
    setQ(b.pessoa_nome ?? b.pessoa_id);
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
      <label className="text-sm text-slate-700">
        Beneficiario (buscar por pessoa)
      </label>

      <div className="relative">
        <input
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (value) onChange(null);
          }}
          placeholder="Digite nome, CPF ou email"
          onFocus={() => {
            if (items.length > 0) setOpen(true);
          }}
        />

        {value ? (
          <button
            type="button"
            className="absolute right-2 top-2 text-xs text-slate-600 hover:text-slate-900"
            onClick={clear}
          >
            Limpar
          </button>
        ) : null}

        {open ? (
          <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            {items.length === 0 ? (
              <div className="p-3 text-sm text-slate-600">
                Nenhum beneficiario encontrado.
                {criarBeneficiarioHref ? (
                  <a
                    className="ml-2 font-medium text-purple-700 hover:underline"
                    href={criarBeneficiarioHref}
                  >
                    Cadastrar beneficiario
                  </a>
                ) : null}
              </div>
            ) : (
              <ul className="max-h-72 overflow-auto">
                {items.map((b) => (
                  <li
                    key={b.beneficiario_id}
                    className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={() => select(b)}
                  >
                    <div className="font-medium text-slate-900">
                      {b.pessoa_nome ?? `Pessoa ${b.pessoa_id}`} •{" "}
                      <span className="text-slate-600">{b.status}</span>
                    </div>
                    <div className="text-xs text-slate-600">
                      Beneficiario: {b.beneficiario_id}
                      {b.pessoa_cpf ? ` • CPF: ${b.pessoa_cpf}` : ""}
                      {b.pessoa_email ? ` • ${b.pessoa_email}` : ""}
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
          Selecionado:{" "}
          <span className="font-medium">
            {value.pessoa_nome ?? value.pessoa_id}
          </span>{" "}
          • Status: <span className="font-medium">{value.status}</span>
        </div>
      ) : null}
    </div>
  );
}
