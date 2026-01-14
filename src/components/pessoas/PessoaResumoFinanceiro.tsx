"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ResumoFinanceiro = {
  pessoa_id: number;
  responsavel_financeiro_id: number;
  responsavel_financeiro?: { id: number; nome: string | null } | null;
  cobrancas: Array<{
    id: number;
    devedor_pessoa_id: number;
    data_vencimento: string | null;
    valor_centavos: number;
    status: string;
    origem_tipo: string;
    origem_subtipo: string;
    vencida: boolean;
    created_at: string | null;
  }>;
  faturas_credito_conexao: Array<{
    id: number;
    conta_conexao_id: number;
    periodo_referencia: string;
    data_vencimento: string | null;
    valor_total_centavos: number;
    status: string;
    vencida: boolean;
    created_at: string | null;
  }>;
  agregados: {
    cobrancas_pendentes_qtd: number;
    cobrancas_pendentes_total_centavos: number;
    cobrancas_vencidas_qtd: number;
    faturas_pendentes_qtd: number;
    faturas_pendentes_total_centavos: number;
    faturas_vencidas_qtd: number;
  };
};

type CobrancaAvulsa = {
  id: number;
  origem_tipo: string;
  origem_id: number;
  valor_centavos: number;
  vencimento: string;
  status: string;
  meio: string;
  motivo_excecao: string;
  observacao: string | null;
  criado_em: string | null;
  pago_em: string | null;
};

