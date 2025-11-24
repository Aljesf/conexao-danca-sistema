"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Pessoa = {
  id: number;
  nome: string;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
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
  link_pagamento: string | null;
  neofin_charge_id: string | null;
  created_at: string;
  updated_at: string;
  pessoa?: Pessoa | null;
};

type ApiResponse = {
  data: Cobranca[];
};

function formatCurrency(valorCentavos: number, moeda: string = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: moeda,
  }).format(valorCentavos / 100);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface DetalhesProps {
  params: { id: string };
}

export default function CobrancaDetalhesPage({ params }: DetalhesProps) {
  const id = Number(params.id);

  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados específicos do reenvio Neofin
  const [reenviando, setReenviando] = useState(false);
  const [mensagemReenvio, setMensagemReenvio] = useState<string | null>(null);
  const [erroReenvio, setErroReenvio] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    if (!id || Number.isNaN(id)) {
      setError("ID da cobrança inválido na URL.");
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/cobrancas", { cache: "no-store" });

        if (!res.ok) {
          throw new Error(`Erro ao buscar cobrança (status ${res.status})`);
        }

        const json = (await res.json()) as ApiResponse;
        const encontrada = (json.data ?? []).find((c) => c.id === id) || null;

        if (!ignore) {
          if (!encontrada) {
            setError("Cobrança não encontrada.");
          } else {
            setCobranca(encontrada);
          }
        }
      } catch (err: any) {
        console.error("[CobrancaDetalhes] erro ao carregar:", err);
        if (!ignore) setError(err?.message ?? "Erro inesperado ao carregar.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [id]);

  async function handleReenviarNeofin() {
    if (!id || Number.isNaN(id)) return;

    try {
      setReenviando(true);
      setErroReenvio(null);
      setMensagemReenvio(null);

      const res = await fetch(`/financeiro/cobrancas/${id}/reenviar`, {
        method: "POST",
      });

      if (!res.ok) {
        let mensagem = `Falha ao reenviar para a Neofin (status ${res.status}).`;
        try {
          const body = await res.json();
          if (body?.error) {
            mensagem = String(body.error);
          }
        } catch {
          // se não conseguir ler JSON, mantém mensagem padrão
        }
        throw new Error(mensagem);
      }

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      // Se a API devolver a cobrança atualizada, atualizamos o estado local
      if (json?.data) {
        setCobranca(json.data as Cobranca);
      }

      setMensagemReenvio("Cobrança reenviada para a Neofin com sucesso.");
    } catch (err: any) {
      console.error("[CobrancaDetalhes] erro no reenvio Neofin:", err);
      setErroReenvio(
        err?.message ?? "Erro inesperado ao reenviar para a Neofin."
      );
    } finally {
      setReenviando(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <Link
        href="/financeiro/cobrancas"
        className="text-sm text-purple-700 hover:underline"
      >
        ← Voltar para cobranças
      </Link>

      {loading && (
        <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Carregando cobrança...
        </div>
      )}

      {error && !loading && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && cobranca && (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold text-slate-800">
            Cobrança #{cobranca.id}
          </h1>

          {/* Bloco principal */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">
                Responsável financeiro
              </h2>
              <div className="text-sm text-slate-800">
                {cobranca.pessoa?.nome ?? `Pessoa #${cobranca.pessoa_id}`}
              </div>
              <div className="text-xs text-slate-500 space-y-0.5">
                {cobranca.pessoa?.email && <div>{cobranca.pessoa.email}</div>}
                {cobranca.pessoa?.telefone && (
                  <div>Telefone: {cobranca.pessoa.telefone}</div>
                )}
                {cobranca.pessoa?.cpf && <div>CPF: {cobranca.pessoa.cpf}</div>}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-700">
                Informações da cobrança
              </h2>
              <div className="text-sm text-slate-800">{cobranca.descricao}</div>

              <div className="text-sm text-slate-700 space-y-1">
                <div>
                  <span className="font-semibold">Valor: </span>
                  {formatCurrency(cobranca.valor_centavos, cobranca.moeda)}
                </div>
                <div>
                  <span className="font-semibold">Vencimento: </span>
                  {formatDate(cobranca.vencimento)}
                </div>
                <div>
                  <span className="font-semibold">Status: </span>
                  {cobranca.status}
                </div>
                <div>
                  <span className="font-semibold">Criada em: </span>
                  {formatDate(cobranca.created_at)}
                </div>
                <div>
                  <span className="font-semibold">Atualizada em: </span>
                  {formatDate(cobranca.updated_at)}
                </div>
                <div>
                  <span className="font-semibold">Pagamento: </span>
                  {cobranca.data_pagamento
                    ? formatDate(cobranca.data_pagamento)
                    : "Ainda não consta pagamento"}
                </div>
              </div>
            </div>
          </div>

          {/* Integração Neofin / Ações */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">
              Integração com a Neofin
            </h2>

            {cobranca.neofin_charge_id ? (
              <div className="text-sm text-slate-700 space-y-1">
                <div>
                  <span className="font-semibold">Identificador: </span>
                  {cobranca.neofin_charge_id}
                </div>
                <div className="text-xs text-slate-500">
                  Essa cobrança já foi enfileirada na Neofin.
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-700">
                Essa cobrança ainda não foi integrada à Neofin.
              </div>
            )}

            {/* Mensagens de sucesso/erro do reenvio */}
            {mensagemReenvio && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                {mensagemReenvio}
              </div>
            )}

            {erroReenvio && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {erroReenvio}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {cobranca.link_pagamento && (
                <a
                  href={cobranca.link_pagamento}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-md border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50"
                >
                  Abrir link de pagamento
                </a>
              )}

              <button
                type="button"
                onClick={handleReenviarNeofin}
                disabled={reenviando}
                className="inline-flex items-center rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reenviando ? "Reenviando..." : "Reenviar para a Neofin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
