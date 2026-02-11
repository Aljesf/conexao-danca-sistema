"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TabKey = "geral" | "cartao" | "folha" | "jornada";

type ResumoData = {
  colaborador: {
    id: number;
    ativo: boolean;
    pessoa_id: number | null;
    pessoa_nome: string | null;
    pessoa_cpf: string | null;
  };
  conta_conexao: {
    id: number;
    tipo_conta: string;
    descricao_exibicao: string | null;
    dia_fechamento: number | null;
    dia_vencimento: number | null;
    ativo: boolean;
  } | null;
  periodo_atual: string;
  fatura_aberta_atual: {
    id: number;
    conta_conexao_id: number;
    periodo_referencia: string;
    data_vencimento: string | null;
    valor_total_centavos: number;
    valor_taxas_centavos: number;
    status: string;
    folha_pagamento_id: number | null;
  } | null;
  lancamentos_mes: {
    competencia: string;
    quantidade: number;
    total_centavos: number;
  };
  ultimas_despesas: Array<{
    id: number;
    origem_sistema: string;
    origem_id: number | null;
    descricao: string | null;
    valor_centavos: number;
    data_lancamento: string;
    status: string;
    competencia: string | null;
    cobranca_id: number | null;
  }>;
  folhas_recentes: Array<{
    id: number;
    competencia_ano_mes: string;
    status: string;
    data_fechamento: string | null;
    data_pagamento: string | null;
    proventos_centavos: number;
    descontos_centavos: number;
    liquido_centavos: number;
  }>;
};

type FolhaResumo = {
  id: number;
  competencia_ano_mes: string;
  status: string;
  data_fechamento: string | null;
  data_pagamento: string | null;
  proventos_centavos: number;
  descontos_centavos: number;
  liquido_centavos: number;
};