function formatBRLFromCentavos(v: number): string {
  const reais = (v ?? 0) / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function statusBadge(label: string, tone: "neutral" | "warning") {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium";
  const toneClass =
    tone === "warning"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={`${base} ${toneClass}`}>{label}</span>;
}

export function PessoaResumoFinanceiro({ pessoaId }: { pessoaId: number }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ResumoFinanceiro | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avulsas, setAvulsas] = useState<CobrancaAvulsa[]>([]);
  const [avulsasError, setAvulsasError] = useState<string | null>(null);

  const [payOpen, setPayOpen] = useState(false);
  const [payCobrancaId, setPayCobrancaId] = useState<number | null>(null);
  const [payValor, setPayValor] = useState<number>(0);
  const [payMetodo, setPayMetodo] = useState<string>("PIX");
  const [payComprovante, setPayComprovante] = useState<string>("");
  const [payError, setPayError] = useState<string | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  const loadResumo = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAvulsasError(null);
    try {
      const res = await fetch(`/api/pessoas/${pessoaId}/resumo-financeiro`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error ?? `erro_http_${res.status}`);
      }
      const j = (await res.json()) as ResumoFinanceiro;
      setData(j);

      try {
        const responsavelId = Number(j.responsavel_financeiro_id || pessoaId);
        const alvoId = Number.isFinite(responsavelId) ? responsavelId : pessoaId;
        const resAv = await fetch(`/api/financeiro/pessoas/${alvoId}/cobrancas-avulsas`, {
          cache: "no-store",
        });
        const jsonAv = await resAv.json().catch(() => ({}));
        if (!resAv.ok || !jsonAv?.ok || !Array.isArray(jsonAv?.data)) {
          setAvulsas([]);
          setAvulsasError("Falha ao carregar cobrancas avulsas.");
        } else {
          setAvulsas(jsonAv.data as CobrancaAvulsa[]);
        }
      } catch {
        setAvulsas([]);
        setAvulsasError("Falha ao carregar cobrancas avulsas.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "erro_carregar_resumo";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [pessoaId]);

  useEffect(() => {
    void loadResumo();
  }, [loadResumo]);

  const responsavelLabel = useMemo(() => {
    if (!data) return null;
    const rf = data.responsavel_financeiro;
    if (!rf) return `#${data.responsavel_financeiro_id}`;
    return rf.nome ? `${rf.nome} (#${rf.id})` : `#${rf.id}`;
  }, [data]);

  async function pagarCobranca() {
    if (!payCobrancaId) return;
    setPayLoading(true);
    setPayError(null);

    try {
      const res = await fetch(
        `/api/financeiro/cobrancas-avulsas/${payCobrancaId}/registrar-recebimento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            forma_pagamento: payMetodo,
            valor_pago_centavos: payValor,
            comprovante: payComprovante || null,
          }),
        },
      );

      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        const message = j?.message || j?.details || j?.error || `erro_pagamento_${res.status}`;
        throw new Error(message);
      }

      setPayOpen(false);
      setPayCobrancaId(null);
      await loadResumo();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao registrar recebimento";
      setPayError(message);
    } finally {
      setPayLoading(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando resumo financeiro...</div>;
  }
  if (error) {
    return <div className="text-sm text-red-600">Falha ao carregar resumo financeiro: {error}</div>;
  }
  if (!data) {
    return <div className="text-sm text-muted-foreground">Sem dados.</div>;
  }

  const isOutroResponsavel = data.responsavel_financeiro_id !== data.pessoa_id;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Responsavel financeiro</CardTitle>
          <CardDescription>
            {isOutroResponsavel ? (
              <>
                Pagador identificado:{" "}
                <Link className="text-slate-900 underline" href={`/pessoas/${data.responsavel_financeiro_id}`}>
                  {responsavelLabel}
                </Link>
              </>
            ) : (
              <>A propria pessoa e o responsavel financeiro.</>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cobrancas avulsas</CardTitle>
          <CardDescription>
            Cobrancas geradas manualmente para excecoes (fora do Cartao Conexao).
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {avulsasError ? (
            <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
              {avulsasError}
            </div>
          ) : null}

          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Cobranca</th>
                  <th className="py-2 text-left">Vencimento</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-left">Meio</th>
                  <th className="py-2 text-right">Valor</th>
                  <th className="py-2 text-left">Motivo</th>
                  <th className="py-2 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {avulsas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-3 text-muted-foreground">
                      Nenhuma cobranca avulsa encontrada.
                    </td>
                  </tr>
                ) : (
                  avulsas.map((c) => {
                    const vencida =
                      c.vencimento && c.vencimento < new Date().toISOString().slice(0, 10);
                    return (
                      <tr key={c.id} className="border-t">
                        <td className="py-2">#{c.id}</td>
                        <td className="py-2">{c.vencimento}</td>
                        <td className="py-2">
                          {vencida && c.status === "PENDENTE"
                            ? statusBadge("VENCIDA", "warning")
                            : statusBadge(c.status, "neutral")}
                        </td>
                        <td className="py-2">{c.meio}</td>
                        <td className="py-2 text-right">{formatBRLFromCentavos(c.valor_centavos)}</td>
                        <td className="py-2">{c.motivo_excecao}</td>
                        <td className="py-2 text-right">
                          {c.status === "PENDENTE" ? (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setPayCobrancaId(c.id);
                                setPayValor(c.valor_centavos);
                                setPayMetodo("PIX");
                                setPayComprovante("");
                                setPayOpen(true);
                              }}
                            >
                              Registrar recebimento
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cartao Conexao (faturas)</CardTitle>
          <CardDescription>
            Faturas pendentes: {data.agregados.faturas_pendentes_qtd} - Total:{" "}
            {formatBRLFromCentavos(data.agregados.faturas_pendentes_total_centavos)} - Em atraso:{" "}
            {data.agregados.faturas_vencidas_qtd}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Fatura</th>
                  <th className="py-2 text-left">Competencia</th>
                  <th className="py-2 text-left">Vencimento</th>
                  <th className="py-2 text-left">Status</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 text-right">Abrir</th>
                </tr>
              </thead>
              <tbody>
                {data.faturas_credito_conexao.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-3 text-muted-foreground">
                      Nenhuma fatura pendente do Cartao Conexao encontrada.
                    </td>
                  </tr>
                ) : (
                  data.faturas_credito_conexao.map((f) => (
                    <tr key={f.id} className="border-t">
                      <td className="py-2">#{f.id}</td>
                      <td className="py-2">{f.periodo_referencia}</td>
                      <td className="py-2">{f.data_vencimento ?? "-"}</td>
                      <td className="py-2">
                        {f.vencida ? statusBadge("EM ATRASO", "warning") : statusBadge(f.status, "neutral")}
                      </td>
                      <td className="py-2 text-right">
                        {formatBRLFromCentavos(f.valor_total_centavos)}
                      </td>
                      <td className="py-2 text-right">
                        <Link
                          className="rounded-lg border px-3 py-1 text-sm hover:bg-slate-50"
                          href={`/administracao/financeiro/credito-conexao/faturas/${f.id}`}
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Observacao: o link de fatura usa a rota do admin financeiro. Se a rota real for diferente, ajuste.
          </div>
        </CardContent>
      </Card>

      {payOpen && payCobrancaId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-4 shadow">
            <div className="font-semibold">Registrar recebimento</div>
            <div className="mt-1 text-sm text-muted-foreground">Cobranca #{payCobrancaId}</div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                Forma de pagamento
                <select
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={payMetodo}
                  onChange={(e) => setPayMetodo(e.target.value)}
                >
                  <option value="PIX">PIX</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="CARTAO_CREDITO_AVISTA">Cartao de credito (a vista)</option>
                  <option value="CARTAO_CREDITO_PARCELADO">Cartao de credito (parcelado)</option>
                  <option value="CARTAO_CONEXAO_ALUNO">Cartao Conexao (Aluno)</option>
                  <option value="CARTAO_CONEXAO_COLABORADOR">Cartao Conexao (Colaborador)</option>
                  <option value="CREDITO_INTERNO_ALUNO">Credito interno (Aluno)</option>
                  <option value="CREDIARIO_COLABORADOR">Crediario (Colaborador)</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </label>

              <label className="text-sm">
                Valor pago (centavos)
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  type="number"
                  value={payValor}
                  onChange={(e) => setPayValor(Number(e.target.value))}
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  Padrao: {formatBRLFromCentavos(payValor)}.
                </div>
              </label>

              <label className="text-sm md:col-span-2">
                Comprovante (opcional)
                <input
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={payComprovante}
                  onChange={(e) => setPayComprovante(e.target.value)}
                />
              </label>
            </div>

            {payError ? (
              <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
                {payError}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setPayOpen(false);
                  setPayCobrancaId(null);
                }}
              >
                Cancelar
              </Button>

              <Button onClick={pagarCobranca} disabled={payLoading}>
                {payLoading ? "Processando..." : "Confirmar pagamento"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
