"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CicloCobranca = "COBRANCA_UNICA" | "COBRANCA_EM_PARCELAS" | "COBRANCA_MENSAL";
type TerminoCobranca = "FIM_TURMA_CURSO" | "FIM_PROJETO" | "FIM_ANO_LETIVO" | "DATA_ESPECIFICA";
type RegraTotal = "PROPORCIONAL" | "FIXO";
type CicloFinanceiro = "MENSAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
type PoliticaPrimeiraCobranca = "NO_ATO" | "PERMITIR_ADIAR_PARA_CICLO";

type FormaPagamento = { codigo: string; nome: string };

type Props = Record<string, unknown>;

export default function PlanosPagamentoForm(_props: Props) {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);

  const [cicloCobranca, setCicloCobranca] = useState<CicloCobranca>("COBRANCA_MENSAL");
  const [numeroParcelas, setNumeroParcelas] = useState<string>("");

  const [terminoCobranca, setTerminoCobranca] = useState<TerminoCobranca>("FIM_ANO_LETIVO");
  const [dataFimManual, setDataFimManual] = useState<string>("");

  const [regraTotal, setRegraTotal] = useState<RegraTotal>("PROPORCIONAL");
  const [permiteProrrata, setPermiteProrrata] = useState(true);

  const [cicloFinanceiro, setCicloFinanceiro] = useState<CicloFinanceiro>("MENSAL");
  const [formaLiquidacaoPadrao, setFormaLiquidacaoPadrao] = useState<string>("CARTAO_CONEXAO");
  const [politicaPrimeiraCobranca, setPoliticaPrimeiraCobranca] = useState<PoliticaPrimeiraCobranca>("NO_ATO");

  const [observacoes, setObservacoes] = useState("");

  const [formas, setFormas] = useState<FormaPagamento[]>([]);
  const [formasLoading, setFormasLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const numeroParcelasParsed = useMemo(() => {
    if (!numeroParcelas.trim()) return null;
    const n = Number(numeroParcelas);
    if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return null;
    return n;
  }, [numeroParcelas]);

  const isMensal = cicloCobranca === "COBRANCA_MENSAL";
  const isParcelado = cicloCobranca === "COBRANCA_EM_PARCELAS";
  const isDataEspecifica = terminoCobranca === "DATA_ESPECIFICA";

  const validacao = useMemo(() => {
    if (!nome.trim()) return "Informe o nome do plano.";
    if (isParcelado && !numeroParcelasParsed) return "Cobrança em parcelas exige um número de parcelas válido.";
    if (isMensal && !terminoCobranca) return "Cobrança mensal exige um término.";
    if (isMensal && isDataEspecifica && !dataFimManual) return "Término por data específica exige data_fim_manual.";
    return null;
  }, [nome, isParcelado, numeroParcelasParsed, isMensal, terminoCobranca, isDataEspecifica, dataFimManual]);

  useEffect(() => {
    async function carregarFormas() {
      try {
        setFormasLoading(true);
        const res = await fetch("/api/formas-pagamento");
        const json = (await res.json()) as { ok: boolean; data?: FormaPagamento[]; message?: string };
        if (!res.ok || !json.ok) return;
        setFormas(json.data ?? []);
      } finally {
        setFormasLoading(false);
      }
    }
    carregarFormas();
  }, []);

  async function handleSalvar() {
    setErro(null);
    setOkMsg(null);

    const msg = validacao;
    if (msg) {
      setErro(msg);
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/matriculas/planos-pagamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          ativo,
          ciclo_cobranca: cicloCobranca,
          numero_parcelas: isParcelado ? numeroParcelasParsed : null,
          termino_cobranca: isMensal ? terminoCobranca : null,
          data_fim_manual: isMensal && isDataEspecifica ? dataFimManual : null,
          regra_total_devido: regraTotal,
          permite_prorrata: permiteProrrata,
          ciclo_financeiro: cicloFinanceiro,
          forma_liquidacao_padrao: formaLiquidacaoPadrao || null,
          politica_primeira_cobranca: politicaPrimeiraCobranca,
          observacoes: observacoes || null,
        }),
      });

      let payload: unknown = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (!res.ok) {
        const msgApi =
          typeof payload === "object" && payload !== null && "message" in payload
            ? String((payload as Record<string, unknown>).message)
            : null;

        console.error("Falha ao criar plano de pagamento:", { status: res.status, payload });
        setErro(msgApi || "Falha ao criar plano de pagamento.");
        return;
      }

      const json = payload as { ok?: boolean; data?: { id: number } };
      if (!json?.ok) {
        setErro("Falha ao criar plano de pagamento.");
        return;
      }

      setErro(null);
      setOkMsg(`Plano criado com sucesso (ID ${json.data?.id}).`);
      router.refresh();
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro inesperado ao criar plano.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-3xl border border-violet-100/70 bg-white/95 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">Novo Plano de Pagamento</h2>
        <p className="text-sm text-slate-600">
          Define ciclo de cobrança, término (quando mensal), regra do total, pró-rata, ciclo financeiro (cronata) e forma de liquidação
          declarativa.
        </p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Nome do plano</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            placeholder="Ex.: Regular 2026 - padrão"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            Plano ativo
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Ciclo de cobrança</label>
          <select
            value={cicloCobranca}
            onChange={(e) => setCicloCobranca(e.target.value as CicloCobranca)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
          >
            <option value="COBRANCA_UNICA">Cobrança única</option>
            <option value="COBRANCA_EM_PARCELAS">Cobrança em parcelas</option>
            <option value="COBRANCA_MENSAL">Cobrança mensal</option>
          </select>
          <p className="text-xs text-slate-500">
            Cobrança mensal exige término. Cobrança em parcelas exige número de parcelas.
          </p>
        </div>

        {isParcelado && (
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Número de parcelas</label>
            <input
              value={numeroParcelas}
              onChange={(e) => setNumeroParcelas(e.target.value)}
              inputMode="numeric"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
              placeholder="Ex.: 3"
            />
          </div>
        )}

        {isMensal && (
          <>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Término da cobrança mensal
              </label>
              <select
                value={terminoCobranca}
                onChange={(e) => setTerminoCobranca(e.target.value as TerminoCobranca)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
              >
                <option value="FIM_ANO_LETIVO">Até o fim do ano letivo (31/12 do ano de referência)</option>
                <option value="FIM_TURMA_CURSO">Até o fim da turma/curso</option>
                <option value="FIM_PROJETO">Até o fim do projeto</option>
                <option value="DATA_ESPECIFICA">Até uma data específica</option>
              </select>
              <p className="text-xs text-slate-500">
                No MVP, &quot;fim da turma&quot; e &quot;fim do projeto&quot; serão usados quando houver referência no processo de matrícula.
                &quot;Fim do ano letivo&quot; usa ano de referência.
              </p>
            </div>

            {isDataEspecifica && (
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Data fim (manual)</label>
                <input
                  type="date"
                  value={dataFimManual}
                  onChange={(e) => setDataFimManual(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                />
              </div>
            )}
          </>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Regra do total devido</label>
          <select
            value={regraTotal}
            onChange={(e) => setRegraTotal(e.target.value as RegraTotal)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
          >
            <option value="PROPORCIONAL">Total proporcional ao tempo restante</option>
            <option value="FIXO">Total fixo do produto</option>
          </select>
          <p className="text-xs text-slate-500">
            Curso regular tende a ser proporcional. Projeto com valor fechado tende a ser fixo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={permiteProrrata} onChange={(e) => setPermiteProrrata(e.target.checked)} />
            Permite pró-rata (somente na primeira cobrança)
          </label>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Política da primeira cobrança
          </label>
          <select
            value={politicaPrimeiraCobranca}
            onChange={(e) => setPoliticaPrimeiraCobranca(e.target.value as PoliticaPrimeiraCobranca)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
          >
            <option value="NO_ATO">No ato (padrão)</option>
            <option value="PERMITIR_ADIAR_PARA_CICLO">
              Permitir adiar / lançar no ciclo (Cartão Conexão)
            </option>
          </select>
          <p className="text-xs text-slate-500">
            Define se a primeira cobrança deve ser quitada no ato ou se pode ser adiada e lançada no ciclo (exceção negociável).
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Ciclo financeiro (cronata)</label>
          <select
            value={cicloFinanceiro}
            onChange={(e) => setCicloFinanceiro(e.target.value as CicloFinanceiro)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
          >
            <option value="MENSAL">Mensal</option>
            <option value="BIMESTRAL">Bimestral</option>
            <option value="TRIMESTRAL">Trimestral</option>
            <option value="SEMESTRAL">Semestral</option>
            <option value="ANUAL">Anual</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Forma de liquidação (declarativa)</label>
          <select
            value={formaLiquidacaoPadrao}
            onChange={(e) => setFormaLiquidacaoPadrao(e.target.value)}
            disabled={formasLoading}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300 disabled:opacity-70"
          >
            <option value="">(não definido)</option>
            {formas.map((f) => (
              <option key={f.codigo} value={f.codigo}>
                {f.nome} ({f.codigo})
              </option>
            ))}
          </select>
          {formasLoading && <p className="text-xs text-slate-500">Carregando formas de pagamento...</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Observações</label>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-base focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            placeholder="Opcional"
          />
        </div>
      </div>

      {erro && (
        <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/80 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {erro}
        </div>
      )}
      {okMsg && (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700 shadow-sm">
          {okMsg}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleSalvar}
          disabled={saving}
          className="inline-flex items-center rounded-full bg-violet-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-70"
        >
          {saving ? "Salvando..." : "Criar plano"}
        </button>
      </div>
    </div>
  );
}
