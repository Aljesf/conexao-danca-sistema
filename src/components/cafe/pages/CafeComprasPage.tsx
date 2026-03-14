"use client";

import { useEffect, useMemo, useState } from "react";
import CafeCard from "@/components/cafe/CafeCard";
import CafePageShell from "@/components/cafe/CafePageShell";
import CafePanel from "@/components/cafe/CafePanel";
import CafeSectionIntro from "@/components/cafe/CafeSectionIntro";
import CafeStatCard from "@/components/cafe/CafeStatCard";
import CafeToolbar from "@/components/cafe/CafeToolbar";

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

const fieldClassName =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70";
const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60";

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
    () => itens.reduce((acc, item) => acc + parseBRLToCentavos(item.valor_total_brl), 0),
    [itens],
  );
  const comprasRecentes = compras.length;

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
    setItens((prev) => prev.filter((_, index) => index !== idx));
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItens((prev) => prev.map((item, index) => (index === idx ? { ...item, ...patch } : item)));
  }

  function calcUnitPreview(idx: number): string {
    const item = itens[idx];
    const qtd = Number((item.quantidade || "").replace(",", "."));
    const tot = parseBRLToCentavos(item.valor_total_brl);
    if (!Number.isFinite(qtd) || qtd <= 0) return "-";
    const custoUnitario = Math.round(tot / qtd);
    return `${formatBRLFromCentavos(custoUnitario)} / unidade`;
  }

  async function registrarCompra() {
    setError(null);
    setMessage(null);

    if (!ondeComprei.trim()) {
      setError("Onde comprei é obrigatório.");
      return;
    }

    if (contaId === "") {
      setError("A conta do café é obrigatória.");
      return;
    }

    const payloadItens = itens.map((item, idx) => {
      const qtd = Number((item.quantidade || "").replace(",", "."));
      const valorTotal = parseBRLToCentavos(item.valor_total_brl);

      if (!item.insumo_id) throw new Error(`Insumo obrigatório (item ${idx + 1}).`);
      if (!Number.isFinite(qtd) || qtd <= 0) throw new Error(`Quantidade inválida (item ${idx + 1}).`);
      if (!Number.isFinite(valorTotal) || valorTotal < 0) {
        throw new Error(`Valor total inválido (item ${idx + 1}).`);
      }

      return {
        insumo_id: item.insumo_id,
        quantidade: qtd,
        valor_total_centavos: valorTotal,
        validade: item.validade ? item.validade : null,
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

    const ok = window.confirm("Deseja cancelar esta compra? Essa ação reverte o estoque.");
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
    <CafePageShell
      eyebrow="Gestão do Café"
      title="Gestão do Ballet Café - Compras de insumos"
      description="Registre compras por valor total e quantidade, mantendo o abastecimento operacional com mais contexto visual."
      summary={
        <>
          <CafeStatCard
            label="Compras recentes"
            value={comprasRecentes}
            description="Base atual de compras registradas no módulo."
          />
          <CafeStatCard
            label="Abastecimento manual"
            value={itens.length}
            description="Itens prontos para lançamento na compra em edição."
          />
          <CafeStatCard
            label="Impacto em estoque"
            value={formatBRLFromCentavos(totalCentavos)}
            description="Valor total previsto da compra atual antes do lançamento."
          />
        </>
      }
    >
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      {message ? <div className="text-sm text-emerald-700">{message}</div> : null}

      <CafeCard
        title="Abastecimento do café"
        description="Consolide a compra com conta financeira, categoria e itens que entram no estoque."
      >
        <CafeToolbar
          title="Operação de compra"
          description="O sistema calcula custo unitário por item e abastece o estoque a partir do lançamento."
        >
          {loading ? <span className="text-xs text-slate-500">Atualizando dados...</span> : null}
        </CafeToolbar>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <CafeCard
            title="Nova compra"
            description="Preencha o contexto da compra e depois detalhe os itens do abastecimento."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">Data</label>
                <input className={fieldClassName} value={dataCompra} onChange={(e) => setDataCompra(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Conta do café</label>
                <select
                  className={fieldClassName}
                  value={contaId}
                  onChange={(e) => setContaId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Selecione...</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.codigo} - {conta.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Onde comprei</label>
                <input
                  className={fieldClassName}
                  value={ondeComprei}
                  onChange={(e) => setOndeComprei(e.target.value)}
                  placeholder="Ex.: padaria, feira ou mercado"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Categoria de despesa</label>
                <select
                  className={fieldClassName}
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Sem categoria</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome} ({categoria.codigo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CafeCard>

          <CafeCard
            title="Resumo da compra"
            description="Use este bloco para validar quantidade de itens, total e efeito operacional antes de salvar."
          >
            <CafePanel className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Itens na compra
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">{itens.length}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Total previsto
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-950">
                  {formatBRLFromCentavos(totalCentavos)}
                </p>
              </div>
              <p className="text-sm leading-6 text-slate-600">
                O lançamento abastece o estoque e preserva o histórico recente de compras do café.
              </p>
            </CafePanel>
          </CafeCard>
        </div>

        <CafeCard
          title="Itens da compra"
          description="Cada item define o insumo comprado, a quantidade, o valor total e a validade, quando houver."
        >
          <CafeSectionIntro
            title="Bloco de abastecimento"
            description="Adicione quantos insumos forem necessários e revise o custo unitário calculado antes de salvar."
          />
          <div className="space-y-3">
            {itens.map((item, idx) => (
              <CafePanel key={idx}>
                <div className="grid gap-4 md:grid-cols-5">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700">Insumo</label>
                    <select
                      className={fieldClassName}
                      value={item.insumo_id ?? ""}
                      onChange={(e) =>
                        updateItem(idx, { insumo_id: e.target.value ? Number(e.target.value) : null })
                      }
                    >
                      <option value="">Selecione...</option>
                      {insumos.map((insumo) => (
                        <option key={insumo.id} value={insumo.id}>
                          {insumo.nome} ({insumo.unidade_base})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Quantidade</label>
                    <input
                      className={fieldClassName}
                      value={item.quantidade}
                      onChange={(e) => updateItem(idx, { quantidade: e.target.value })}
                      placeholder="Ex.: 10"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Valor total</label>
                    <input
                      className={fieldClassName}
                      value={item.valor_total_brl}
                      onChange={(e) => updateItem(idx, { valor_total_brl: e.target.value })}
                      placeholder="Ex.: 13,00"
                    />
                    <div className="mt-1 text-xs text-slate-500">{calcUnitPreview(idx)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Validade</label>
                    <input
                      className={fieldClassName}
                      value={item.validade}
                      onChange={(e) => updateItem(idx, { validade: e.target.value })}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <button
                    className="text-sm text-slate-600 transition hover:underline disabled:text-slate-300"
                    onClick={() => removeItem(idx)}
                    disabled={itens.length <= 1}
                  >
                    Remover item
                  </button>
                  <button className="text-sm font-medium text-[#8c6640] transition hover:underline" onClick={addItem}>
                    + Adicionar insumo
                  </button>
                </div>
              </CafePanel>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-700">
              Total: <span className="font-semibold">{formatBRLFromCentavos(totalCentavos)}</span>
            </div>
            <button className={primaryButtonClassName} onClick={() => void registrarCompra()} disabled={loading}>
              Registrar compra
            </button>
          </div>
        </CafeCard>
      </CafeCard>

      <CafeCard
        title="Compras recentes"
        description="Consulte o histórico operacional e cancele compras quando for necessário reverter o estoque."
      >
        <div className="overflow-hidden rounded-[20px] border border-slate-200/80">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Data</th>
                  <th className="px-4 py-3 text-left">Onde</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {compras.map((compra) => (
                  <tr key={compra.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{compra.data_compra}</td>
                    <td className="px-4 py-3">{compra.onde_comprei}</td>
                    <td className="px-4 py-3 text-right">{formatBRLFromCentavos(compra.valor_total_centavos)}</td>
                    <td className="px-4 py-3">{compra.status ?? "ATIVA"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="text-sm text-red-600 transition hover:underline disabled:text-slate-400"
                        onClick={() => void cancelarCompra(compra.id)}
                        disabled={compra.status === "CANCELADA"}
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ))}
                {compras.length === 0 && !loading ? (
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-4 text-slate-500" colSpan={5}>
                      Nenhuma compra registrada.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
        {loading ? <p className="text-sm text-slate-600">Carregando...</p> : null}
      </CafeCard>
    </CafePageShell>
  );
}
