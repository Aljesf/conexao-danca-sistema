"use client";

import React, { useEffect, useMemo, useState } from "react";

type TipoCadastro = "marcas" | "cores" | "numeracoes" | "tamanhos" | "modelos";

type Props = {
  tipo: TipoCadastro;
  titulo: string;
  descricao?: string;
};

export default function CadastroSimples({ tipo }: Props) {
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);

  async function carregar() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("tipo", tipo);
      if (q.trim()) qs.set("q", q.trim());
      const res = await fetch(`/api/loja/cadastros?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        alert(json?.error || "Erro ao carregar");
        return;
      }
      setItems(json?.items || []);
    } catch (error) {
      console.error("Erro ao carregar cadastros", error);
      alert("Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const filtrados = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((x) => JSON.stringify(x).toLowerCase().includes(term));
  }, [items, q]);

  async function criar(payload: any) {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("tipo", tipo);

      const res = await fetch(`/api/loja/cadastros?${qs.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "Erro ao criar");
        return;
      }
      await carregar();
    } finally {
      setLoading(false);
    }
  }

  async function salvar(id: number, patch: any) {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("tipo", tipo);

      const res = await fetch(`/api/loja/cadastros/${id}?${qs.toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || "Erro ao salvar");
        return;
      }
      await carregar();
    } finally {
      setLoading(false);
    }
  }

  const FormNovo = () => {
    if (tipo === "numeracoes") return <FormNumeracao onCreate={criar} loading={loading} />;
    if (tipo === "tamanhos") return <FormTamanho onCreate={criar} loading={loading} />;
    if (tipo === "cores") return <FormCor onCreate={criar} loading={loading} />;
    return <FormNome onCreate={criar} loading={loading} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="w-full md:w-80 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
          />

          <button
            type="button"
            onClick={carregar}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
          >
            {loading ? "Carregando..." : "Recarregar"}
          </button>
        </div>

        <div className="text-xs font-medium text-slate-500 md:text-sm">{filtrados.length} registro(s)</div>
      </div>

      <div className="rounded-3xl border border-violet-100 bg-white/95 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">Novo registro</h3>
        <div className="mt-4">{FormNovo()}</div>
      </div>

      <div className="rounded-3xl border border-violet-100 bg-white/95 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left">
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th>

                {tipo !== "numeracoes" && (
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</th>
                )}

                {tipo === "cores" && (
                  <>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Codigo</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">HEX</th>
                  </>
                )}

                {tipo === "numeracoes" && (
                  <>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</th>
                  </>
                )}

                {tipo === "tamanhos" && (
                  <>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Tipo</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Ordem</th>
                  </>
                )}

                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Ativo</th>
                <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Acoes</th>
              </tr>
            </thead>

            <tbody>
              {filtrados.map((r) => (
                <RowEditor key={r.id} tipo={tipo} row={r} onSave={salvar} />
              ))}

              {filtrados.length === 0 && (
                <tr>
                  <td className="px-5 py-10 text-slate-500" colSpan={8}>
                    Nenhum registro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* -----------------------
Forms
------------------------ */

function PrimaryButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-70"
    >
      {children}
    </button>
  );
}

function FormNome({ onCreate, loading }: { onCreate: (p: any) => void; loading: boolean }) {
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="flex-1">
        <p className="text-sm text-slate-400">Nome</p>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Digite o nome..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
        />
      </div>

      <label className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-700 md:mt-0">
        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
        Ativo
      </label>

      <div className="mt-2 md:mt-6">
        <PrimaryButton
          disabled={loading || !nome.trim()}
          onClick={() => {
            onCreate({ nome: nome.trim(), ativo });
            setNome("");
            setAtivo(true);
          }}
        >
          Criar
        </PrimaryButton>
      </div>
    </div>
  );
}

function FormCor({ onCreate, loading }: { onCreate: (p: any) => void; loading: boolean }) {
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [hex, setHex] = useState("");
  const [ativo, setAtivo] = useState(true);

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <div className="md:col-span-2">
        <p className="text-sm text-slate-400">Nome</p>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Rosa"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
        />
      </div>

      <div>
        <p className="text-sm text-slate-400">Codigo</p>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="ROS"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
        />
      </div>

      <div>
        <p className="text-sm text-slate-400">HEX</p>
        <input
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          placeholder="#FFB6C1"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
        />
      </div>

      <div className="flex items-end justify-between gap-3 md:justify-end">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo
        </label>

        <PrimaryButton
          disabled={loading || !nome.trim()}
          onClick={() => {
            onCreate({ nome: nome.trim(), codigo: codigo.trim() || null, hex: hex.trim() || null, ativo });
            setNome("");
            setCodigo("");
            setHex("");
            setAtivo(true);
          }}
        >
          Criar
        </PrimaryButton>
      </div>
    </div>
  );
}

function FormNumeracao({ onCreate, loading }: { onCreate: (p: any) => void; loading: boolean }) {
  const [valor, setValor] = useState("");
  const [tipo, setTipo] = useState("CALCADO");
  const [ativo, setAtivo] = useState(true);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div>
        <p className="text-sm text-slate-400">Valor</p>
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="36"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
        />
      </div>

      <div>
        <p className="text-sm text-slate-400">Tipo</p>
        <input
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          placeholder="CALCADO"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
        />
      </div>

      <div className="flex items-end">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo
        </label>
      </div>

      <div className="flex items-end justify-end">
        <PrimaryButton
          disabled={loading || !valor.trim()}
          onClick={() => {
            onCreate({ valor: Number(valor), tipo: tipo.trim().toUpperCase() || "CALCADO", ativo });
            setValor("");
            setTipo("CALCADO");
            setAtivo(true);
          }}
        >
          Criar
        </PrimaryButton>
      </div>
    </div>
  );
}

function FormTamanho({ onCreate, loading }: { onCreate: (p: any) => void; loading: boolean }) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("ROUPA");
  const [ordem, setOrdem] = useState("0");
  const [ativo, setAtivo] = useState(true);

  return (
    <div className="grid gap-4 md:grid-cols-6">
      <div className="md:col-span-2">
        <p className="text-sm text-slate-400">Nome</p>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="P"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
        />
      </div>

      <div className="md:col-span-2">
        <p className="text-sm text-slate-400">Tipo</p>
        <input
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          placeholder="ROUPA"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
        />
      </div>

      <div>
        <p className="text-sm text-slate-400">Ordem</p>
        <input
          value={ordem}
          onChange={(e) => setOrdem(e.target.value)}
          placeholder="0"
          className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
        />
      </div>

      <div className="flex items-end justify-between gap-3 md:justify-end">
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo
        </label>

        <PrimaryButton
          disabled={loading || !nome.trim()}
          onClick={() => {
            onCreate({ nome: nome.trim(), tipo: tipo.trim().toUpperCase() || "ROUPA", ordem: Number(ordem || "0"), ativo });
            setNome("");
            setTipo("ROUPA");
            setOrdem("0");
            setAtivo(true);
          }}
        >
          Criar
        </PrimaryButton>
      </div>
    </div>
  );
}

/* -----------------------
Row editor
------------------------ */

function RowEditor({
  tipo,
  row,
  onSave,
}: {
  tipo: TipoCadastro;
  row: any;
  onSave: (id: number, patch: any) => void;
}) {
  const [draft, setDraft] = useState<any>(row);
  useEffect(() => setDraft(row), [row]);

  return (
    <tr className="border-t border-slate-100">
      <td className="px-5 py-3 text-slate-700">{draft.id}</td>

      {tipo !== "numeracoes" && (
        <td className="px-5 py-3">
          <input
            value={draft.nome ?? ""}
            onChange={(e) => setDraft((p: any) => ({ ...p, nome: e.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
          />
        </td>
      )}

      {tipo === "cores" && (
        <>
          <td className="px-5 py-3">
            <input
              value={draft.codigo ?? ""}
              onChange={(e) => setDraft((p: any) => ({ ...p, codigo: e.target.value }))}
              className="w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            />
          </td>
          <td className="px-5 py-3">
            <input
              value={draft.hex ?? ""}
              onChange={(e) => setDraft((p: any) => ({ ...p, hex: e.target.value }))}
              className="w-40 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            />
          </td>
        </>
      )}

      {tipo === "numeracoes" && (
        <>
          <td className="px-5 py-3">
            <input
              value={draft.tipo ?? ""}
              onChange={(e) => setDraft((p: any) => ({ ...p, tipo: e.target.value }))}
              className="w-40 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            />
          </td>
          <td className="px-5 py-3">
            <input
              value={String(draft.valor ?? "")}
              onChange={(e) => setDraft((p: any) => ({ ...p, valor: e.target.value }))}
              className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            />
          </td>
        </>
      )}

      {tipo === "tamanhos" && (
        <>
          <td className="px-5 py-3">
            <input
              value={draft.tipo ?? ""}
              onChange={(e) => setDraft((p: any) => ({ ...p, tipo: e.target.value }))}
              className="w-40 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            />
          </td>
          <td className="px-5 py-3">
            <input
              value={String(draft.ordem ?? 0)}
              onChange={(e) => setDraft((p: any) => ({ ...p, ordem: e.target.value }))}
              className="w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            />
          </td>
        </>
      )}

      <td className="px-5 py-3">
        <input
          type="checkbox"
          checked={!!draft.ativo}
          onChange={(e) => setDraft((p: any) => ({ ...p, ativo: e.target.checked }))}
        />
      </td>

      <td className="px-5 py-3">
        <button
          type="button"
          onClick={() => {
            const patch: any = { ativo: !!draft.ativo };

            if (tipo === "numeracoes") {
              patch.tipo = String(draft.tipo || "").trim().toUpperCase();
              patch.valor = Number(draft.valor);
            } else if (tipo === "tamanhos") {
              patch.nome = String(draft.nome || "").trim();
              patch.tipo = String(draft.tipo || "").trim().toUpperCase();
              patch.ordem = Number(draft.ordem);
            } else if (tipo === "cores") {
              patch.nome = String(draft.nome || "").trim();
              patch.codigo = String(draft.codigo || "").trim() || null;
              patch.hex = String(draft.hex || "").trim() || null;
            } else {
              patch.nome = String(draft.nome || "").trim();
            }

            onSave(draft.id, patch);
          }}
          className="inline-flex items-center rounded-full bg-violet-600 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-violet-700"
        >
          Salvar
        </button>
      </td>
    </tr>
  );
}
