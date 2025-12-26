"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Servico = {
  id: number;
  tipo: string;
  titulo: string | null;
  ano_referencia: number | null;
  ativo: boolean;
};

type Plano = {
  id: number;
  codigo: string;
  nome: string;
  valor_mensal_base_centavos: number;
  valor_anuidade_centavos: number;
  ativo: boolean;
};

type PrecoServico = {
  id: number;
  servico_id: number;
  ano_referencia: number;
  plano_id: number;
  ativo: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type NovoPreco = {
  servico_id: number | null;
  ano_referencia: number | null;
  plano_id: number | null;
  ativo: boolean;
};

function formatBRL(centavos: number | null): string {
  if (centavos === null) return "-";
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function extractErrorMessage(data: unknown, status: number): string {
  if (!data || typeof data !== "object") return `HTTP ${status}`;
  const record = data as Record<string, unknown>;
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  if (typeof record.error === "string" && record.error.trim()) return record.error;
  if (record.error && typeof record.error === "object") {
    const errObj = record.error as Record<string, unknown>;
    if (typeof errObj.message === "string" && errObj.message.trim()) return errObj.message;
  }
  return `HTTP ${status}`;
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(extractErrorMessage(data, res.status));
  }
  return data as T;
}

export default function EscolaServicosPrecosPage() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [precos, setPrecos] = useState<PrecoServico[]>([]);
  const [novoPreco, setNovoPreco] = useState<NovoPreco>({
    servico_id: null,
    ano_referencia: null,
    plano_id: null,
    ativo: true,
  });
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const servicoById = useMemo(() => new Map(servicos.map((s) => [s.id, s])), [servicos]);
  const planoById = useMemo(() => new Map(planos.map((p) => [p.id, p])), [planos]);

  async function carregarDados() {
    setErro(null);
    setLoading(true);
    try {
      const [servicosResp, planosResp, precosResp] = await Promise.all([
        fetchJSON<{ ok: boolean; servicos?: Servico[]; message?: string }>("/api/admin/servicos"),
        fetchJSON<{ ok: boolean; data?: Plano[]; message?: string }>("/api/admin/matriculas/planos"),
        fetchJSON<{ ok: boolean; precos?: PrecoServico[]; message?: string }>("/api/admin/matriculas/precos-servico"),
      ]);

      if (!servicosResp.ok) throw new Error(servicosResp.message ?? "Falha ao carregar servicos.");
      if (!planosResp.ok) throw new Error(planosResp.message ?? "Falha ao carregar planos.");
      if (!precosResp.ok) throw new Error(precosResp.message ?? "Falha ao carregar precos.");

      setServicos(servicosResp.servicos ?? []);
      setPlanos(planosResp.data ?? []);
      setPrecos(precosResp.precos ?? []);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarDados();
  }, []);

  async function salvarPreco() {
    setErro(null);
    if (!novoPreco.servico_id || !novoPreco.ano_referencia || !novoPreco.plano_id) {
      setErro("Informe servico, ano e plano.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        servico_id: novoPreco.servico_id,
        ano_referencia: novoPreco.ano_referencia,
        plano_id: novoPreco.plano_id,
        ativo: novoPreco.ativo,
      };
      const data = await fetchJSON<{ ok: boolean; preco?: PrecoServico; message?: string }>(
        "/api/admin/matriculas/precos-servico",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!data.ok || !data.preco) {
        throw new Error(data.message ?? "Falha ao salvar preco.");
      }
      setPrecos((prev) => {
        const idx = prev.findIndex(
          (p) =>
            p.servico_id === data.preco!.servico_id &&
            p.ano_referencia === data.preco!.ano_referencia,
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = data.preco as PrecoServico;
          return next;
        }
        return [data.preco as PrecoServico, ...prev];
      });
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Falha ao salvar preco.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Configuracoes da escola - Precos por servico</h1>
          <p className="text-sm text-muted-foreground">
            Vincule servico, ano e plano para habilitar precificacao.
          </p>
        </div>
        <Link className="text-sm text-violet-600 hover:underline" href="/escola/configuracoes/servicos">
          Voltar aos servicos
        </Link>
      </div>

      {erro ? <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">{erro}</div> : null}

      <div className="mb-6 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Cadastrar preco</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-xs font-medium">Servico</label>
            <select
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
              value={novoPreco.servico_id ?? ""}
              onChange={(e) =>
                setNovoPreco((prev) => ({
                  ...prev,
                  servico_id: e.target.value ? Number(e.target.value) : null,
                }))
              }
              disabled={loading}
            >
              <option value="">Selecione...</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titulo ?? `Servico #${s.id}`} ({s.tipo})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Ano referencia</label>
            <input
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
              type="number"
              min={2000}
              max={2100}
              value={novoPreco.ano_referencia ?? ""}
              onChange={(e) =>
                setNovoPreco((prev) => ({
                  ...prev,
                  ano_referencia: e.target.value ? Number(e.target.value) : null,
                }))
              }
              disabled={loading}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Plano</label>
            <select
              className="mt-1 w-full rounded-md border px-2 py-2 text-sm"
              value={novoPreco.plano_id ?? ""}
              onChange={(e) =>
                setNovoPreco((prev) => ({
                  ...prev,
                  plano_id: e.target.value ? Number(e.target.value) : null,
                }))
              }
              disabled={loading}
            >
              <option value="">Selecione...</option>
              {planos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({formatBRL(p.valor_mensal_base_centavos)})
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={novoPreco.ativo}
              onChange={(e) => setNovoPreco((prev) => ({ ...prev, ativo: e.target.checked }))}
              disabled={loading}
            />
            Ativo
          </label>
          <button
            type="button"
            className="rounded-md bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
            onClick={() => void salvarPreco()}
            disabled={loading}
          >
            Salvar preco
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted"
            onClick={() => void carregarDados()}
            disabled={loading}
          >
            Recarregar
          </button>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-3 text-sm font-semibold">Precos cadastrados</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Servico</th>
                <th className="px-3 py-2 text-left">Ano</th>
                <th className="px-3 py-2 text-left">Plano</th>
                <th className="px-3 py-2 text-left">Valor mensal</th>
                <th className="px-3 py-2 text-left">Ativo</th>
              </tr>
            </thead>
            <tbody>
              {precos.map((p) => {
                const servico = servicoById.get(p.servico_id);
                const plano = planoById.get(p.plano_id);
                return (
                  <tr key={`${p.servico_id}-${p.ano_referencia}`} className="border-t">
                    <td className="px-3 py-2">{servico ? labelServico(servico) : `Servico #${p.servico_id}`}</td>
                    <td className="px-3 py-2">{p.ano_referencia}</td>
                    <td className="px-3 py-2">{plano?.nome ?? `Plano #${p.plano_id}`}</td>
                    <td className="px-3 py-2">{formatBRL(plano?.valor_mensal_base_centavos ?? null)}</td>
                    <td className="px-3 py-2">{p.ativo ? "Sim" : "Nao"}</td>
                  </tr>
                );
              })}
              {precos.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-sm text-muted-foreground" colSpan={5}>
                    Nenhum preco cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function labelServico(servico: Servico): string {
  const titulo = servico.titulo?.trim() ? servico.titulo : `Servico #${servico.id}`;
  return servico.ano_referencia ? `${titulo} (${servico.ano_referencia})` : titulo;
}
