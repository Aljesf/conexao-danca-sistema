"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TabKey = "geral" | "cartao" | "folha" | "remuneracao" | "jornada";
type PagamentoTipo = "PAGAMENTO" | "ADIANTAMENTO" | "SAQUE";

type ResumoData = {
  colaborador: { id: number; pessoa_nome: string | null };
  periodo_atual?: string | null;
  conta_conexao: { id: number; tipo_conta: string } | null;
  fatura_aberta_atual: { id: number; valor_total_centavos: number; status: string } | null;
  lancamentos_mes: { competencia: string; quantidade: number; total_centavos: number };
  ultimas_despesas: Array<{ id: number; descricao: string | null; origem_sistema: string; valor_centavos: number }>;
  folhas_recentes: Array<{
    id: number;
    competencia_ano_mes: string;
    status: string;
    proventos_centavos: number;
    descontos_centavos: number;
    liquido_centavos: number;
  }>;
};

type ContaFinanceira = { id: number; nome: string; codigo: string; ativo?: boolean };
type RemuneracaoItem = {
  id: number;
  vigencia_inicio: string;
  vigencia_fim: string | null;
  salario_base_centavos: number;
  dia_pagamento_padrao: number | null;
  conta_financeira_padrao_id: number | null;
  ativo: boolean;
};
type RemuneracaoResponse = { ativa: RemuneracaoItem | null; historico: RemuneracaoItem[] };
type PagamentoItem = {
  id: number;
  tipo: PagamentoTipo;
  data_pagamento: string;
  competencia_ano_mes: string | null;
  valor_centavos: number;
  folha_pagamento_colaborador_id: number | null;
  observacoes: string | null;
};

function fmtCentavos(v: number): string {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("pt-BR");
}

