"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";

type Insumo = { id: number; nome: string; unidade_base: string };
type ContaFin = { id: number; codigo: string; nome: string; tipo: string };
type Categoria = { id: number; codigo: string; nome: string };
type CompraRow = {
  id: number;
  data_compra: string;
  onde_comprei: string;
  valor_total_centavos: number;
  status?: string | null;
  cancelada_em?: string | null;
};
type Item = {
  insumo_id: number | null;
  quantidade: string;
  valor_total_brl: string;
  validade: string;
};

function parseBRLToCentavos(input: string): number {
  const clean = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

function formatBRLFromCentavos(v: number): string {
  return (Number(v || 0) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminCafeComprasPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [contas, setContas] = useState<ContaFin[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [compras, setCompras] = useState<CompraRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [dataCompra, setDataCompra] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [ondeComprei, setOndeComprei] = useState("");
  const [contaId, setContaId] = useState<number | "">("");
  const [categoriaId, setCategoriaId] = useState<number | "">("");

  const [itens, setItens] = useState<Item[]>([
    { insumo_id: null, quantidade: "", valor_total_brl: "", validade: "" },
  ]);

  const totalCentavos = useMemo(
    () => itens.reduce((acc, it) => acc + parseBRLToCentavos(it.valor_total_brl), 0),
    [itens]
  );

  async function loadBase() {
    setLoading(true);
    setError(null);
    try {
      const [aRes, bRes, cRes, dRes] = await Promise.all([
        fetch("/api/cafe/insumos"),
        fetch("/api/cafe/contas-financeiras"),
        fetch("/api/cafe/categorias-despesa"),
        fetch("/api/cafe/compras"),
      ]);

      const [a, b, c, d] = await Promise.all([aRes.json(), bRes.json(), cRes.json(), dRes.json()]);

      if (!aRes.ok) throw new Error(a?.error ?? "Falha ao carregar insumos.");
      if (!bRes.ok || b?.ok === false) throw new Error(b?.error ?? "Falha ao carregar contas.");
      if (!cRes.ok || c?.ok === false) throw new Error(c?.error ?? "Falha ao carregar categorias.");
      if (!dRes.ok || d?.ok === false) throw new Error(d?.error ?? "Falha ao carregar compras.");

      setInsumos(Array.isArray(a?.data) ? a.data : []);
      setContas(Array.isArray(b?.data) ? b.data : []);
      setCategorias(Array.isArray(c?.data) ? c.data : []);
      setCompras(Array.isArray(d?.data) ? d.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBase();
  }, []);

  function addItem() {
    setItens((prev) => [...prev, { insumo_id: null, quantidade: "", valor_total_brl: "", validade: "" }]);
  }

  function removeItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function calcUnitPreview(idx: number): string {
    const it = itens[idx];
    const qtd = Number((it.quantidade || "").replace(",", "."));
    const tot = parseBRLToCentavos(it.valor_total_brl);
    if (!Number.isFinite(qtd) || qtd <= 0) return "-";
    const cu = Math.round(tot / qtd);
    return `${formatBRLFromCentavos(cu)} / unidade`;
  }

  async function registrarCompra() {
    setError(null);
    setMessage(null);

    if (!ondeComprei.trim()) {
      setError("Onde comprei obrigatorio.");
      return;
    }

    if (contaId === "") {
      setError("Conta do cafe obrigatoria.");
      return;
    }

    const payloadItens = itens.map((it, idx) => {
      const qtd = Number((it.quantidade || "").replace(",", "."));
      const valorTotal = parseBRLToCentavos(it.valor_total_brl);

      if (!it.insumo_id) throw new Error(`Insumo obrigatorio (item ${idx + 1}).`);
      if (!Number.isFinite(qtd) || qtd <= 0) throw new Error(`Quantidade invalida (item ${idx + 1}).`);
      if (!Number.isFinite(valorTotal) || valorTotal < 0)
        throw new Error(`Valor total invalido (item ${idx + 1}).`);

      return {
        insumo_id: it.insumo_id,
        quantidade: qtd,
        valor_total_centavos: valorTotal,
        validade: it.validade ? it.validade : null,
      };
    });

    const payload: Record<string, unknown> = {
      onde_comprei: ondeComprei,
      conta_financeira_id: contaId,
      categoria_financeira_id: categoriaId === "" ? null : categoriaId,
      itens: payloadItens,
    };

    if (dataCompra) {
      payload.data_compra = dataCompra;
    }

    const res = await fetch("/api/cafe/compras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Falha ao registrar compra.");
      return;
    }

    setOndeComprei("");
    setCategoriaId("");
    setItens([{ insumo_id: null, quantidade: "", valor_total_brl: "", validade: "" }]);
    setMessage("Compra registrada.");
    await loadBase();
  }

  async function cancelarCompra(compraId: number) {
    setError(null);
    setMessage(null);

    const ok = window.confirm("Deseja cancelar esta compra? Essa acao reverte o estoque.");
    if (!ok) return;

    const motivo = window.prompt("Motivo do cancelamento (opcional):", "") ?? "";

    const res = await fetch(`/api/cafe/compras/${compraId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });

    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Falha ao cancelar compra.");
      return;
    }

    setMessage("Compra cancelada.");
    await loadBase();
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        eyebrow="Gestão do Café"
        title="Gestão do Ballet Café — Compras de insumos"
        description="Registre compras por valor total e quantidade. O sistema calcula o custo unitário e abastece o estoque."
      />

      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {message ? <div className="text-sm text-emerald-700">{message}</div> : null}

      <SectionCard title="Nova compra">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-sm font-medium">Data</label>
            <input
              className="mt-1 w-full rounded-md border p-2"
              value={dataCompra}
              onChange={(e) => setDataCompra(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium">Onde comprei</label>
            <input
              className="mt-1 w-full rounded-md border p-2"
              value={ondeComprei}
              onChange={(e) => setOndeComprei(e.target.value)}
              placeholder="ex.: Padaria X / Feira / Mercado"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Conta (Cafe)</label>
            <select
              className="mt-1 w-full rounded-md border p-2"
              value={contaId}
              onChange={(e) => setContaId(e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Selecione...</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} — {c.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">Categoria de despesa (opcional)</label>
          <select
            className="mt-1 w-full rounded-md border p-2"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">(sem categoria)</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome} ({c.codigo})
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-700">Itens</h3>
          <div className="mt-2 space-y-3">
            {itens.map((it, idx) => (
              <div key={idx} className="rounded-lg border p-3">
                <div className="grid gap-3 md:grid-cols-5">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">Insumo</label>
                    <select
                      className="mt-1 w-full rounded-md border p-2"
                      value={it.insumo_id ?? ""}
                      onChange={(e) =>
                        updateItem(idx, { insumo_id: e.target.value ? Number(e.target.value) : null })
                      }
                    >
                      <option value="">Selecione...</option>
                      {insumos.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nome} ({i.unidade_base})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Quantidade</label>
                    <input
                      className="mt-1 w-full rounded-md border p-2"
                      value={it.quantidade}
                      onChange={(e) => updateItem(idx, { quantidade: e.target.value })}
                      placeholder="ex.: 10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Valor total (R$)</label>
                    <input
                      className="mt-1 w-full rounded-md border p-2"
                      value={it.valor_total_brl}
                      onChange={(e) => updateItem(idx, { valor_total_brl: e.target.value })}
                      placeholder="ex.: 13,00"
                    />
                    <div className="mt-1 text-xs text-slate-500">Unitario: {calcUnitPreview(idx)}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Validade (opcional)</label>
                    <input
                      className="mt-1 w-full rounded-md border p-2"
                      value={it.validade}
                      onChange={(e) => updateItem(idx, { validade: e.target.value })}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-between">
                  <button
                    className="text-sm text-slate-600 hover:underline"
                    onClick={() => removeItem(idx)}
                    disabled={itens.length <= 1}
                  >
                    Remover item
                  </button>
                  <button className="text-sm text-violet-700 hover:underline" onClick={addItem}>
                    + Adicionar insumo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-slate-700">
            Total: <span className="font-semibold">{formatBRLFromCentavos(totalCentavos)}</span>
          </div>
          <button
            className="rounded-md bg-violet-600 px-4 py-2 text-white hover:bg-violet-700"
            onClick={() => void registrarCompra()}
            disabled={loading}
          >
            Registrar compra
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Compras recentes">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2 text-left">Data</th>
                <th className="px-2 py-2 text-left">Onde</th>
                <th className="px-2 py-2 text-right">Total</th>
                <th className="px-2 py-2 text-left">Status</th>
                <th className="px-2 py-2 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-2 py-2">{c.data_compra}</td>
                  <td className="px-2 py-2">{c.onde_comprei}</td>
                  <td className="px-2 py-2 text-right">{formatBRLFromCentavos(c.valor_total_centavos)}</td>
                  <td className="px-2 py-2">{c.status ?? "ATIVA"}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      className="text-sm text-red-600 hover:underline disabled:text-slate-400"
                      onClick={() => void cancelarCompra(c.id)}
                      disabled={c.status === "CANCELADA"}
                    >
                      Cancelar
                    </button>
                  </td>
                </tr>
              ))}
              {compras.length === 0 && !loading ? (
                <tr className="border-t">
                  <td className="px-2 py-3 text-slate-500" colSpan={5}>
                    Nenhuma compra registrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {loading ? <p className="mt-3 text-sm text-slate-600">Carregando...</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
