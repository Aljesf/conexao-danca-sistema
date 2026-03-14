"use client";

import { useEffect, useMemo, useState } from "react";
import CafeCard from "@/components/cafe/CafeCard";
import CafePageShell from "@/components/cafe/CafePageShell";
import CafeSectionIntro from "@/components/cafe/CafeSectionIntro";
import CafeStatCard from "@/components/cafe/CafeStatCard";
import CafeToolbar from "@/components/cafe/CafeToolbar";

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

const fieldClassName =
  "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm shadow-slate-200/60 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70";
const primaryButtonClassName =
  "inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60";
const tableWrapClassName = "overflow-hidden rounded-[20px] border border-slate-200/80";

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
    () => insumos.find((item) => item.id === selectedInsumoId) ?? null,
    [insumos, selectedInsumoId],
  );

  const totalInsumos = insumos.length;
  const saldoMonitorado = useMemo(
    () => insumos.reduce((acc, item) => acc + Number(item.saldo_atual || 0), 0),
    [insumos],
  );
  const comValidade = useMemo(
    () => insumos.filter((item) => item.controla_validade).length,
    [insumos],
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
    <CafePageShell
      eyebrow="Gestão do Café"
      title="Gestão do Ballet Café - Insumos"
      description="Cadastre insumos, monitore saldos e registre abastecimentos manuais com leitura operacional mais clara."
      summary={
        <>
          <CafeStatCard
            label="Total de insumos"
            value={totalInsumos}
            description="Base ativa para abastecimento, receitas e compras operacionais."
          />
          <CafeStatCard
            label="Saldo monitorado"
            value={saldoMonitorado.toLocaleString("pt-BR")}
            description="Soma simples do saldo atual disponível em todas as unidades cadastradas."
          />
          <CafeStatCard
            label="Controle de validade"
            value={comValidade}
            description="Itens que exigem acompanhamento de validade no estoque."
          />
        </>
      }
    >
      {error ? <div className="text-sm text-red-600">{error}</div> : null}

      <CafeCard
        title="Cadastro e visão operacional"
        description="Mantenha o cadastro dos insumos enxuto e use o painel lateral para acompanhar o abastecimento manual."
      >
        <CafeToolbar
          title="Base de insumos"
          description="Selecione um insumo para registrar entradas, saídas ou ajustes de saldo."
        >
          {loading ? <span className="text-xs text-slate-500">Atualizando dados...</span> : null}
        </CafeToolbar>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
          <CafeCard
            title="Novo insumo"
            description="Cadastre somente o necessário para liberar o uso do insumo no módulo."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Nome</label>
                <input
                  className={fieldClassName}
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex.: Leite integral"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Unidade base</label>
                <select
                  className={fieldClassName}
                  value={unidadeBase}
                  onChange={(e) => setUnidadeBase(e.target.value as "g" | "ml" | "un")}
                >
                  <option value="un">un</option>
                  <option value="g">g</option>
                  <option value="ml">ml</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={controlaValidade}
                    onChange={(e) => setControlaValidade(e.target.checked)}
                  />
                  Controla validade
                </label>
              </div>
            </div>
            <div>
              <button className={primaryButtonClassName} onClick={() => void criarInsumo()}>
                Criar insumo
              </button>
            </div>
          </CafeCard>

          <CafeCard
            title="Lista de insumos"
            description="Clique em um item para abrir o abastecimento manual e o histórico operacional."
          >
            <div className={tableWrapClassName}>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Nome</th>
                      <th className="px-4 py-3 text-left">Unidade</th>
                      <th className="px-4 py-3 text-right">Saldo</th>
                      <th className="px-4 py-3 text-right">Custo estimado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumos.map((item) => (
                      <tr
                        key={item.id}
                        className={[
                          "cursor-pointer border-t border-slate-100 transition hover:bg-slate-50/80",
                          selectedInsumoId === item.id ? "bg-amber-50/60" : "bg-white",
                        ].join(" ")}
                        onClick={() => setSelectedInsumoId(item.id)}
                      >
                        <td className="px-4 py-3">{item.nome}</td>
                        <td className="px-4 py-3">{item.unidade_base}</td>
                        <td className="px-4 py-3 text-right">{Number(item.saldo_atual || 0).toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 text-right">
                          {formatBRLFromCentavos(item.custo_unitario_estimado_centavos)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {loading ? <p className="text-sm text-slate-600">Carregando...</p> : null}
          </CafeCard>
        </div>
      </CafeCard>

      {selectedInsumo ? (
        <CafeCard
          title={`Abastecimento manual - ${selectedInsumo.nome}`}
          description="Registre entradas, saídas ou ajustes sem sair da gestão do café."
        >
          <CafeSectionIntro
            title="Movimento operacional"
            description="O histórico abaixo ajuda a validar saldo, validade e observações recentes."
          />
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
            <CafeCard
              title="Novo movimento"
              description="Informe o tipo do movimento, quantidade e observações operacionais."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">Tipo</label>
                  <select
                    className={fieldClassName}
                    value={movTipo}
                    onChange={(e) => setMovTipo(e.target.value as "ENTRADA" | "SAIDA" | "AJUSTE")}
                  >
                    <option value="ENTRADA">Entrada</option>
                    <option value="SAIDA">Saída</option>
                    <option value="AJUSTE">Ajuste</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Quantidade</label>
                  <input
                    className={fieldClassName}
                    value={movQtd}
                    onChange={(e) => setMovQtd(e.target.value)}
                    placeholder="Ex.: 1,5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Validade</label>
                  <input
                    className={fieldClassName}
                    value={movValidade}
                    onChange={(e) => setMovValidade(e.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Observações</label>
                  <input
                    className={fieldClassName}
                    value={movObs}
                    onChange={(e) => setMovObs(e.target.value)}
                    placeholder="Motivo, lote ou contexto do ajuste"
                  />
                </div>
              </div>
              <div>
                <button className={primaryButtonClassName} onClick={() => void registrarMovimento()}>
                  Registrar movimento
                </button>
              </div>
            </CafeCard>

            <CafeCard
              title="Histórico recente"
              description="Últimos movimentos registrados para o insumo selecionado."
            >
              <div className={tableWrapClassName}>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.14em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Data</th>
                        <th className="px-4 py-3 text-left">Tipo</th>
                        <th className="px-4 py-3 text-right">Quantidade</th>
                        <th className="px-4 py-3 text-left">Validade</th>
                        <th className="px-4 py-3 text-left">Observações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movs.map((mov) => (
                        <tr key={mov.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">{mov.created_at}</td>
                          <td className="px-4 py-3">{mov.tipo}</td>
                          <td className="px-4 py-3 text-right">
                            {Number(mov.quantidade).toLocaleString("pt-BR")}
                          </td>
                          <td className="px-4 py-3">{mov.validade ?? "-"}</td>
                          <td className="px-4 py-3">{mov.observacoes ?? "-"}</td>
                        </tr>
                      ))}
                      {movs.length === 0 ? (
                        <tr className="border-t border-slate-100">
                          <td className="px-4 py-4 text-slate-500" colSpan={5}>
                            Nenhum movimento registrado para este insumo.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </CafeCard>
          </div>
        </CafeCard>
      ) : null}
    </CafePageShell>
  );
}
