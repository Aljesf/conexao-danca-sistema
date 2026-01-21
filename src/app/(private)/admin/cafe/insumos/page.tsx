"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/layout/SectionCard";

type Insumo = {
  id: number;
  nome: string;
  unidade_base: string;
  controla_validade: boolean;
  saldo_atual: number;
  custo_unitario_estimado_centavos: number;
  ativo: boolean;
};

type Movimento = {
  id: number;
  tipo: string;
  quantidade: number;
  validade: string | null;
  created_at: string;
  observacoes: string | null;
};

function formatBRLFromCentavos(value: number): string {
  const val = (value || 0) / 100;
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CafeInsumosPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [novoNome, setNovoNome] = useState("");
  const [unidadeBase, setUnidadeBase] = useState<"g" | "ml" | "un">("un");
  const [controlaValidade, setControlaValidade] = useState(false);

  const [selectedInsumoId, setSelectedInsumoId] = useState<number | null>(null);
  const [movs, setMovs] = useState<Movimento[]>([]);
  const [movTipo, setMovTipo] = useState<"ENTRADA" | "SAIDA" | "AJUSTE">("ENTRADA");
  const [movQtd, setMovQtd] = useState<string>("");
  const [movValidade, setMovValidade] = useState<string>("");
  const [movObs, setMovObs] = useState("");

  const selectedInsumo = useMemo(
    () => insumos.find((i) => i.id === selectedInsumoId) ?? null,
    [insumos, selectedInsumoId]
  );

  async function loadInsumos() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cafe/insumos");
      const json = (await res.json()) as { data?: Insumo[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar insumos.");
      setInsumos(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar insumos.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMovimentos(insumoId: number) {
    const res = await fetch(`/api/cafe/insumos/${insumoId}/movimentos`);
    const json = (await res.json()) as { data?: Movimento[] };
    setMovs(json.data ?? []);
  }

  useEffect(() => {
    void loadInsumos();
  }, []);

  useEffect(() => {
    if (selectedInsumoId) void loadMovimentos(selectedInsumoId);
  }, [selectedInsumoId]);

  async function criarInsumo() {
    if (!novoNome.trim()) return;
    setError(null);
    const res = await fetch("/api/cafe/insumos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: novoNome,
        unidade_base: unidadeBase,
        controla_validade: controlaValidade,
      }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Falha ao criar insumo.");
      return;
    }
    setNovoNome("");
    await loadInsumos();
  }

  async function registrarMovimento() {
    if (!selectedInsumoId) return;
    const qtd = Number(movQtd.replace(",", "."));
    if (!Number.isFinite(qtd) || qtd <= 0) return;

    const res = await fetch(`/api/cafe/insumos/${selectedInsumoId}/movimentos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipo: movTipo,
        quantidade: qtd,
        validade: movValidade ? movValidade : null,
        observacoes: movObs ? movObs : null,
      }),
    });

    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Falha ao registrar movimento.");
      return;
    }

    setMovQtd("");
    setMovValidade("");
    setMovObs("");
    await loadInsumos();
    await loadMovimentos(selectedInsumoId);
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Admin \u2014 Ballet Caf\u00e9 \u2014 Insumos"
        description="Cadastro de insumos e abastecimento manual (entrada/sa\u00edda/ajuste) com hist\u00f3rico."
      />

      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <SectionCard title="Novo insumo">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Nome</label>
            <input
              className="mt-1 w-full rounded-md border p-2"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Unidade base</label>
            <select
              className="mt-1 w-full rounded-md border p-2"
              value={unidadeBase}
              onChange={(e) => setUnidadeBase(e.target.value as "g" | "ml" | "un")}
            >
              <option value="un">un</option>
              <option value="g">g</option>
              <option value="ml">ml</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={controlaValidade}
                onChange={(e) => setControlaValidade(e.target.checked)}
              />
              Controla validade
            </label>
          </div>
        </div>
        <div className="mt-4">
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
            onClick={() => void criarInsumo()}
          >
            Criar insumo
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Lista de insumos">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2 text-left">Nome</th>
                <th className="px-2 py-2 text-left">Unidade</th>
                <th className="px-2 py-2 text-right">Saldo</th>
                <th className="px-2 py-2 text-right">Custo est.</th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => (
                <tr
                  key={i.id}
                  className={
                    "border-t hover:bg-slate-50 cursor-pointer " + (selectedInsumoId === i.id ? "bg-slate-50" : "")
                  }
                  onClick={() => setSelectedInsumoId(i.id)}
                >
                  <td className="px-2 py-2">{i.nome}</td>
                  <td className="px-2 py-2">{i.unidade_base}</td>
                  <td className="px-2 py-2 text-right">{Number(i.saldo_atual || 0).toString()}</td>
                  <td className="px-2 py-2 text-right">
                    {formatBRLFromCentavos(i.custo_unitario_estimado_centavos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? <p className="mt-3 text-sm text-slate-600">Carregando...</p> : null}
        </div>
      </SectionCard>

      {selectedInsumo ? (
        <SectionCard title={`Abastecimento manual - ${selectedInsumo.nome}`}>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <select
                className="mt-1 w-full rounded-md border p-2"
                value={movTipo}
                onChange={(e) => setMovTipo(e.target.value as "ENTRADA" | "SAIDA" | "AJUSTE")}
              >
                <option value="ENTRADA">ENTRADA</option>
                <option value="SAIDA">SAIDA</option>
                <option value="AJUSTE">AJUSTE (delta)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Quantidade</label>
              <input
                className="mt-1 w-full rounded-md border p-2"
                value={movQtd}
                onChange={(e) => setMovQtd(e.target.value)}
                placeholder="ex.: 1,5"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Validade (opcional)</label>
              <input
                className="mt-1 w-full rounded-md border p-2"
                value={movValidade}
                onChange={(e) => setMovValidade(e.target.value)}
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Obs.</label>
              <input
                className="mt-1 w-full rounded-md border p-2"
                value={movObs}
                onChange={(e) => setMovObs(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-800"
              onClick={() => void registrarMovimento()}
            >
              Registrar movimento
            </button>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700">Historico de movimentos</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-2 text-left">Data</th>
                    <th className="px-2 py-2 text-left">Tipo</th>
                    <th className="px-2 py-2 text-right">Qtd</th>
                    <th className="px-2 py-2 text-left">Validade</th>
                    <th className="px-2 py-2 text-left">Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {movs.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="px-2 py-2">{new Date(m.created_at).toLocaleString("pt-BR")}</td>
                      <td className="px-2 py-2">{m.tipo}</td>
                      <td className="px-2 py-2 text-right">{Number(m.quantidade).toString()}</td>
                      <td className="px-2 py-2">{m.validade ?? "-"}</td>
                      <td className="px-2 py-2">{m.observacoes ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}



