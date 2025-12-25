"use client";

import { useEffect, useState } from "react";

export type PessoaSearchItem = {
  id: number;
  nome?: string | null;
  email?: string | null;
  cpf?: string | null;
  telefone?: string | null;
  ativo?: boolean | null;
};

type PessoaSearchBoxProps = {
  label: string;
  placeholder?: string;
  valueId: number | null;
  onChange: (pessoa: PessoaSearchItem | null) => void;
  disabled?: boolean;
};

export default function PessoaSearchBox({
  label,
  placeholder,
  valueId,
  onChange,
  disabled = false,
}: PessoaSearchBoxProps) {
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<PessoaSearchItem[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [selecionado, setSelecionado] = useState<PessoaSearchItem | null>(null);

  useEffect(() => {
    if (!valueId) {
      setSelecionado(null);
      return;
    }
    if (selecionado?.id === valueId) return;

    const controller = new AbortController();
    async function carregarSelecionado() {
      try {
        const resp = await fetch(`/api/pessoas/${valueId}`, {
          signal: controller.signal,
          credentials: "include",
        });
        if (!resp.ok) return;
        const data = (await resp.json()) as { data?: PessoaSearchItem };
        if (data?.data) {
          setSelecionado(data.data);
        }
      } catch {
        // noop
      }
    }
    carregarSelecionado();
    return () => controller.abort();
  }, [valueId, selecionado?.id]);

  useEffect(() => {
    if (disabled) return;
    const term = busca.trim();
    if (term.length < 2) {
      setResultados([]);
      return;
    }
    const controller = new AbortController();
    async function run() {
      setBuscando(true);
      try {
        const resp = await fetch(`/api/pessoas/busca?query=${encodeURIComponent(term)}`, {
          signal: controller.signal,
          credentials: "include",
        });
        if (!resp.ok) {
          setResultados([]);
          return;
        }
        const data = (await resp.json()) as { ok: boolean; pessoas: PessoaSearchItem[] };
        setResultados(data.pessoas ?? []);
      } catch (e) {
        if (!controller.signal.aborted) {
          setResultados([]);
        }
      } finally {
        setBuscando(false);
      }
    }
    run();
    return () => controller.abort();
  }, [busca, disabled]);

  if (selecionado) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <div className="text-sm font-semibold">{selecionado.nome ?? "Sem nome"}</div>
          {selecionado.cpf ? <div className="mt-0.5">CPF: {selecionado.cpf}</div> : null}
          {selecionado.email ? <div className="mt-0.5">Email: {selecionado.email}</div> : null}
          {selecionado.telefone ? <div className="mt-0.5">Contato: {selecionado.telefone}</div> : null}
        </div>
        <button
          type="button"
          className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
          onClick={() => {
            setSelecionado(null);
            onChange(null);
          }}
          disabled={disabled}
        >
          Trocar selecao
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full rounded-md border px-3 py-2 text-sm"
        placeholder={placeholder ?? "Buscar pessoa (2+ caracteres)"}
        disabled={disabled}
      />
      {buscando ? <p className="text-[11px] text-muted-foreground">Buscando pessoas...</p> : null}
      <div className="max-h-48 overflow-y-auto rounded-md border">
        {resultados.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setSelecionado(p);
              setBusca("");
              setResultados([]);
              onChange(p);
            }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
            disabled={disabled}
          >
            {p.nome ?? "Sem nome"} (ID {p.id})
          </button>
        ))}
        {!buscando && resultados.length === 0 && busca.trim().length >= 2 ? (
          <div className="p-2">
            <button type="button" className="text-xs text-muted-foreground" disabled>
              Cadastrar nova pessoa (em breve)
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