function parseCentavos(input: string): number | null {
  const normalized = input.trim().replace(/\s+/g, "").replace(".", "").replace(",", ".");
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function currentCompetencia(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function PerfilColaboradorPage() {
  const params = useParams<{ id: string }>();
  const colaboradorId = useMemo(() => Number(params?.id), [params?.id]);
  const [tab, setTab] = useState<TabKey>("geral");
  const [resumo, setResumo] = useState<ResumoData | null>(null);
  const [contas, setContas] = useState<ContaFinanceira[]>([]);
  const [remuneracao, setRemuneracao] = useState<RemuneracaoResponse | null>(null);
  const [pagamentos, setPagamentos] = useState<PagamentoItem[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPagamentoForm, setShowPagamentoForm] = useState(false);

  const [vigenciaInicio, setVigenciaInicio] = useState(todayIsoDate());
  const [vigenciaFim, setVigenciaFim] = useState("");
  const [salarioBase, setSalarioBase] = useState("0,00");
  const [diaPagamento, setDiaPagamento] = useState("");
  const [contaPadrao, setContaPadrao] = useState("");

  const [pagTipo, setPagTipo] = useState<PagamentoTipo>("ADIANTAMENTO");
  const [pagData, setPagData] = useState(todayIsoDate());
  const [pagValor, setPagValor] = useState("0,00");
  const [pagCompetencia, setPagCompetencia] = useState(currentCompetencia());
  const [pagConta, setPagConta] = useState("");
  const [pagObs, setPagObs] = useState("");
  const [aplicarFolha, setAplicarFolha] = useState(true);
  const [folhaCompetencia, setFolhaCompetencia] = useState(currentCompetencia());
  const [gerarMovimento, setGerarMovimento] = useState(false);
  const router = useRouter();
  const [msgAcao, setMsgAcao] = useState<string | null>(null);
  const [creatingContaInterna, setCreatingContaInterna] = useState(false);
  const [startingFolha, setStartingFolha] = useState(false);

  function competenciaAtualYYYYMM(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  }

  async function recarregarResumo() {
    await loadResumo();
  }

  async function criarContaInternaColaborador() {
    if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) return;
    setCreatingContaInterna(true);
    setMsgAcao(null);
    try {
      const r = await fetch(`/api/admin/colaboradores/${colaboradorId}/criar-conta-colaborador`, { method: "POST" });
      const j = (await r.json().catch(() => null)) as { conta?: unknown; error?: string } | null;
      if (!r.ok) throw new Error(j?.error ?? "falha_criar_conta_interna");
      await recarregarResumo();
      setMsgAcao("Conta interna (COLABORADOR) criada/validada com sucesso.");
    } catch (e) {
      setMsgAcao(e instanceof Error ? e.message : "erro_desconhecido");
    } finally {
      setCreatingContaInterna(false);
    }
  }

  async function iniciarGeracaoFolhaMesAtual() {
    if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) return;

    const competencia = resumo?.periodo_atual || competenciaAtualYYYYMM();

    setStartingFolha(true);
    setMsgAcao(null);

    try {
      const r1 = await fetch("/api/financeiro/folha/abrir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competencia,
          dia_pagamento: 5,
          pagamento_no_mes_seguinte: true,
        }),
      });
      const j1 = (await r1.json().catch(() => null)) as { folha?: { id: number }; error?: string } | null;
      if (!r1.ok) throw new Error(j1?.error ?? "falha_abrir_folha");

      const r2 = await fetch("/api/financeiro/folha/gerar-espelho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competencia_base: competencia,
          meses: 1,
          importar_cartao: true,
        }),
      });
      const j2 = (await r2.json().catch(() => null)) as
        | { folhas?: Array<{ id: number; competencia?: string }>; error?: string; imported_cartao_total?: number }
        | null;

      if (!r2.ok) throw new Error(j2?.error ?? "falha_gerar_espelho");

      const folhasResp = Array.isArray(j2?.folhas) ? j2.folhas : [];
      const folhaDoMes = folhasResp.find((f) => String(f.competencia ?? "") === competencia);

      const folhaId = folhaDoMes?.id ?? j1?.folha?.id;
      if (!folhaId || !Number.isFinite(folhaId)) {
        setMsgAcao("Folha criada, mas nao consegui resolver o ID para abrir o detalhe. Abra manualmente na tela de Folha.");
        return;
      }

      setMsgAcao(`Folha da competencia ${competencia} iniciada. Itens de cartao importados: ${Number(j2?.imported_cartao_total ?? 0)}.`);

      router.push(`/admin/financeiro/folha/colaboradores/${folhaId}`);
    } catch (e) {
      setMsgAcao(e instanceof Error ? e.message : "erro_desconhecido");
    } finally {
      setStartingFolha(false);
    }
  }

  async function loadResumo() {
    const res = await fetch(`/api/admin/colaboradores/${colaboradorId}/resumo-financeiro`);
    const payload = (await res.json().catch(() => null)) as { ok?: boolean; data?: ResumoData } | null;
    setResumo(res.ok && payload?.ok ? (payload.data ?? null) : null);
  }

  async function loadRemuneracao() {
    const res = await fetch(`/api/admin/colaboradores/${colaboradorId}/remuneracao`);
    const payload = (await res.json().catch(() => null)) as { ok?: boolean; data?: RemuneracaoResponse } | null;
    const data = res.ok && payload?.ok ? (payload.data ?? { ativa: null, historico: [] }) : { ativa: null, historico: [] };
    setRemuneracao(data);
    if (data.ativa) {
      setVigenciaInicio(data.ativa.vigencia_inicio);
      setVigenciaFim(data.ativa.vigencia_fim ?? "");
      setSalarioBase((data.ativa.salario_base_centavos / 100).toFixed(2).replace(".", ","));
      setDiaPagamento(data.ativa.dia_pagamento_padrao ? String(data.ativa.dia_pagamento_padrao) : "");
      setContaPadrao(data.ativa.conta_financeira_padrao_id ? String(data.ativa.conta_financeira_padrao_id) : "");
    }
  }

  async function loadPagamentos() {
    const res = await fetch(`/api/admin/colaboradores/${colaboradorId}/pagamentos?limit=20`);
    const payload = (await res.json().catch(() => null)) as { ok?: boolean; data?: PagamentoItem[] } | null;
    setPagamentos(res.ok && payload?.ok && Array.isArray(payload.data) ? payload.data : []);
  }

  async function loadContas() {
    const res = await fetch("/api/financeiro/contas-financeiras");
    const payload = (await res.json().catch(() => null)) as { ok?: boolean; contas?: ContaFinanceira[] } | null;
    setContas(res.ok && payload?.ok && Array.isArray(payload.contas) ? payload.contas : []);
  }

  async function salvarRemuneracao() {
    const salario = parseCentavos(salarioBase);
    if (salario === null) return window.alert("Salario base invalido.");
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/colaboradores/${colaboradorId}/remuneracao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vigencia_inicio: vigenciaInicio,
          vigencia_fim: vigenciaFim.trim() || null,
          salario_base_centavos: salario,
          dia_pagamento_padrao: diaPagamento.trim() ? Number(diaPagamento) : null,
          conta_financeira_padrao_id: contaPadrao ? Number(contaPadrao) : null,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; detail?: string } | null;
      if (!res.ok || !payload?.ok) {
        return window.alert(payload?.detail ?? payload?.error ?? "falha_salvar_remuneracao");
      }
      setFeedback("Remuneracao ativa atualizada.");
      await loadRemuneracao();
    } finally {
      setBusy(false);
    }
  }

  async function registrarPagamento() {
    const valor = parseCentavos(pagValor);
    if (valor === null || valor <= 0) return window.alert("Valor invalido.");
    const aplicaFolha = (pagTipo === "ADIANTAMENTO" || pagTipo === "SAQUE") && aplicarFolha;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/colaboradores/${colaboradorId}/pagamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: pagTipo,
          data_pagamento: pagData,
          competencia_ano_mes: pagCompetencia.trim() || null,
          valor_centavos: valor,
          conta_financeira_id: pagConta ? Number(pagConta) : null,
          observacoes: pagObs.trim() || null,
          aplicar_na_folha: aplicaFolha,
          folha_competencia_ano_mes: aplicaFolha ? folhaCompetencia.trim() : null,
          gerar_movimento_financeiro: gerarMovimento,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; detail?: string } | null;
      if (!res.ok || !payload?.ok) {
        return window.alert(payload?.detail ?? payload?.error ?? "falha_registrar_pagamento");
      }
      setShowPagamentoForm(false);
      setPagValor("0,00");
      setPagObs("");
      setPagConta("");
      setGerarMovimento(false);
      setFeedback("Pagamento/adiantamento registrado.");
      await loadPagamentos();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) return;
    void loadResumo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colaboradorId]);

  useEffect(() => {
    if (tab !== "remuneracao") return;
    void loadRemuneracao();
    void loadPagamentos();
    void loadContas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, colaboradorId]);

  if (!Number.isFinite(colaboradorId) || colaboradorId <= 0) {
    return <div className="p-6 text-sm text-red-600">ID de colaborador inválido.</div>;
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Perfil do colaborador</h1>
          <p className="text-sm text-muted-foreground">
            {resumo?.colaborador.pessoa_nome || `Colaborador #${colaboradorId}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link className="border rounded px-3 py-1 text-sm" href={`/admin/financeiro/folha/colaboradores?colaborador_id=${colaboradorId}`}>
            Ir para folhas
          </Link>
          <Link className="border rounded px-3 py-1 text-sm" href="/admin/config/colaboradores">
            Cadastro colaboradores
          </Link>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2 flex-wrap">
        {(["geral", "cartao", "folha", "remuneracao", "jornada"] as TabKey[]).map((key) => (
          <button
            key={key}
            className={`border rounded px-3 py-1 text-sm ${tab === key ? "bg-slate-900 text-white" : ""}`}
            onClick={() => setTab(key)}
            type="button"
          >
            {key === "geral"
              ? "Visao geral"
              : key === "cartao"
                ? "Conta interna / Despesas"
                : key === "folha"
                  ? "Folha"
                  : key === "remuneracao"
                    ? "Remuneracao"
                    : "Jornada"}
          </button>
        ))}
      </div>

      {feedback ? <p className="text-sm text-emerald-700">{feedback}</p> : null}

      {tab === "geral" ? (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="border rounded p-3 text-sm">
              <div className="text-xs text-muted-foreground">Conta interna</div>
              <div>{resumo?.conta_conexao ? `#${resumo.conta_conexao.id} (${resumo.conta_conexao.tipo_conta})` : "Não criada"}</div>
            </div>
            <div className="border rounded p-3 text-sm">
              <div className="text-xs text-muted-foreground">Fatura aberta</div>
              <div>{resumo?.fatura_aberta_atual ? fmtCentavos(resumo.fatura_aberta_atual.valor_total_centavos) : "Sem fatura aberta"}</div>
            </div>
            <div className="border rounded p-3 text-sm">
              <div className="text-xs text-muted-foreground">Lancamentos do mes</div>
              <div>{resumo ? `${resumo.lancamentos_mes.quantidade} itens - ${fmtCentavos(resumo.lancamentos_mes.total_centavos)}` : "-"}</div>
            </div>
          </div>

          <div className="border rounded p-3 text-sm">
            <div className="font-medium">Ações rápidas</div>

            {msgAcao ? <div className="mt-2 text-xs text-slate-600">{msgAcao}</div> : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {!resumo?.conta_conexao ? (
                <button
                  type="button"
                  className="rounded border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                  disabled={creatingContaInterna}
                  onClick={() => void criarContaInternaColaborador()}
                >
                  {creatingContaInterna ? "Criando conta interna..." : "Criar conta interna"}
                </button>
              ) : null}

              <button
                type="button"
                className="rounded border px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60"
                disabled={startingFolha}
                onClick={() => void iniciarGeracaoFolhaMesAtual()}
              >
                {startingFolha ? "Iniciando..." : "Iniciar geração da folha (mês atual)"}
              </button>

              <Link className="rounded border px-3 py-2 text-sm hover:bg-slate-50" href="/admin/financeiro/folha/colaboradores">
                Abrir módulo de folha
              </Link>
            </div>

            <div className="mt-2 text-xs text-slate-500">
              Observação: a folha aparece quando o “espelho” é gerado para a competência (salário base + descontos).
            </div>
          </div>
        </div>
      ) : null}

      {tab === "cartao" ? (
        <div className="space-y-2">
          {!resumo?.conta_conexao ? (
            <p className="text-sm text-muted-foreground">Este colaborador ainda não possui conta interna vinculada.</p>
          ) : null}
          <div className="text-sm font-medium">Últimas despesas</div>
          {(resumo?.ultimas_despesas ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Sem despesas recentes.</p> : null}
          {(resumo?.ultimas_despesas ?? []).map((d) => (
            <div key={d.id} className="border rounded p-3 text-sm flex justify-between">
              <span>{d.descricao || d.origem_sistema}</span>
              <span>{fmtCentavos(d.valor_centavos)}</span>
            </div>
          ))}
          <Link className="underline text-sm" href="/admin/financeiro/credito-conexao/faturas">
            Ver faturas da conta interna
          </Link>
        </div>
      ) : null}

      {tab === "folha" ? (
        <div className="space-y-2">
          {(resumo?.folhas_recentes ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Sem folhas recentes.</p> : null}
          {(resumo?.folhas_recentes ?? []).map((f) => (
            <div key={f.id} className="border rounded p-3 text-sm">
              <div className="font-medium">Folha #{f.id} - {f.competencia_ano_mes}</div>
              <div className="text-xs text-muted-foreground">Status {f.status} • Liquido {fmtCentavos(f.liquido_centavos)}</div>
              <Link className="underline text-xs" href={`/admin/financeiro/folha/colaboradores/${f.id}`}>
                Ver detalhe
              </Link>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "remuneracao" ? (
        <div className="space-y-4">
          <section className="border rounded p-4 space-y-3">
            <div className="text-sm font-medium">Salario / remuneracao ativa</div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">Vigencia inicio
                <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={vigenciaInicio} onChange={(e) => setVigenciaInicio(e.target.value)} />
              </label>
              <label className="text-sm">Vigencia fim
                <input type="date" className="w-full border rounded px-3 py-2 text-sm" value={vigenciaFim} onChange={(e) => setVigenciaFim(e.target.value)} />
              </label>
              <label className="text-sm">Salario base
                <input className="w-full border rounded px-3 py-2 text-sm" value={salarioBase} onChange={(e) => setSalarioBase(e.target.value)} placeholder="0,00" />
              </label>
              <label className="text-sm">Dia pagamento padrao
                <input className="w-full border rounded px-3 py-2 text-sm" value={diaPagamento} onChange={(e) => setDiaPagamento(e.target.value)} placeholder="5" />
              </label>
              <label className="text-sm md:col-span-2">Conta financeira padrao
                <select className="w-full border rounded px-3 py-2 text-sm" value={contaPadrao} onChange={(e) => setContaPadrao(e.target.value)}>
                  <option value="">Nao definida</option>
                  {contas.filter((c) => c.ativo !== false).map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.nome} ({c.codigo})</option>
                  ))}
                </select>
              </label>
            </div>
            <button type="button" className="border rounded px-3 py-1 text-sm" disabled={busy} onClick={() => void salvarRemuneracao()}>
              {busy ? "Salvando..." : "Salvar remuneracao ativa"}
            </button>
            <p className="text-xs text-muted-foreground">
              {remuneracao?.ativa ? `Ativa desde ${fmtData(remuneracao.ativa.vigencia_inicio)} com salario ${fmtCentavos(remuneracao.ativa.salario_base_centavos)}.` : "Nenhuma remuneracao ativa cadastrada."}
            </p>
          </section>

          <section className="border rounded p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium">Pagamentos e adiantamentos</div>
              <button className="border rounded px-3 py-1 text-sm" type="button" onClick={() => setShowPagamentoForm((v) => !v)}>
                {showPagamentoForm ? "Fechar" : "Registrar"}
              </button>
            </div>

            {showPagamentoForm ? (
              <div className="border rounded p-3 space-y-2 bg-slate-50">
                <div className="grid gap-2 md:grid-cols-3">
                  <select className="border rounded px-3 py-2 text-sm" value={pagTipo} onChange={(e) => setPagTipo(e.target.value as PagamentoTipo)}>
                    <option value="PAGAMENTO">PAGAMENTO</option>
                    <option value="ADIANTAMENTO">ADIANTAMENTO</option>
                    <option value="SAQUE">SAQUE</option>
                  </select>
                  <input type="date" className="border rounded px-3 py-2 text-sm" value={pagData} onChange={(e) => setPagData(e.target.value)} />
                  <input className="border rounded px-3 py-2 text-sm" value={pagValor} onChange={(e) => setPagValor(e.target.value)} placeholder="Valor 0,00" />
                  <input className="border rounded px-3 py-2 text-sm" value={pagCompetencia} onChange={(e) => setPagCompetencia(e.target.value)} placeholder="Competencia YYYY-MM" />
                  <select className="border rounded px-3 py-2 text-sm" value={pagConta} onChange={(e) => setPagConta(e.target.value)}>
                    <option value="">Conta financeira (opcional)</option>
                    {contas.filter((c) => c.ativo !== false).map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.nome} ({c.codigo})</option>
                    ))}
                  </select>
                  <input className="border rounded px-3 py-2 text-sm" value={pagObs} onChange={(e) => setPagObs(e.target.value)} placeholder="Observacoes" />
                </div>

                {(pagTipo === "ADIANTAMENTO" || pagTipo === "SAQUE") ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="text-sm flex items-center gap-2">
                      <input type="checkbox" checked={aplicarFolha} onChange={(e) => setAplicarFolha(e.target.checked)} />
                      Aplicar na folha como desconto
                    </label>
                    {aplicarFolha ? (
                      <input className="border rounded px-3 py-2 text-sm" value={folhaCompetencia} onChange={(e) => setFolhaCompetencia(e.target.value)} placeholder="Competencia folha YYYY-MM" />
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">PAGAMENTO registra historico operacional sem evento automatico na folha.</p>
                )}

                <label className="text-sm flex items-center gap-2">
                  <input type="checkbox" checked={gerarMovimento} onChange={(e) => setGerarMovimento(e.target.checked)} />
                  Gerar saida no financeiro
                </label>

                <button className="border rounded px-3 py-1 text-sm" type="button" disabled={busy} onClick={() => void registrarPagamento()}>
                  {busy ? "Registrando..." : "Confirmar registro"}
                </button>
              </div>
            ) : null}

            {(pagamentos ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Sem pagamentos registrados.</p> : null}
            {(pagamentos ?? []).map((p) => (
              <div key={p.id} className="border rounded p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{p.tipo}</span>
                  <span>{fmtCentavos(p.valor_centavos)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Data {fmtData(p.data_pagamento)} • Competencia {p.competencia_ano_mes ?? "-"}
                  {p.folha_pagamento_colaborador_id ? ` • Folha #${p.folha_pagamento_colaborador_id}` : ""}
                </div>
                {p.observacoes ? <div className="text-xs text-muted-foreground mt-1">{p.observacoes}</div> : null}
              </div>
            ))}
          </section>
        </div>
      ) : null}

      {tab === "jornada" ? (
        <div className="border rounded p-3 text-sm">
          <div className="font-medium">Jornada</div>
          <p className="text-muted-foreground mt-1">Modulo de ponto/jornada segue em implementacao.</p>
          <Link className="underline text-sm" href="/admin/config/colaboradores/jornadas">
            Abrir pagina de jornadas
          </Link>
        </div>
      ) : null}
    </div>
  );
}
