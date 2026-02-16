"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Cobranca = {
  id: number;
  pessoa_id: number;
  pessoa_nome: string | null;
  descricao: string;
  vencimento: string;
  valor_centavos: number;
  status: string;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  linha_digitavel: string | null;
  created_at: string;
  updated_at: string;
};

type ApiListResponse = {
  ok: boolean;
  data?: Cobranca[];
  error?: string;
  detail?: string | null;
};

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function GovernancaCobrancasPage() {
  const [items, setItems] = useState<Cobranca[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [filtroNeofin, setFiltroNeofin] = useState<"TODAS" | "INTEGRADAS">("TODAS");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);

    try {
      const sp = new URLSearchParams();
      if (status) sp.set("status", status);
      if (filtroNeofin === "INTEGRADAS") sp.set("somente_integradas", "true");

      const qs = sp.toString();
      const endpoint = qs ? `/api/governanca/cobrancas?${qs}` : "/api/governanca/cobrancas";
      const res = await fetch(endpoint, { method: "GET", cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiListResponse | null;

      if (!res.ok || !json?.ok) {
        setItems([]);
        setErro(json?.detail ?? json?.error ?? "falha_carregar_cobrancas");
        return;
      }

      setItems(json.data ?? []);
    } catch (e) {
      setItems([]);
      setErro(e instanceof Error ? e.message : "falha_inesperada");
    } finally {
      setLoading(false);
    }
  }, [status, filtroNeofin]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase();
    if (!termo) return items;

    return items.filter((c) => {
      const nome = (c.pessoa_nome ?? "").toLowerCase();
      const desc = (c.descricao ?? "").toLowerCase();
      const charge = (c.neofin_charge_id ?? "").toLowerCase();
      const linha = (c.linha_digitavel ?? "").toLowerCase();
      return (
        nome.includes(termo) ||
        desc.includes(termo) ||
        charge.includes(termo) ||
        linha.includes(termo) ||
        String(c.id).includes(termo)
      );
    });
  }, [items, q]);

  const kpis = useMemo(() => {
    const total = filtrados.length;
    const integradas = filtrados.filter((c) => Boolean(c.neofin_charge_id)).length;
    const pagas = filtrados.filter((c) => c.status === "PAGO").length;
    const pendentes = filtrados.filter((c) => c.status === "PENDENTE").length;
    const valorTotal = filtrados.reduce((acc, c) => acc + (c.valor_centavos ?? 0), 0);
    return { total, integradas, pagas, pendentes, valorTotal };
  }, [filtrados]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Cobranças - Governança</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Painel de auditoria das cobranças, com rastreio de status local e integração com NeoFin.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs text-muted-foreground">Busca</label>
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Nome, descrição, ID, charge..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
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
                <option value="ERRO_INTEGRACAO">ERRO_INTEGRACAO</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Filtro NeoFin</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={filtroNeofin}
                onChange={(e) => setFiltroNeofin(e.target.value as "TODAS" | "INTEGRADAS")}
              >
                <option value="TODAS">Todos</option>
                <option value="INTEGRADAS">Somente integradas</option>
              </select>
            </div>

            <div className="flex items-end gap-2 md:col-span-2">
              <button
                className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                onClick={() => void carregar()}
                disabled={loading}
              >
                {loading ? "Carregando..." : "Atualizar"}
              </button>
              <Link
                className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                href="/admin/governanca/boletos-neofin"
              >
                Cobranças (Provedor)
              </Link>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>
              Total: <strong>{kpis.total}</strong>
            </span>
            <span>
              Integradas: <strong>{kpis.integradas}</strong>
            </span>
            <span>
              Pagas: <strong>{kpis.pagas}</strong>
            </span>
            <span>
              Pendentes: <strong>{kpis.pendentes}</strong>
            </span>
            <span>
              Valor total: <strong>{formatBRL(kpis.valorTotal)}</strong>
            </span>
          </div>

          {erro ? <div className="mt-3 text-sm text-red-700">{erro}</div> : null}
        </div>

        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-left">
                  <th className="p-3">ID</th>
                  <th className="p-3">Pessoa</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Vencimento</th>
                  <th className="p-3">Valor</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">NeoFin</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3">{c.id}</td>
                    <td className="p-3">
                      <div className="font-medium">{c.pessoa_nome ?? "(sem nome)"}</div>
                      <div className="text-xs text-muted-foreground">pessoa_id: {c.pessoa_id}</div>
                    </td>
                    <td className="p-3">{c.descricao}</td>
                    <td className="p-3">{c.vencimento}</td>
                    <td className="p-3">{formatBRL(c.valor_centavos)}</td>
                    <td className="p-3">{c.status}</td>
                    <td className="p-3">
                      <div className="font-medium">{c.neofin_charge_id ?? "-"}</div>
                      {c.link_pagamento ? (
                        <a className="text-xs underline" href={c.link_pagamento} target="_blank" rel="noreferrer">
                          Abrir link
                        </a>
                      ) : (
                        <div className="text-xs text-muted-foreground">Sem link</div>
                      )}
                    </td>
                    <td className="p-3">
                      <Link className="underline" href={`/admin/governanca/cobrancas/${c.id}`}>
                        Detalhar
                      </Link>
                    </td>
                  </tr>
                ))}

                {!loading && filtrados.length === 0 ? (
                  <tr>
                    <td className="p-6 text-muted-foreground" colSpan={8}>
                      Nenhuma cobrança encontrada com os filtros atuais.
                    </td>
                  </tr>
                ) : null}

                {loading ? (
                  <tr>
                    <td className="p-6 text-muted-foreground" colSpan={8}>
                      Carregando...
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
