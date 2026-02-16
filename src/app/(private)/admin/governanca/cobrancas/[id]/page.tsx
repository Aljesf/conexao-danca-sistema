"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Pessoa = {
  nome: string | null;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
};

type CobrancaDetalhe = {
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
  neofin_payload: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  pessoa: Pessoa | null;
};

type ApiDetalheResponse = {
  ok: boolean;
  data?: CobrancaDetalhe;
  error?: string;
  detail?: string | null;
};

type ApiSyncResponse = {
  ok: boolean;
  status?: string;
  error?: string;
  detail?: string | null;
  data?: Partial<CobrancaDetalhe>;
};

function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function previewPayload(payload: Record<string, unknown> | null): string {
  if (!payload) return "Sem payload NeoFin registrado.";
  const compact = JSON.stringify(payload);
  if (!compact) return "Sem payload NeoFin registrado.";
  if (compact.length <= 2000) return JSON.stringify(payload, null, 2);
  return `${compact.slice(0, 2000)}...`;
}

function buildNeofinExternalUrl(item: CobrancaDetalhe | null): string | null {
  if (!item) return null;
  if (item.link_pagamento) return item.link_pagamento;
  if (!item.neofin_charge_id) return null;
  return `https://api.sandbox.neofin.services/billing/${encodeURIComponent(item.neofin_charge_id)}`;
}

export default function GovernancaCobrancaDetalhePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);

  const [item, setItem] = useState<CobrancaDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) return;

    setLoading(true);
    setErro(null);

    try {
      const res = await fetch(`/api/governanca/cobrancas/${id}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as ApiDetalheResponse | null;

      if (!res.ok || !json?.ok || !json.data) {
        setItem(null);
        setErro(json?.detail ?? json?.error ?? "falha_carregar_cobranca");
        return;
      }

      setItem(json.data);
    } catch (e) {
      setItem(null);
      setErro(e instanceof Error ? e.message : "falha_inesperada");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function sincronizarComNeofin() {
    if (!Number.isFinite(id) || id <= 0) return;
    setSyncing(true);
    setSyncMsg(null);

    try {
      const res = await fetch(`/api/governanca/cobrancas/${id}/sincronizar-neofin`, { method: "POST" });
      const json = (await res.json().catch(() => null)) as ApiSyncResponse | null;

      if (!res.ok || !json?.ok) {
        setSyncMsg(`Falha ao sincronizar: ${json?.detail ?? json?.error ?? "erro_desconhecido"}`);
        return;
      }

      setSyncMsg(`Sincronização concluída. Status local: ${json?.status ?? item?.status ?? "-"}`);
      await carregar();
    } catch (e) {
      setSyncMsg(`Falha ao sincronizar: ${e instanceof Error ? e.message : "erro_inesperado"}`);
    } finally {
      setSyncing(false);
    }
  }

  const titulo = useMemo(() => {
    if (item?.id) return `Cobrança #${item.id}`;
    return `Cobrança #${Number.isFinite(id) ? id : "-"}`;
  }, [item, id]);

  const neofinUrl = buildNeofinExternalUrl(item);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{titulo}</h1>
              <p className="text-sm text-muted-foreground">Detalhe para auditoria e reconciliação com NeoFin.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/admin/governanca/cobrancas">
                Voltar
              </Link>
              <Link
                className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                href="/admin/governanca/boletos-neofin"
              >
                Cobranças (Provedor)
              </Link>
              {neofinUrl ? (
                <a
                  className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                  href={neofinUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir no NeoFin
                </a>
              ) : null}
              {item?.neofin_charge_id ? (
                <button
                  className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                  onClick={() => void sincronizarComNeofin()}
                  disabled={syncing}
                >
                  {syncing ? "Sincronizando..." : "Sincronizar com NeoFin"}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          {loading ? <div className="text-sm text-muted-foreground">Carregando...</div> : null}
          {erro && !loading ? <div className="text-sm text-red-700">{erro}</div> : null}
          {syncMsg ? <div className="mb-4 text-sm text-slate-700">{syncMsg}</div> : null}

          {!loading && !erro && item ? (
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Pessoa</div>
                <div className="font-medium">{item.pessoa_nome ?? "-"}</div>
                <div className="text-xs text-muted-foreground">
                  CPF: {item.pessoa?.cpf ?? "-"} | E-mail: {item.pessoa?.email ?? "-"} | Telefone: {item.pessoa?.telefone ?? "-"}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Status local</div>
                <div className="font-medium">{item.status}</div>
                <div className="text-xs text-muted-foreground">Atualizado em: {item.updated_at}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Descrição</div>
                <div className="font-medium">{item.descricao}</div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground">Valor</div>
                <div className="font-medium">{formatBRL(item.valor_centavos)}</div>
                <div className="text-xs text-muted-foreground">Vencimento: {item.vencimento}</div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground">NeoFin</div>
                <div className="font-medium">charge_id: {item.neofin_charge_id ?? "-"}</div>
                <div className="text-xs text-muted-foreground">link_pagamento: {item.link_pagamento ?? "-"}</div>
                <div className="text-xs text-muted-foreground">linha_digitavel: {item.linha_digitavel ?? "-"}</div>
              </div>

              <div className="md:col-span-2">
                <div className="text-xs text-muted-foreground">Último payload NeoFin (resumo)</div>
                <pre className="mt-1 max-h-72 overflow-auto rounded-md bg-slate-50 p-3 text-xs">
{previewPayload(item.neofin_payload)}
                </pre>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

