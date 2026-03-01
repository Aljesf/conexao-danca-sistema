"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type CobrancaAvulsa = {
  id: number;
  pessoa_id?: number;
  pagador_pessoa_id?: number;
  pagador_nome?: string | null;
  pagador_cpf?: string | null;
  pagador_telefone?: string | null;
  origem_tipo: string | null;
  origem_id: number | null;
  matricula_id?: number | null;
  aluno_pessoa_id?: number | null;
  aluno_nome?: string | null;
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

function formatOrigemTipo(v: string | null | undefined): string {
  const raw = (v ?? "").trim();
  if (!raw) return "--";
  const upper = raw.toUpperCase();
  if (upper === "MATRICULA_ENTRADA") return "Matricula (Entrada)";
  if (upper === "MATRICULA") return "Matricula";
  if (upper.startsWith("MATRICULA")) return "Matricula";
  return raw
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
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
      await load();
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
          {(() => {
            const pagadorId = Number(cobranca.pagador_pessoa_id ?? cobranca.pessoa_id ?? 0);
            const pagadorNome = (cobranca.pagador_nome ?? "").trim() || `Pessoa #${pagadorId}`;
            const alunoId = Number(cobranca.aluno_pessoa_id ?? 0);
            const alunoNome = (cobranca.aluno_nome ?? "").trim() || `Aluno #${alunoId}`;
            const origemTipo = formatOrigemTipo(cobranca.origem_tipo);
            const origemIdLabel = cobranca.origem_id ? `(#${cobranca.origem_id})` : "(#--)";

            return (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="text-sm">
                    <div className="text-slate-500">Responsavel financeiro</div>
                    <div className="text-base font-semibold text-slate-900">
                      {pagadorNome} <span className="font-normal text-slate-500">({`#${pagadorId}`})</span>
                    </div>
                    {pagadorId > 0 ? (
                      <Link
                        className="text-xs text-slate-600 underline hover:text-slate-800"
                        href={`/pessoas/${pagadorId}`}
                      >
                        Abrir responsavel ({`#${pagadorId}`})
                      </Link>
                    ) : null}
                  </div>

                  {alunoId > 0 ? (
                    <div className="text-sm">
                      <div className="text-slate-500">Aluno/Beneficiario</div>
                      <div className="text-base font-semibold text-slate-900">
                        {alunoNome} <span className="font-normal text-slate-500">({`#${alunoId}`})</span>
                      </div>
                      <Link
                        className="text-xs text-slate-600 underline hover:text-slate-800"
                        href={`/pessoas/${alunoId}`}
                      >
                        Abrir aluno ({`#${alunoId}`})
                      </Link>
                    </div>
                  ) : null}

                  <div className="text-sm">
                    <div className="text-slate-500">Origem</div>
                    <div className="text-base font-semibold text-slate-900">
                      {origemTipo} <span className="font-normal text-slate-500">{origemIdLabel}</span>
                    </div>
                    {cobranca.matricula_id ? (
                      <Link
                        className="text-xs text-slate-600 underline hover:text-slate-800"
                        href={`/escola/matriculas/${cobranca.matricula_id}`}
                      >
                        Abrir matricula ({`#${cobranca.matricula_id}`})
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
                    <div className="text-sm text-slate-600">Valor</div>
                    <div className="mt-1 text-3xl font-extrabold text-slate-900">
                      {brlFromCentavos(Number(cobranca.valor_centavos || 0))}
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      Status: <span className="font-semibold text-slate-800">{cobranca.status}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

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
              Meio de pagamento (informativo)
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
        </div>
      )}
    </div>
  );
}
