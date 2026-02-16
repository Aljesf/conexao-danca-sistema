"use client";

import React, { useEffect, useMemo, useState } from "react";

type Item = {
  cobranca_id: number;
  pessoa_id: number;
  pessoa_nome: string | null;
  centro_custo_id: number | null;
  centro_custo_codigo: string | null;
  centro_custo_nome: string | null;
  descricao: string;
  valor_centavos: number;
  vencimento: string;
  cobranca_status: string;
  neofin_charge_id: string;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  cobranca_criada_em: string;
  cobranca_atualizada_em: string;
  total_recebido_centavos: number;
  ultimo_pagamento_em: string | null;
  provider?: "NEOFIN";
};

function formatBRL(centavos: number): string {
  const v = (centavos ?? 0) / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CobrancasProviderGovernancaPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const [provider, setProvider] = useState<"" | "NEOFIN">("NEOFIN");
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const totalEmitido = useMemo(
    () => items.reduce((acc, it) => acc + (it.valor_centavos ?? 0), 0),
    [items],
  );

  const totalRecebido = useMemo(
    () => items.reduce((acc, it) => acc + (it.total_recebido_centavos ?? 0), 0),
    [items],
  );

  async function carregar() {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (provider) sp.set("provider", provider);
      if (status) sp.set("status", status);
      if (q.trim()) sp.set("q", q.trim());
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);

      const res = await fetch(`/api/governanca/boletos-neofin?${sp.toString()}`, {
        method: "GET",
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error ?? "Falha ao listar");
      setItems((json.items ?? []) as Item[]);
    } catch (e) {
      console.error(e);
      alert("Falha ao carregar cobrancas do provedor (ver console).");
    } finally {
      setLoading(false);
    }
  }

  async function reconciliar() {
    setReconciling(true);
    try {
      const res = await fetch("/api/governanca/boletos-neofin/reconciliar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error ?? "Falha ao reconciliar");
      alert(`Reconciliacao concluida. Atualizados: ${json.total ?? 0}`);
      await carregar();
    } catch (e) {
      console.error(e);
      alert("Falha ao reconciliar (ver console).");
    } finally {
      setReconciling(false);
    }
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Cobrancas (Provedor) - Governanca</h1>
        <p className="text-sm text-muted-foreground">
          Painel de auditoria de cobrancas por provedor. A reconciliacao marca como PAGO quando ja
          existe recebimento suficiente.
        </p>
      </div>

      <div className="rounded-2xl border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Provedor</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={provider}
              onChange={(e) => setProvider((e.target.value as "" | "NEOFIN") ?? "")}
            >
              <option value="">Todos</option>
              <option value="NEOFIN">NEOFIN</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="PENDENTE">PENDENTE</option>
              <option value="PAGO">PAGO</option>
              <option value="CANCELADO">CANCELADO</option>
              <option value="VENCIDO">VENCIDO</option>
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-xs text-muted-foreground">Busca</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Nome, descricao, linha digitavel, provider ID..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Venc. de</label>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Venc. ate</label>
            <input
              type="date"
              className="w-full rounded-md border px-3 py-2 text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => void carregar()}
            disabled={loading}
          >
            {loading ? "Carregando..." : "Aplicar filtros"}
          </button>

          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => void reconciliar()}
            disabled={reconciling}
            title="Marca como PAGO quando ja existe recebimento >= valor da cobranca"
          >
            {reconciling ? "Reconciliando..." : "Reconciliar pagamentos"}
          </button>

          <div className="ml-auto text-sm text-muted-foreground flex gap-6">
            <span>
              Emitido: <strong>{formatBRL(totalEmitido)}</strong>
            </span>
            <span>
              Recebido (somado): <strong>{formatBRL(totalRecebido)}</strong>
            </span>
            <span>
              Total: <strong>{items.length}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">ID</th>
                <th className="p-3">Pessoa</th>
                <th className="p-3">Centro de custo</th>
                <th className="p-3">Vencimento</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Recebido</th>
                <th className="p-3">Status</th>
                <th className="p-3">Provedor</th>
                <th className="p-3">Linha digitavel</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.cobranca_id} className="border-t">
                  <td className="p-3">{it.cobranca_id}</td>
                  <td className="p-3">
                    <div className="font-medium">{it.pessoa_nome ?? "(sem nome)"}</div>
                    <div className="text-xs text-muted-foreground">pessoa_id: {it.pessoa_id}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">
                      {(it.centro_custo_codigo ?? "-") + " - " + (it.centro_custo_nome ?? "-")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      centro_custo_id: {it.centro_custo_id ?? "-"}
                    </div>
                  </td>
                  <td className="p-3">{it.vencimento}</td>
                  <td className="p-3">{formatBRL(it.valor_centavos)}</td>
                  <td className="p-3">
                    <div className="font-medium">{formatBRL(it.total_recebido_centavos)}</div>
                    <div className="text-xs text-muted-foreground">
                      ultimo:{" "}
                      {it.ultimo_pagamento_em
                        ? new Date(it.ultimo_pagamento_em).toLocaleString("pt-BR")
                        : "-"}
                    </div>
                  </td>
                  <td className="p-3">{it.cobranca_status}</td>
                  <td className="p-3">
                    <div className="font-medium">{it.provider ?? "NEOFIN"}</div>
                    <div className="text-xs text-muted-foreground">{it.neofin_charge_id}</div>
                    {it.link_pagamento ? (
                      <a className="text-xs underline" href={it.link_pagamento} target="_blank" rel="noreferrer">
                        abrir link
                      </a>
                    ) : (
                      <div className="text-xs text-muted-foreground">sem link</div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-mono text-xs break-all">{it.linha_digitavel ?? "-"}</div>
                  </td>
                </tr>
              ))}

              {items.length === 0 && !loading && (
                <tr>
                  <td className="p-6 text-muted-foreground" colSpan={9}>
                    Nenhuma cobranca encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="p-6 text-muted-foreground" colSpan={9}>
                    Carregando...
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