function fmtCentavos(valor: number): string {
  return (valor / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-BR");
}

export default function PerfilColaboradorPage() {
  const params = useParams<{ id: string }>();
  const colaboradorId = Number(params.id);

  const [tab, setTab] = useState<TabKey>("geral");
  const [loadingResumo, setLoadingResumo] = useState(false);
  const [loadingFolhas, setLoadingFolhas] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resumo, setResumo] = useState<ResumoData | null>(null);
  const [folhas, setFolhas] = useState<FolhaResumo[] | null>(null);

  const nomeColaborador = resumo?.colaborador.pessoa_nome || (Number.isFinite(colaboradorId) ? `Colaborador #${colaboradorId}` : "Colaborador");

  const abas = useMemo(
    () =>
      [
        { key: "geral", label: "Visão geral" },
        { key: "cartao", label: "Cartão / Despesas" },
        { key: "folha", label: "Folha" },
        { key: "jornada", label: "Jornada" },
      ] as Array<{ key: TabKey; label: string }>,
    [],
  );

  async function loadResumo() {
    if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) return;
    setLoadingResumo(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/colaboradores/${colaboradorId}/resumo-financeiro`);
      const payload = (await res.json().catch(() => null)) as { ok?: boolean; data?: ResumoData; error?: string } | null;
      if (!res.ok || !payload?.ok || !payload.data) {
        setErro(payload?.error ?? "falha_carregar_resumo");
        setResumo(null);
        return;
      }
      setResumo(payload.data);
    } finally {
      setLoadingResumo(false);
    }
  }

  async function loadFolhas() {
    if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) return;
    setLoadingFolhas(true);
    try {
      const res = await fetch(`/api/admin/colaboradores/${colaboradorId}/folhas?limit=24`);
      const payload = (await res.json().catch(() => null)) as { ok?: boolean; data?: FolhaResumo[] } | null;
      if (!res.ok || !payload?.ok || !Array.isArray(payload.data)) {
        setFolhas([]);
        return;
      }
      setFolhas(payload.data);
    } finally {
      setLoadingFolhas(false);
    }
  }

  useEffect(() => {
    void loadResumo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colaboradorId]);

  useEffect(() => {
    if (tab === "folha" && folhas === null) {
      void loadFolhas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, folhas, colaboradorId]);

  if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">ID de colaborador inválido.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Perfil do colaborador</h1>
          <p className="text-sm text-muted-foreground">
            {nomeColaborador} - #{colaboradorId}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="border rounded px-3 py-1 text-sm" href="/admin/config/colaboradores">
            Cadastro de colaboradores
          </Link>
          <Link className="border rounded px-3 py-1 text-sm" href={`/admin/financeiro/folha/colaboradores?colaborador_id=${colaboradorId}`}>
            Ir para folhas
          </Link>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2">
        {abas.map((aba) => (
          <button
            key={aba.key}
            type="button"
            onClick={() => setTab(aba.key)}
            className={`rounded px-3 py-1 text-sm border ${tab === aba.key ? "bg-slate-900 text-white border-slate-900" : "border-slate-300"}`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {erro ? <p className="text-sm text-red-600">Erro: {erro}</p> : null}
      {loadingResumo && !resumo ? <p className="text-sm text-muted-foreground">Carregando perfil...</p> : null}

      {tab === "geral" ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="border rounded p-3">
              <div className="text-xs text-muted-foreground">Conta Cartão Conexão</div>
              <div className="text-sm font-medium mt-1">
                {resumo?.conta_conexao ? `#${resumo.conta_conexao.id} (${resumo.conta_conexao.tipo_conta})` : "Não encontrada"}
              </div>
            </div>
            <div className="border rounded p-3">
              <div className="text-xs text-muted-foreground">Fatura aberta do período</div>
              <div className="text-sm font-medium mt-1">
                {resumo?.fatura_aberta_atual ? fmtCentavos(resumo.fatura_aberta_atual.valor_total_centavos) : "Sem fatura aberta"}
              </div>
            </div>
            <div className="border rounded p-3">
              <div className="text-xs text-muted-foreground">Lançamentos do mês ({resumo?.lancamentos_mes.competencia ?? "-"})</div>
              <div className="text-sm font-medium mt-1">
                {resumo ? `${resumo.lancamentos_mes.quantidade} itens - ${fmtCentavos(resumo.lancamentos_mes.total_centavos)}` : "-"}
              </div>
            </div>
          </div>

          {resumo?.fatura_aberta_atual ? (
            <div className="border rounded p-3 text-sm">
              <div className="font-medium">Fatura atual #{resumo.fatura_aberta_atual.id}</div>
              <div className="text-muted-foreground">
                Competência {resumo.fatura_aberta_atual.periodo_referencia} • Vencimento {fmtData(resumo.fatura_aberta_atual.data_vencimento)} • Status{" "}
                {resumo.fatura_aberta_atual.status}
              </div>
              <div className="mt-2">
                <Link className="underline" href={`/admin/financeiro/credito-conexao/faturas/${resumo.fatura_aberta_atual.id}`}>
                  Ver fatura
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "cartao" ? (
        <div className="space-y-3">
          {!resumo?.conta_conexao ? (
            <p className="text-sm text-muted-foreground">Este colaborador ainda não possui conta de Cartão Conexão vinculada.</p>
          ) : null}

          <div className="border rounded">
            <div className="p-3 border-b text-sm font-medium">Últimas despesas</div>
            <div className="p-3 space-y-2">
              {(resumo?.ultimas_despesas ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem lançamentos recentes.</p>
              ) : (
                (resumo?.ultimas_despesas ?? []).map((item) => (
                  <div key={item.id} className="border rounded p-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <div className="font-medium">{item.descricao || item.origem_sistema}</div>
                      <div>{fmtCentavos(item.valor_centavos)}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {fmtData(item.data_lancamento)} • origem {item.origem_sistema}
                      {item.origem_id ? ` #${item.origem_id}` : ""} • status {item.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="text-sm">
            <Link className="underline" href="/admin/financeiro/credito-conexao/faturas">
              Ver todas as faturas
            </Link>
          </div>
        </div>
      ) : null}

      {tab === "folha" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Competências recentes</div>
            <Link className="underline text-sm" href={`/admin/financeiro/folha/colaboradores?colaborador_id=${colaboradorId}`}>
              Abrir módulo de folha
            </Link>
          </div>

          {loadingFolhas ? <p className="text-sm text-muted-foreground">Carregando folhas...</p> : null}

          {(folhas ?? resumo?.folhas_recentes ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma folha encontrada para este colaborador.</p>
          ) : (
            <div className="space-y-2">
              {(folhas ?? resumo?.folhas_recentes ?? []).map((folha) => (
                <div key={folha.id} className="border rounded p-3">
                  <div className="flex justify-between gap-2">
                    <div className="text-sm font-medium">Folha #{folha.id}</div>
                    <div className="text-xs">{folha.status}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Competência {folha.competencia_ano_mes} • Fechamento {fmtData(folha.data_fechamento)} • Pagamento {fmtData(folha.data_pagamento)}
                  </div>
                  <div className="mt-1 text-sm">
                    Líquido {fmtCentavos(folha.liquido_centavos)} (Proventos {fmtCentavos(folha.proventos_centavos)} / Descontos{" "}
                    {fmtCentavos(folha.descontos_centavos)})
                  </div>
                  <div className="mt-2">
                    <Link className="underline text-sm" href={`/admin/financeiro/folha/colaboradores/${folha.id}`}>
                      Ver detalhe da folha
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "jornada" ? (
        <div className="border rounded p-3 text-sm">
          <div className="font-medium">Jornada</div>
          <p className="text-muted-foreground mt-1">
            A central de jornada ainda depende da implementação operacional de ponto/frequência de colaborador.
          </p>
          <div className="mt-2">
            <Link className="underline" href="/admin/config/colaboradores/jornadas">
              Abrir página de jornadas
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
