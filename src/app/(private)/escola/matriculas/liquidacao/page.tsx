"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseBrowser";

type FormaPagamento = {
  id: number;
  nome: string;
  ativo: boolean;
};

type MatriculaResumo = {
  id: number;
  pessoa_id: number;
  responsavel_financeiro_id: number;
  metodo_liquidacao: string | null;
  movimento_concessao_id: string | null;
  primeira_cobranca_status: string;
  primeira_cobranca_tipo: string | null;
  primeira_cobranca_valor_centavos: number | null;
  total_mensalidade_centavos: number | null;
  data_inicio_vinculo?: string | null;
  data_matricula?: string | null;
};

type ExecucaoLiquidacao = {
  turma_id: number;
  nivel: string | null;
  valor_mensal_centavos: number;
  modelo_liquidacao: "FAMILIA" | "MOVIMENTO";
  movimento_concessao_id: string | null;
};

type ProrataResumo = {
  competenciaInicial: string | null;
  competenciaMensalidade: string | null;
  prorataCentavos: number | null;
  temProrata: boolean;
};

function formatCurrency(cents?: number | null): string {
  if (typeof cents !== "number" || Number.isNaN(cents)) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function parseDateParts(value: string | null): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function competenciaFromParts(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function calcularResumoPrimeiraCobranca(
  totalCentavos: number,
  dataInicio: string | null,
  dataMatricula: string | null
): ProrataResumo {
  if (!Number.isFinite(totalCentavos) || totalCentavos <= 0) {
    return { competenciaInicial: null, competenciaMensalidade: null, prorataCentavos: null, temProrata: false };
  }

  const fallback = parseDateParts(new Date().toISOString().slice(0, 10));
  const base = parseDateParts(dataInicio) ?? parseDateParts(dataMatricula) ?? fallback;
  if (!base) {
    return { competenciaInicial: null, competenciaMensalidade: null, prorataCentavos: null, temProrata: false };
  }

  const { year, month, day } = base;
  const competenciaInicial = competenciaFromParts(year, month);
  const cutoffDia = 12;
  const inicioLetivoJaneiro = 12;

  if (month === 1) {
    if (day <= inicioLetivoJaneiro) {
      return {
        competenciaInicial,
        competenciaMensalidade: competenciaInicial,
        prorataCentavos: 0,
        temProrata: false,
      };
    }
    const baseDiasJaneiro = 31 - inicioLetivoJaneiro + 1;
    const diasRestantes = Math.max(0, 31 - day + 1);
    const valor = Math.round((totalCentavos * diasRestantes) / baseDiasJaneiro);
    const mesPrimeira = Math.min(12, month + 1);
    return {
      competenciaInicial,
      competenciaMensalidade: competenciaFromParts(year, mesPrimeira),
      prorataCentavos: Math.max(0, valor),
      temProrata: true,
    };
  }

  if (day <= cutoffDia) {
    return {
      competenciaInicial,
      competenciaMensalidade: competenciaInicial,
      prorataCentavos: 0,
      temProrata: false,
    };
  }

  const ultimoDia = lastDayOfMonth(year, month);
  const diasRestantes = Math.max(0, ultimoDia - day + 1);
  const valor = Math.round((totalCentavos * diasRestantes) / 30);
  const mesPrimeira = Math.min(12, month + 1);
  return {
    competenciaInicial,
    competenciaMensalidade: competenciaFromParts(year, mesPrimeira),
    prorataCentavos: Math.max(0, valor),
    temProrata: true,
  };
}

function asUuidOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) {
    return null;
  }
  return v;
}

function parseOrigemExecucao(origemValor: string | null): {
  modelo_liquidacao: "FAMILIA" | "MOVIMENTO";
  movimento_concessao_id: string | null;
} {
  if (!origemValor) return { modelo_liquidacao: "FAMILIA", movimento_concessao_id: null };
  const raw = origemValor.toUpperCase();
  if (raw.startsWith("MANUAL|MOVIMENTO")) {
    const parts = origemValor.split("|");
    return {
      modelo_liquidacao: "MOVIMENTO",
      movimento_concessao_id: asUuidOrNull(parts.length >= 3 ? parts[2] : null),
    };
  }
  if (raw.startsWith("MANUAL_MOVIMENTO")) {
    const parts = origemValor.split(":");
    return {
      modelo_liquidacao: "MOVIMENTO",
      movimento_concessao_id: asUuidOrNull(parts.length >= 2 ? parts[1] : null),
    };
  }
  return { modelo_liquidacao: "FAMILIA", movimento_concessao_id: null };
}

