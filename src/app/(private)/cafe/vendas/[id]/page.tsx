"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CafeCard from "@/components/cafe/CafeCard";
import CafePageShell from "@/components/cafe/CafePageShell";
import CafeVendaReciboPrint from "@/components/cafe/CafeVendaReciboPrint";
import { type CafeVendaRecibo } from "@/lib/cafe/venda-recibo";

type VendaDetalheResponse = {
  ok?: boolean;
  error?: string;
  detalhe?: string | null;
  venda?: CafeVendaRecibo;
};

export default function CafeVendaReciboPage() {
  const params = useParams<{ id: string }>();
  const vendaId = params?.id ? String(params.id) : "";
  const [venda, setVenda] = useState<CafeVendaRecibo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    if (!vendaId) {
      setMensagem("ID da venda invalido.");
      setVenda(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function carregarVenda() {
      setLoading(true);
      setMensagem(null);
      try {
        const response = await fetch(`/api/cafe/vendas/${encodeURIComponent(vendaId)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as VendaDetalheResponse | null;
        if (!response.ok || !payload?.venda) {
          throw new Error(payload?.detalhe ?? payload?.error ?? "falha_carregar_recibo_cafe");
        }

        setVenda(payload.venda);
      } catch (error) {
        if (controller.signal.aborted) return;
        setVenda(null);
        setMensagem(error instanceof Error ? error.message : "falha_carregar_recibo_cafe");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void carregarVenda();
    return () => controller.abort();
  }, [vendaId]);

  return (
    <CafePageShell
      eyebrow="Ballet Cafe"
      title="Recibo da venda"
      description="Visualizacao operacional da venda para consulta rapida, reimpressao e rastreabilidade."
      actions={
        <div className="print:hidden flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-[#d7c3a4] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-[#fff8ef]"
            onClick={() => window.print()}
          >
            Imprimir
          </button>
          <Link
            href="/cafe/vendas"
            className="rounded-full border border-[#d7c3a4] bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-[#fff8ef]"
          >
            Voltar para vendas
          </Link>
          <Link
            href="/cafe/vendas"
            className="rounded-full bg-[#9a3412] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#7c2d12]"
          >
            Nova venda
          </Link>
        </div>
      }
    >
      {mensagem ? (
        <CafeCard variant="muted">
          <p className="text-sm leading-6 text-amber-900">{mensagem}</p>
        </CafeCard>
      ) : null}

      {loading ? (
        <CafeCard title="Carregando recibo" description="Buscando a venda e as referencias correlatas do Ballet Cafe.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-[18px] border border-[#eadfcd] bg-white" />
            ))}
          </div>
        </CafeCard>
      ) : null}

      {!loading && venda ? <CafeVendaReciboPrint venda={venda} /> : null}
    </CafePageShell>
  );
}
