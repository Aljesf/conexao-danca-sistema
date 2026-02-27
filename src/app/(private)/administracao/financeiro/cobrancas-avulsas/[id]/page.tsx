"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type CobrancaAvulsa = {
  id: number;
  pessoa_id: number;
  origem_tipo: string | null;
  origem_id: number | null;
  valor_centavos: number;
  vencimento: string | null;
  status: string;
  meio: string | null;
  motivo_excecao: string | null;
  observacao: string | null;
  criado_em: string | null;
  pago_em: string | null;
};

function brlFromCentavos(v: number): string {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Page() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params?.id);

  const [loading, setLoading] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);
  const [cobranca, setCobranca] = React.useState<CobrancaAvulsa | null>(null);
  const [vencimento, setVencimento] = React.useState("");
  const [meio, setMeio] = React.useState("");
  const [observacao, setObservacao] = React.useState("");

  async function load() {
    try {
      setLoading(true);
      setErro(null);
      const res = await fetch(`/api/financeiro/cobrancas-avulsas/${id}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `erro_http_${res.status}`);
      }
      const c = json.cobranca as CobrancaAvulsa;
      setCobranca(c);
      setVencimento(c.vencimento ?? "");
      setMeio(c.meio ?? "");
      setObservacao(c.observacao ?? "");
    } catch (e) {
      const message = e instanceof Error ? e.message : "falha_ao_carregar_cobranca";
      setErro(message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setErro("id_invalido");
      setLoading(false);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function salvar() {
    if (!cobranca) return;
    try {
      setErro(null);
      const res = await fetch(`/api/financeiro/cobrancas-avulsas/${cobranca.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vencimento, meio, observacao }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `erro_http_${res.status}`);
      }
      setCobranca(json.cobranca as CobrancaAvulsa);
    } catch (e) {
      const message = e instanceof Error ? e.message : "falha_ao_salvar";
      setErro(message);
    }
  }

  async function cancelar() {
    if (!cobranca) return;
    try {
      setErro(null);
      const res = await fetch(`/api/financeiro/cobrancas-avulsas/${cobranca.id}/cancelar`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `erro_http_${res.status}`);
      }
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : "falha_ao_cancelar";
      setErro(message);
    }
  }

  const origemLabel =
    cobranca?.origem_tipo && cobranca?.origem_id
      ? `${cobranca.origem_tipo} #${cobranca.origem_id}`
      : (cobranca?.origem_tipo ?? "--");

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Cobranca avulsa #{Number.isFinite(id) ? id : "--"}
          </h1>
          <div className="text-sm text-slate-600">Edicao/cancelamento com rastreabilidade.</div>
        </div>
        <button className="rounded-md border px-3 py-2 text-sm" onClick={() => router.back()}>
          Voltar
        </button>
      </div>

      {erro ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {erro}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-slate-600">Carregando...</div>
      ) : !cobranca ? (
        <div className="text-sm text-slate-600">Nao encontrado.</div>
      ) : (
        <div className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="text-sm">
              <div className="text-slate-500">Pessoa</div>
              <div className="font-medium">#{cobranca.pessoa_id}</div>
            </div>
            <div className="text-sm">
              <div className="text-slate-500">Origem</div>
              <div className="font-medium">{origemLabel}</div>
            </div>
            <div className="text-sm">
              <div className="text-slate-500">Valor</div>
              <div className="font-medium">
                {brlFromCentavos(Number(cobranca.valor_centavos || 0))}
              </div>
            </div>
            <div className="text-sm">
              <div className="text-slate-500">Status</div>
              <div className="font-medium">{cobranca.status}</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-700">
              Vencimento
              <input
                type="date"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
              />
            </label>
            <label className="text-sm text-slate-700">
              Meio (texto)
              <input
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                value={meio}
                onChange={(e) => setMeio(e.target.value)}
                placeholder="PIX, BOLETO, DINHEIRO..."
              />
            </label>
          </div>

          <label className="text-sm text-slate-700">
            Observacao
            <textarea
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Motivo/nota operacional..."
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-500">
              Motivo: {cobranca.motivo_excecao ?? "--"} | Criado: {cobranca.criado_em ?? "--"} | Pago:{" "}
              {cobranca.pago_em ?? "--"}
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-white"
                onClick={() => void salvar()}
              >
                Salvar
              </button>
              <button
                className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                onClick={() => void cancelar()}
              >
                Cancelar cobranca
              </button>
            </div>
          </div>

          {cobranca.pessoa_id ? (
            <div className="pt-2 text-sm">
              <Link className="underline" href={`/administracao/pessoas/${cobranca.pessoa_id}`}>
                Abrir pessoa #{cobranca.pessoa_id}
              </Link>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