export default function Page() {
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const routeIdRaw = routeParams?.id;
  const matriculaIdFromRoute = Array.isArray(routeIdRaw) ? routeIdRaw[0] : routeIdRaw ?? null;
  const matriculaId = matriculaIdFromRoute ?? searchParams.get("matriculaId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [matricula, setMatricula] = useState<MatriculaResumo | null>(null);
  const [execucoes, setExecucoes] = useState<ExecucaoLiquidacao[]>([]);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);

  // Campos do ato
  const [tipoPrimeira, setTipoPrimeira] = useState<"ENTRADA_PRORATA" | "MENSALIDADE_CHEIA_CARTAO">("ENTRADA_PRORATA");
  const [modo, setModo] = useState<"PAGAR_AGORA" | "LANCAR_NO_CARTAO" | "ADIAR_EXCECAO" | "MOVIMENTO">("PAGAR_AGORA");
  const [formaPagamentoId, setFormaPagamentoId] = useState<number | "">("");
  const [valorCentavos, setValorCentavos] = useState<string>("");
  const [dataPagamento, setDataPagamento] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState<string>("");
  const [motivoExcecao, setMotivoExcecao] = useState<string>("");
  const [vencimentoManual, setVencimentoManual] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [meioCobranca, setMeioCobranca] = useState<string>("BOLETO");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErro(null);

      const idNum = matriculaId ? Number(matriculaId) : NaN;
      if (!matriculaId || Number.isNaN(idNum)) {
        setErro("matriculaId ausente ou invalido na URL.");
        setLoading(false);
        return;
      }

      const { data: m, error: mErr } = await supabase
        .from("matriculas")
        .select(
          "id, pessoa_id, responsavel_financeiro_id, metodo_liquidacao, movimento_concessao_id, primeira_cobranca_status, primeira_cobranca_tipo, primeira_cobranca_valor_centavos, total_mensalidade_centavos, data_inicio_vinculo, data_matricula",
        )
        .eq("id", idNum)
        .single();

      if (mErr || !m) {
        setErro("Nao foi possivel carregar a matricula.");
        setLoading(false);
        return;
      }

      setMatricula(m as MatriculaResumo);
      if (["PAGA", "LANCADA_CARTAO", "ADIADA_EXCECAO", "LIQUIDADO_INSTITUCIONAL"].includes(String(m.primeira_cobranca_status))) {
        setErro("Matricula ja liquidada.");
        setLoading(false);
        return;
      }
      if ((m as { metodo_liquidacao?: string | null }).metodo_liquidacao === "CREDITO_BOLSA") {
        setModo("MOVIMENTO");
      }
      if (m.primeira_cobranca_tipo === "ENTRADA_PRORATA" || m.primeira_cobranca_tipo === "MENSALIDADE_CHEIA_CARTAO") {
        setTipoPrimeira(m.primeira_cobranca_tipo);
      }

      const { data: execRows, error: execErr } = await supabase
        .from("matricula_execucao_valores")
        .select("turma_id,nivel,valor_mensal_centavos,origem_valor")
        .eq("matricula_id", idNum)
        .eq("ativo", true);

      if (execErr) {
        setErro(`Nao foi possivel carregar as execucoes da matricula: ${execErr.message}`);
        setLoading(false);
        return;
      }

      const execucoesNorm = (execRows ?? [])
        .map((row) => {
          const r = row as Record<string, unknown>;
          const turmaId = Number(r.turma_id);
          const valor = Number(r.valor_mensal_centavos);
          if (!Number.isInteger(turmaId) || turmaId <= 0 || !Number.isFinite(valor) || valor < 0) return null;
          const nivel = typeof r.nivel === "string" ? r.nivel : null;
          const origem = typeof r.origem_valor === "string" ? r.origem_valor : null;
          const origemParsed = parseOrigemExecucao(origem);
          return {
            turma_id: turmaId,
            nivel,
            valor_mensal_centavos: Math.trunc(valor),
            modelo_liquidacao:
              origemParsed.modelo_liquidacao === "MOVIMENTO" ||
              String((m as { metodo_liquidacao?: string | null }).metodo_liquidacao ?? "").toUpperCase() ===
                "CREDITO_BOLSA"
                ? "MOVIMENTO"
                : "FAMILIA",
            movimento_concessao_id:
              origemParsed.movimento_concessao_id ?? asUuidOrNull((m as { movimento_concessao_id?: string | null }).movimento_concessao_id ?? null),
          } satisfies ExecucaoLiquidacao;
        })
        .filter((row): row is ExecucaoLiquidacao => !!row);

      setExecucoes(execucoesNorm);

      const totalFamiliaExecucoes = execucoesNorm
        .filter((execucao) => execucao.modelo_liquidacao === "FAMILIA")
        .reduce((acc, execucao) => acc + execucao.valor_mensal_centavos, 0);
      const totalMovimentoExecucoes = execucoesNorm
        .filter((execucao) => execucao.modelo_liquidacao === "MOVIMENTO")
        .reduce((acc, execucao) => acc + execucao.valor_mensal_centavos, 0);

      if (
        execucoesNorm.length > 0 &&
        execucoesNorm.every((execucao) => execucao.modelo_liquidacao === "MOVIMENTO")
      ) {
        setModo("MOVIMENTO");
      }

      const valorSugeridoEntradaCentavos =
        totalFamiliaExecucoes > 0
          ? totalFamiliaExecucoes
          : totalMovimentoExecucoes > 0
            ? totalMovimentoExecucoes
            : typeof m.primeira_cobranca_valor_centavos === "number"
              ? m.primeira_cobranca_valor_centavos
              : typeof m.total_mensalidade_centavos === "number"
                ? m.total_mensalidade_centavos
                : 0;
      const valorStr =
        typeof valorSugeridoEntradaCentavos === "number" ? String(valorSugeridoEntradaCentavos) : "";
      setValorCentavos(valorStr);
      if (!valorStr) {
        setErro("Valor nao resolvido na matricula. Volte e gere a matricula novamente.");
      }

      const { data: fp, error: fpErr } = await supabase
        .from("formas_pagamento")
        .select("id, nome, ativo")
        .eq("ativo", true)
        .order("nome", { ascending: true });

      if (fpErr) {
        setErro("Nao foi possivel carregar as formas de pagamento.");
        setLoading(false);
        return;
      }

      setFormas((fp ?? []) as FormaPagamento[]);
      setLoading(false);
    };

    void run();
  }, [matriculaId, supabase]);

  useEffect(() => {
    if (tipoPrimeira !== "ENTRADA_PRORATA" && modo === "ADIAR_EXCECAO") {
      setModo("LANCAR_NO_CARTAO");
    }
  }, [modo, tipoPrimeira]);

  const execucoesFamilia = useMemo(
    () => execucoes.filter((execucao) => execucao.modelo_liquidacao === "FAMILIA"),
    [execucoes],
  );
  const execucoesMovimento = useMemo(
    () => execucoes.filter((execucao) => execucao.modelo_liquidacao === "MOVIMENTO"),
    [execucoes],
  );
  const totalFamiliaExecucoes = useMemo(
    () => execucoesFamilia.reduce((acc, execucao) => acc + execucao.valor_mensal_centavos, 0),
    [execucoesFamilia],
  );
  const totalMovimentoExecucoes = useMemo(
    () => execucoesMovimento.reduce((acc, execucao) => acc + execucao.valor_mensal_centavos, 0),
    [execucoesMovimento],
  );
  const isMovimentoInstitucional =
    execucoes.length > 0
      ? execucoesMovimento.length > 0 && execucoesFamilia.length === 0
      : matricula?.metodo_liquidacao === "CREDITO_BOLSA";
  const isHibridoExecucoes = execucoesMovimento.length > 0 && execucoesFamilia.length > 0;
  const precisaFormaPagamento = modo === "PAGAR_AGORA";
  const precisaMotivo = modo === "ADIAR_EXCECAO";
  const precisaVencimentoManual = modo === "ADIAR_EXCECAO";
  const precisaValor = modo === "PAGAR_AGORA" || modo === "LANCAR_NO_CARTAO";
  const valorResolvido = valorCentavos.trim() !== "";
  const resumoPrimeira = useMemo(() => {
    const total = Number(matricula?.total_mensalidade_centavos ?? NaN);
    return calcularResumoPrimeiraCobranca(
      Number.isFinite(total) ? total : 0,
      matricula?.data_inicio_vinculo ?? null,
      matricula?.data_matricula ?? null,
    );
  }, [matricula]);
  const competenciaInicialLabel = resumoPrimeira.competenciaInicial ?? "-";
  const competenciaMensalidadeLabel = resumoPrimeira.competenciaMensalidade ?? "-";
  const prorataLabel = resumoPrimeira.temProrata
    ? formatCurrency(resumoPrimeira.prorataCentavos ?? 0)
    : "Sem pro-rata";

  const onSalvar = async () => {
    if (!matricula) return;

    setErro(null);

    if (["PAGA", "LANCADA_CARTAO", "ADIADA_EXCECAO", "LIQUIDADO_INSTITUCIONAL"].includes(String(matricula.primeira_cobranca_status))) {
      setErro("Matricula ja liquidada.");
      return;
    }

    if (!isMovimentoInstitucional && !valorResolvido) {
      setErro("Valor nao resolvido na matricula. Volte e gere a matricula novamente.");
      return;
    }

    if (precisaFormaPagamento && formaPagamentoId === "") {
      setErro("Selecione a forma de pagamento.");
      return;
    }

    if (precisaValor) {
      const v = Number(valorCentavos);
      if (!Number.isFinite(v) || v <= 0) {
        setErro("Informe o valor em centavos (inteiro > 0).");
        return;
      }
    }

    if (precisaMotivo && motivoExcecao.trim().length < 5) {
      setErro("Informe um motivo objetivo para a excecao (minimo 5 caracteres).");
      return;
    }

    if (precisaVencimentoManual) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimentoManual)) {
        setErro("Informe a data de vencimento combinada.");
        return;
      }
      const hoje = new Date().toISOString().slice(0, 10);
      if (vencimentoManual < hoje) {
        setErro("A data de vencimento deve ser hoje ou futura.");
        return;
      }
      if (!meioCobranca) {
        setErro("Selecione o meio de cobranca.");
        return;
      }
    }

    try {
      setSaving(true);

      const res = await fetch("/api/matriculas/liquidar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricula_id: matricula.id,
          tipo_primeira_cobranca: tipoPrimeira,
          modo: isMovimentoInstitucional ? "MOVIMENTO" : modo,
          forma_pagamento_id: formaPagamentoId === "" ? undefined : formaPagamentoId,
          valor_centavos: precisaValor && valorResolvido ? Number(valorCentavos) : undefined,
          data_pagamento: dataPagamento,
          observacoes,
          motivo_excecao: motivoExcecao,
          vencimento_manual: precisaVencimentoManual ? vencimentoManual : undefined,
          meio_cobranca: precisaVencimentoManual ? meioCobranca : undefined,
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        detail?: string;
        details?: string;
        status?: string;
        modo?: string;
        debugCartao?: {
          executado: boolean;
          created_lancamentos: number;
          linked_faturas: number;
          periodo_inicio?: string | null;
          periodo_fim?: string | null;
          erro?: string;
        };
      };

      if (!res.ok) {
        const erroDebug = json?.debugCartao?.erro;
        const erroDetail = json?.detail ?? json?.details;
        if (erroDebug) {
          setErro(`${json?.error ?? "Falha ao liquidar a primeira cobranca."} | ${erroDebug}`);
          return;
        }
        if (erroDetail) {
          setErro(`${json?.error ?? "Falha ao liquidar a primeira cobranca."} | ${erroDetail}`);
          return;
        }
        setErro(json?.error ?? "Falha ao liquidar a primeira cobranca.");
        return;
      }

      if (json?.debugCartao) {
        const periodoInicio = json.debugCartao.periodo_inicio ?? "-";
        const periodoFim = json.debugCartao.periodo_fim ?? "-";
        alert(
          `Cartao: executado=${json.debugCartao.executado} lancamentos=${json.debugCartao.created_lancamentos} vinculos=${json.debugCartao.linked_faturas} periodo=${periodoInicio}-${periodoFim}`,
        );
      }

      if (json?.status === "LANCADA_CARTAO") {
        alert("Lancado na Conta Interna. Verifique a fatura da competencia.");
      }
      if (json?.modo === "MOVIMENTO" || json?.status === "LIQUIDADO_INSTITUCIONAL") {
        alert("Liquidação institucional registrada no Movimento.");
      }

      router.push(`/escola/matriculas/${matricula.id}`);
    } catch {
      setErro("Falha de rede ao liquidar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Liquidacao da Matricula</h1>
        <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (["PAGA", "LANCADA_CARTAO", "ADIADA_EXCECAO", "LIQUIDADO_INSTITUCIONAL"].includes(String(matricula?.primeira_cobranca_status))) {
    return (
      <div className="p-6 max-w-3xl">
        <h1 className="text-xl font-semibold">Liquidacao da Matricula</h1>
        <p className="mt-2 text-sm text-muted-foreground">Matricula ja liquidada.</p>
        <div className="mt-4">
          <button
            className="px-4 py-2 rounded-md border"
            onClick={() => router.push(`/escola/matriculas/${matricula.id}`)}
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold">Liquidacao da Matricula (Ato)</h1>

      {isMovimentoInstitucional ? (
        <p className="text-sm text-muted-foreground mt-2">
          Liquidação institucional configurada para esta matrícula. Não será criado recebimento presencial nem lançamento
          na Conta Interna para a primeira liquidação.
        </p>
      ) : isHibridoExecucoes ? (
        <p className="text-sm text-muted-foreground mt-2">
          Matrícula híbrida: as execuções da família seguem o fluxo financeiro padrão e as execuções do Movimento são
          liquidadas institucionalmente no mesmo confirmar.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground mt-2">
          Este valor refere-se a <strong>entrada no ato</strong>. A mensalidade recorrente sera cobrada separadamente
          via <strong> Conta Interna</strong>.
        </p>
      )}

      <div className="mt-4 rounded-lg border p-3 text-sm text-slate-700">
        <div>
          <span className="font-medium">Competencia inicial:</span> {competenciaInicialLabel}
        </div>
        <div>
          <span className="font-medium">Pro-rata (entrada):</span> {prorataLabel}
        </div>
        <div>
          <span className="font-medium">Mensalidade cheia a partir de:</span> {competenciaMensalidadeLabel}
        </div>
      </div>

      {erro ? (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {erro}
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        <div className="rounded-lg border p-4 space-y-3">
          {execucoesMovimento.length > 0 ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm text-emerald-900">
              <div className="font-medium">Liquidação institucional - Movimento Conexão Dança</div>
              <div className="mt-1">
                Concessão:{" "}
                {execucoesMovimento.find((execucao) => !!execucao.movimento_concessao_id)?.movimento_concessao_id ??
                  matricula?.movimento_concessao_id ??
                  "-"}
              </div>
              <div className="mt-1">Valor institucional: {formatCurrency(totalMovimentoExecucoes)}</div>
              <ul className="mt-2 list-disc pl-5 text-xs">
                {execucoesMovimento.map((execucao) => (
                  <li key={`mov-${execucao.turma_id}`}>
                    Turma {execucao.turma_id}
                    {execucao.nivel ? ` (${execucao.nivel})` : ""}: {formatCurrency(execucao.valor_mensal_centavos)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {execucoesFamilia.length > 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-700">
              <div className="font-medium">Execuções Família</div>
              <div className="mt-1">Total família: {formatCurrency(totalFamiliaExecucoes)}</div>
              <ul className="mt-2 list-disc pl-5 text-xs">
                {execucoesFamilia.map((execucao) => (
                  <li key={`fam-${execucao.turma_id}`}>
                    Turma {execucao.turma_id}
                    {execucao.nivel ? ` (${execucao.nivel})` : ""}: {formatCurrency(execucao.valor_mensal_centavos)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!isMovimentoInstitucional ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Tipo da primeira cobranca</label>
            <select
              className="border rounded-md p-2"
              value={tipoPrimeira}
              onChange={(e) => setTipoPrimeira(e.target.value as typeof tipoPrimeira)}
            >
              <option value="ENTRADA_PRORATA">Entrada / Pro-rata na Conta Interna</option>
              <option value="MENSALIDADE_CHEIA_CARTAO">Mensalidade cheia na Conta Interna</option>
            </select>
          </div>
          ) : null}

          {!isMovimentoInstitucional ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Acao no ato</label>
              <select className="border rounded-md p-2" value={modo} onChange={(e) => setModo(e.target.value as typeof modo)}>
                <option value="PAGAR_AGORA">Pagar agora (gera recebimento)</option>
                <option value="LANCAR_NO_CARTAO">Lancar na Conta Interna (sem recebimento)</option>
                <option value="ADIAR_EXCECAO">Excecao: adiar primeiro pagamento (auditoria)</option>
              </select>
            </div>
          ) : null}

          {modo === "PAGAR_AGORA" ? (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Forma de pagamento</label>
                <select
                  className="border rounded-md p-2"
                  value={formaPagamentoId}
                  onChange={(e) => setFormaPagamentoId(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">Selecione...</option>
                  {formas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">
                    {isHibridoExecucoes ? "Valor família (centavos)" : "Valor (centavos)"}
                  </label>
                  <input
                    className="border rounded-md p-2"
                    inputMode="numeric"
                    value={valorCentavos}
                    onChange={(e) => setValorCentavos(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Data do pagamento</label>
                  <input className="border rounded-md p-2" type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
                </div>
              </div>
            </>
          ) : null}

          {modo === "LANCAR_NO_CARTAO" ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                {isHibridoExecucoes ? "Valor família a lançar na Conta Interna (centavos)" : "Valor a lancar na Conta Interna (centavos)"}
              </label>
              <input
                className="border rounded-md p-2"
                inputMode="numeric"
                value={valorCentavos}
                onChange={(e) => setValorCentavos(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Este item entra em aberto na conta interna e aguarda quitacao na fatura da competencia.</p>
            </div>
          ) : null}

          {modo === "ADIAR_EXCECAO" ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                A excecao continua registrada na conta interna, com trilha auditavel e competencia conciliada pela fatura.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Motivo da excecao (obrigatorio)</label>
                <textarea
                  className="border rounded-md p-2 min-h-[80px]"
                  value={motivoExcecao}
                  onChange={(e) => setMotivoExcecao(e.target.value)}
                  placeholder="Ex.: Responsavel pediu para pagar no vencimento por receber apenas dia 10."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Data de vencimento combinada</label>
                  <input
                    className="border rounded-md p-2"
                    type="date"
                    value={vencimentoManual}
                    onChange={(e) => setVencimentoManual(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium">Meio de cobranca</label>
                  <select
                    className="border rounded-md p-2"
                    value={meioCobranca}
                    onChange={(e) => setMeioCobranca(e.target.value)}
                  >
                    <option value="BOLETO">Boleto</option>
                    <option value="FIMP">FIMP</option>
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Observacoes (opcional)</label>
            <textarea
              className="border rounded-md p-2 min-h-[60px]"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observacao interna do ato."
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
              onClick={onSalvar}
              disabled={saving || (!isMovimentoInstitucional && !valorResolvido)}
            >
              {saving
                ? "Salvando..."
                : isMovimentoInstitucional
                  ? "Confirmar liquidacao institucional"
                  : isHibridoExecucoes
                    ? "Confirmar liquidacao (familia + movimento)"
                  : modo === "ADIAR_EXCECAO"
                    ? "Gerar cobranca"
                    : "Confirmar liquidacao"}
            </button>

            <button className="px-4 py-2 rounded-md border" onClick={() => router.push(`/escola/matriculas/${matricula?.id ?? ""}`)} disabled={saving}>
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


