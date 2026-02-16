"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

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

export default function GovernancaCobrancaDetalhePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);

  const [item, setItem] = useState<Cobranca | null>(null);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cobrancas", { method: "GET" });
      const json = await res.json();
      const data = (json?.data ?? []) as Cobranca[];
      const found = data.find((c) => c.id === id) ?? null;
      setItem(found);
    } catch (e) {
      console.error(e);
      alert("Falha ao carregar detalhe (ver console).");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (Number.isFinite(id) && id > 0) void carregar();
  }, [id, carregar]);

  const titulo = useMemo(() => {
    if (!item) return `CobranÃ§a #${Number.isFinite(id) ? id : "-"}`;
    return `CobranÃ§a #${item.id} â€” ${item.pessoa?.nome ?? "Pessoa"}`;
  }, [item, id]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{titulo}</h1>
          <p className="text-sm text-muted-foreground">
            Detalhe para auditoria. Fonte: /api/cobrancas (modo atual).
          </p>
        </div>

        <div className="ml-auto flex gap-2">
          <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/governanca/cobrancas">
            Voltar
          </Link>
          <Link className="rounded-md border px-3 py-2 text-sm" href="/admin/governanca/boletos-neofin">
            Cobrancas (Provedor)
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        {loading && <div className="text-sm text-muted-foreground">Carregando...</div>}

        {!loading && !item && (
          <div className="text-sm text-muted-foreground">CobranÃ§a nÃ£o encontrada.</div>
        )}

        {!loading && item && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Pessoa</div>
              <div className="font-medium">{item.pessoa?.nome ?? "-"}</div>
              <div className="text-xs text-muted-foreground">
                CPF: {item.pessoa?.cpf ?? "-"} â€¢ Email: {item.pessoa?.email ?? "-"} â€¢ Tel:{" "}
                {item.pessoa?.telefone ?? "-"}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Valores</div>
              <div className="font-medium">{formatBRL(item.valor_centavos)}</div>
              <div className="text-xs text-muted-foreground">Moeda: {item.moeda}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Datas</div>
              <div>
                Vencimento: <strong>{item.vencimento}</strong>
              </div>
              <div>
                Pagamento: <strong>{item.data_pagamento ?? "-"}</strong>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="font-medium">{item.status}</div>
              <div className="text-xs text-muted-foreground">MÃ©todo: {item.metodo_pagamento ?? "-"}</div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground">DescriÃ§Ã£o</div>
              <div className="font-medium">{item.descricao}</div>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground">NeoFin</div>
              <div className="font-medium">charge_id: {item.neofin_charge_id ?? "-"}</div>
              {item.link_pagamento ? (
                <a className="underline" href={item.link_pagamento} target="_blank" rel="noreferrer">
                  abrir link de pagamento
                </a>
              ) : (
                <div className="text-muted-foreground">sem link</div>
              )}
            </div>

            <div className="md:col-span-2 text-xs text-muted-foreground">
              created_at: {item.created_at} â€¢ updated_at: {item.updated_at}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

