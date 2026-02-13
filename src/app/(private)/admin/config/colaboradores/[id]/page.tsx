"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Resumo = {
  colaborador: { id: number; pessoa_id: number; tipo_vinculo_id: number | null; ativo: boolean };
  pessoa: { id: number; nome: string; cpf: string | null; telefone: string | null; email: string | null };
  config_financeira: {
    id: number;
    colaborador_id: number;
    gera_folha: boolean;
    dia_fechamento: number;
    dia_pagamento: number;
    pagamento_no_mes_seguinte: boolean;
    politica_desconto_cartao: string;
    politica_corte_cartao: string;
    ativo: boolean;
  } | null;
  cartao_conexao: {
    id: number;
    tipo_conta: string;
    descricao_exibicao: string | null;
    dia_fechamento: number;
    dia_vencimento: number | null;
    ativo: boolean;
  } | null;
  faturas_recentes: Array<{
    id: number;
    periodo_referencia: string;
    valor_total_centavos: number;
    status: string;
    data_fechamento: string;
    data_vencimento: string | null;
    folha_pagamento_id: number | null;
  }>;
};

function brlFromCentavos(v: number): string {
  const n = v / 100;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ColaboradorDetalhesPage({ params }: { params: { id: string } }) {
  const colaboradorId = useMemo(() => Number(params.id), [params.id]);
  const [loading, setLoading] = useState(true);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        setLoading(true);
        setErro(null);
        const r = await fetch(`/api/admin/colaboradores/${colaboradorId}/resumo-financeiro`, { cache: "no-store" });
        const j = (await r.json()) as Partial<Resumo> & { error?: string };
        if (!r.ok) throw new Error(j?.error ?? "falha_carregar");
        if (alive) setResumo(j as Resumo);
      } catch (e) {
        if (alive) setErro(e instanceof Error ? e.message : "erro_desconhecido");
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (Number.isFinite(colaboradorId)) void run();
    return () => {
      alive = false;
    };
  }, [colaboradorId]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">Colaborador - Visão Geral</h1>
              <p className="text-sm text-slate-600">
                Central de configuração do colaborador: vínculo, folha e Cartão Conexão (crédito interno).
              </p>
            </div>
            <div className="flex gap-2">
              <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/admin/config/colaboradores">
                Voltar
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">Carregando...</div>
        ) : erro ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm text-red-600">{erro}</div>
        ) : !resumo ? (
          <div className="rounded-2xl border bg-white p-6 shadow-sm">Sem dados.</div>
        ) : (
          <>
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Identificação</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-slate-500">Nome</div>
                  <div className="font-medium">{resumo.pessoa.nome}</div>
                  <div className="mt-2 text-xs text-slate-500">Contato</div>
                  <div className="text-sm text-slate-700">
                    {resumo.pessoa.telefone ?? "-"} • {resumo.pessoa.email ?? "-"}
                  </div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-slate-500">Status</div>
                  <div className="font-medium">{resumo.colaborador.ativo ? "Ativo" : "Inativo"}</div>
                  <div className="mt-2 text-xs text-slate-500">Pessoa ID</div>
                  <div className="text-sm text-slate-700">{resumo.pessoa.id}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Configuração Financeira do Colaborador</h2>
              <p className="text-sm text-slate-600">
                Define se o colaborador gera folha automaticamente e como o Cartão Conexão entra como desconto.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-slate-500">Gera folha automaticamente</div>
                  <div className="font-medium">{resumo.config_financeira?.gera_folha ? "Sim" : "Não"}</div>

                  <div className="mt-3 text-xs text-slate-500">Fechamento / Pagamento</div>
                  <div className="text-sm text-slate-700">
                    Fecha dia {resumo.config_financeira?.dia_fechamento ?? "-"} • Paga dia{" "}
                    {resumo.config_financeira?.dia_pagamento ?? "-"}{" "}
                    {resumo.config_financeira?.pagamento_no_mes_seguinte ? "(mês seguinte)" : "(mesmo mês)"}
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <div className="text-xs text-slate-500">Política do Cartão Conexão</div>
                  <div className="text-sm text-slate-700">
                    {resumo.config_financeira?.politica_desconto_cartao ?? "-"} •{" "}
                    {resumo.config_financeira?.politica_corte_cartao ?? "-"}
                  </div>
                  <div className="mt-3 text-xs text-slate-500">Ações rápidas</div>
                  <div className="flex gap-2">
                    <Link className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50" href="/admin/financeiro/folha/colaboradores">
                      Ir para Folha
                    </Link>
                    {resumo.cartao_conexao?.id && resumo.faturas_recentes?.[0]?.id ? (
                      <Link
                        className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50"
                        href={`/admin/financeiro/credito-conexao/faturas/${resumo.faturas_recentes[0].id}`}
                      >
                        Ver última fatura
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-500">Sem Cartão Conexão COLABORADOR</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Cartão Conexão - Faturas recentes</h2>
              {!resumo.cartao_conexao ? (
                <div className="mt-3 text-sm text-slate-600">
                  Nenhuma conta do tipo COLABORADOR encontrada para esta pessoa.
                </div>
              ) : resumo.faturas_recentes.length === 0 ? (
                <div className="mt-3 text-sm text-slate-600">Nenhuma fatura recente.</div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Período</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-right">Valor</th>
                        <th className="px-3 py-2 text-left">Vinculada na folha</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumo.faturas_recentes.map((f) => (
                        <tr key={f.id} className="border-t">
                          <td className="px-3 py-2">{f.periodo_referencia}</td>
                          <td className="px-3 py-2">{f.status}</td>
                          <td className="px-3 py-2 text-right">{brlFromCentavos(f.valor_total_centavos)}</td>
                          <td className="px-3 py-2">{f.folha_pagamento_id ? `Folha #${f.folha_pagamento_id}` : "-"}</td>
                          <td className="px-3 py-2 text-right">
                            <Link className="text-purple-700 hover:underline" href={`/admin/financeiro/credito-conexao/faturas/${f.id}`}>
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

