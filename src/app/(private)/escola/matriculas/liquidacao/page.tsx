"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type FormaPagamento = {
  id: number;
  nome: string;
  ativo: boolean;
};

type MatriculaResumo = {
  id: number;
  pessoa_id: number;
  responsavel_financeiro_id: number;
  primeira_cobranca_status: string;
  primeira_cobranca_tipo: string | null;
  primeira_cobranca_valor_centavos: number | null;
  total_mensalidade_centavos: number | null;
};

export default function Page() {
  const router = useRouter();
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClientComponentClient(), []);

  const routeIdRaw = routeParams?.id;
  const matriculaIdFromRoute = Array.isArray(routeIdRaw) ? routeIdRaw[0] : routeIdRaw ?? null;
  const matriculaId = matriculaIdFromRoute ?? searchParams.get("matriculaId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [matricula, setMatricula] = useState<MatriculaResumo | null>(null);
  const [formas, setFormas] = useState<FormaPagamento[]>([]);

  // Campos do ato
  const [tipoPrimeira, setTipoPrimeira] = useState<"ENTRADA_PRORATA" | "MENSALIDADE_CHEIA_CARTAO">("ENTRADA_PRORATA");
  const [modo, setModo] = useState<"PAGAR_AGORA" | "LANCAR_NO_CARTAO" | "ADIAR_EXCECAO">("PAGAR_AGORA");
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
        setErro("matriculaId ausente ou invÃ¡lido na URL.");
        setLoading(false);
        return;
      }

      const { data: m, error: mErr } = await supabase
        .from("matriculas")
        .select(
          "id, pessoa_id, responsavel_financeiro_id, primeira_cobranca_status, primeira_cobranca_tipo, primeira_cobranca_valor_centavos, total_mensalidade_centavos",
        )
        .eq("id", idNum)
        .single();

      if (mErr || !m) {
        setErro("NÃ£o foi possÃ­vel carregar a matrÃ­cula.");
        setLoading(false);
        return;
      }

      setMatricula(m as MatriculaResumo);
      if (["PAGA", "LANCADA_CARTAO", "ADIADA_EXCECAO"].includes(String(m.primeira_cobranca_status))) {
        setErro("Matricula ja liquidada.");
        setLoading(false);
        return;
      }
      const valorSugeridoEntradaCentavos =
        typeof m.total_mensalidade_centavos === "number" ? m.total_mensalidade_centavos : 0;
      const valorStr = typeof m.total_mensalidade_centavos === "number" ? String(valorSugeridoEntradaCentavos) : "";
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
        setErro("NÃ£o foi possÃ­vel carregar as formas de pagamento.");
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

  const precisaFormaPagamento = modo === "PAGAR_AGORA";
  const precisaMotivo = modo === "ADIAR_EXCECAO";
  const precisaVencimentoManual = modo === "ADIAR_EXCECAO";
  const precisaValor = modo === "PAGAR_AGORA" || modo === "LANCAR_NO_CARTAO";
  const valorResolvido = valorCentavos.trim() !== "";

  const onSalvar = async () => {
    if (!matricula) return;

    setErro(null);

    if (["PAGA", "LANCADA_CARTAO", "ADIADA_EXCECAO"].includes(String(matricula.primeira_cobranca_status))) {
      setErro("Matricula ja liquidada.");
      return;
    }

    if (!valorResolvido) {
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
      setErro("Informe um motivo objetivo para a exceÃ§Ã£o (mÃ­nimo 5 caracteres).");
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
          modo,
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
        status?: string;
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
        if (erroDebug) {
          setErro(`${json?.error ?? "Falha ao liquidar a primeira cobranca."} | ${erroDebug}`);
          return;
        }
        setErro(json?.error ?? "Falha ao liquidar a primeira cobranÃ§a.");
        return;
      }

      if (json?.debugCartao) {
        const periodoInicio = json.debugCartao.periodo_inicio ?? "-";
        const periodoFim = json.debugCartao.periodo_fim ?? "-";
        alert(
          `Cartao: executado=${json.debugCartao.executado} lancamentos=${json.debugCartao.created_lancamentos} vinculos=${json.debugCartao.linked_faturas} periodo=${periodoInicio}â†’${periodoFim}`,
        );
      }

      if (json?.status === "LANCADA_CARTAO") {
        alert("Lancado no Cartao Conexao. Verifique a fatura do periodo.");
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
        <h1 className="text-xl font-semibold">LiquidaÃ§Ã£o da MatrÃ­cula</h1>
        <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (["PAGA", "LANCADA_CARTAO", "ADIADA_EXCECAO"].includes(String(matricula?.primeira_cobranca_status))) {
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
      <h1 className="text-xl font-semibold">LiquidaÃ§Ã£o da MatrÃ­cula (Ato)</h1>

      <p className="text-sm text-muted-foreground mt-2">
        Este valor refere-se Ã  <strong>entrada no ato</strong>. A mensalidade recorrente serÃ¡ cobrada separadamente via
        <strong> CartÃ£o ConexÃ£o</strong>.
      </p>

      {erro ? (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {erro}
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Tipo da primeira cobranÃ§a</label>
            <select
              className="border rounded-md p-2"
              value={tipoPrimeira}
              onChange={(e) => setTipoPrimeira(e.target.value as typeof tipoPrimeira)}
            >
              <option value="ENTRADA_PRORATA">Entrada / PrÃ³-rata (fora do CartÃ£o ConexÃ£o)</option>
              <option value="MENSALIDADE_CHEIA_CARTAO">Mensalidade cheia (CartÃ£o ConexÃ£o)</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">AÃ§Ã£o no ato</label>
            <select className="border rounded-md p-2" value={modo} onChange={(e) => setModo(e.target.value as typeof modo)}>
              <option value="PAGAR_AGORA">Pagar agora (gera recebimento)</option>
              <option value="LANCAR_NO_CARTAO">LanÃ§ar no CartÃ£o ConexÃ£o (sem recebimento)</option>
              <option value="ADIAR_EXCECAO">ExceÃ§Ã£o: adiar primeiro pagamento (auditoria)</option>
            </select>
          </div>

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
                  <label className="text-sm font-medium">Valor (centavos)</label>
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
              <label className="text-sm font-medium">Valor a lanÃ§ar no CartÃ£o (centavos)</label>
              <input
                className="border rounded-md p-2"
                inputMode="numeric"
                value={valorCentavos}
                onChange={(e) => setValorCentavos(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Este lanÃ§amento nÃ£o cria recebimento nem movimento de caixa.</p>
            </div>
          ) : null}

          {modo === "ADIAR_EXCECAO" ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                Sera gerada uma cobranca avulsa (fora do Cartao Conexao) no Contas a Receber e no Relatorio Financeiro do Aluno.
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
            <label className="text-sm font-medium">ObservaÃ§Ãµes (opcional)</label>
            <textarea
              className="border rounded-md p-2 min-h-[60px]"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="ObservaÃ§Ã£o interna do ato."
            />
          </div>

          <div className="pt-2 flex gap-2">
            <button
              className="px-4 py-2 rounded-md bg-black text-white disabled:opacity-50"
              onClick={onSalvar}
              disabled={saving || !valorResolvido}
            >
              {saving ? "Salvando..." : modo === "ADIAR_EXCECAO" ? "Gerar cobranca" : "Confirmar liquidacao"}
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


