"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

type Pessoa = {
  id: number;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
};

type Cobranca = {
  id: number;
  pessoa_id: number;
  descricao: string;
  valor_centavos: number;
  moeda: string;
  vencimento: string;
  data_pagamento: string | null;
  status: string;
  metodo_pagamento: string | null;
  neofin_charge_id: string | null;
  link_pagamento: string | null;
  created_at: string;
  updated_at: string;
  pessoa?: Pessoa | null;
};

function formatBRL(centavos: number): string {
  const v = (centavos ?? 0) / 100;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function GovernancaCobrancasPage() {
  const [items, setItems] = useState<Cobranca[]>([]);
  const [loading, setLoading] = useState(false);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [somenteNeofin, setSomenteNeofin] = useState<boolean>(true);

  async function carregar() {
    setLoading(true);
    try {
      const res = await fetch("/api/cobrancas", { method: "GET" });
      const json = await res.json();
      const data = (json?.data ?? []) as Cobranca[];
      setItems(data);
    } catch (e) {
      console.error(e);
      alert("Falha ao carregar cobranÃ§as (ver console).");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const filtrados = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items
      .filter((c) => (status ? c.status === status : true))
      .filter((c) => (somenteNeofin ? Boolean(c.neofin_charge_id) : true))
      .filter((c) => {
        if (!qq) return true;
        const nome = (c.pessoa?.nome ?? "").toLowerCase();
        const desc = (c.descricao ?? "").toLowerCase();
        const idTxt = String(c.id ?? "");
        const linha = "";
        const charge = (c.neofin_charge_id ?? "").toLowerCase();
        return (
          nome.includes(qq) ||
          desc.includes(qq) ||
          idTxt.includes(qq) ||
          linha.includes(qq) ||
          charge.includes(qq)
        );
      });
  }, [items, q, status, somenteNeofin]);

  const kpis = useMemo(() => {
    const total = filtrados.length;
    const emitidos = filtrados.filter((c) => Boolean(c.neofin_charge_id)).length;
    const pagos = filtrados.filter((c) => c.status === "PAGO").length;
    const pendentes = filtrados.filter((c) => c.status === "PENDENTE").length;

    const valorTotal = filtrados.reduce((acc, c) => acc + (c.valor_centavos ?? 0), 0);
    const valorPago = filtrados
      .filter((c) => c.status === "PAGO")
      .reduce((acc, c) => acc + (c.valor_centavos ?? 0), 0);

    return { total, emitidos, pagos, pendentes, valorTotal, valorPago };
  }, [filtrados]);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">CobranÃ§as â€” GovernanÃ§a</h1>
        <p className="text-sm text-muted-foreground">
          VisÃ£o auditÃ¡vel de cobranÃ§as/boletos (subiram) e status de pagamento (desceram). Esta
          tela reutiliza /api/cobrancas.
        </p>
      </div>

      <div className="rounded-2xl border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs text-muted-foreground">Busca</label>
            <input
              className="w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Nome, descriÃ§Ã£o, ID, charge..."
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
              value={somenteNeofin ? "SIM" : "NAO"}
              onChange={(e) => setSomenteNeofin(e.target.value === "SIM")}
            >
              <option value="SIM">Somente integradas</option>
              <option value="NAO">Todas</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            <button
              className="rounded-md border px-3 py-2 text-sm"
              onClick={() => void carregar()}
              disabled={loading}
            >
              {loading ? "Carregando..." : "Recarregar"}
            </button>

            <Link
              className="rounded-md border px-3 py-2 text-sm"
              href="/admin/governanca/boletos-neofin"
              title="Painel especifico de cobrancas por provedor (view + reconciliacao)"
            >
              Cobrancas (Provedor)
            </Link>

            <div className="ml-auto text-sm text-muted-foreground flex gap-4">
              <span>
                Total: <strong>{kpis.total}</strong>
              </span>
              <span>
                Emitidas: <strong>{kpis.emitidos}</strong>
              </span>
              <span>
                Pagas: <strong>{kpis.pagos}</strong>
              </span>
              <span>
                Pendentes: <strong>{kpis.pendentes}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="text-sm text-muted-foreground flex gap-6">
          <span>
            Valor total: <strong>{formatBRL(kpis.valorTotal)}</strong>
          </span>
          <span>
            Valor pago: <strong>{formatBRL(kpis.valorPago)}</strong>
          </span>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-left">
                <th className="p-3">ID</th>
                <th className="p-3">Pessoa</th>
                <th className="p-3">DescriÃ§Ã£o</th>
                <th className="p-3">Vencimento</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Status</th>
                <th className="p-3">NeoFin</th>
                <th className="p-3">AÃ§Ãµes</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3">{c.id}</td>
                  <td className="p-3">
                    <div className="font-medium">{c.pessoa?.nome ?? "(sem nome)"}</div>
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
                        abrir link
                      </a>
                    ) : (
                      <div className="text-xs text-muted-foreground">sem link</div>
                    )}
                  </td>
                  <td className="p-3">
                    <Link className="underline" href={`/admin/governanca/cobrancas/${c.id}`}>
                      detalhar
                    </Link>
                  </td>
                </tr>
              ))}

              {filtrados.length === 0 && !loading && (
                <tr>
                  <td className="p-6 text-muted-foreground" colSpan={8}>
                    Nenhuma cobranÃ§a encontrada com os filtros atuais.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td className="p-6 text-muted-foreground" colSpan={8}>
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

