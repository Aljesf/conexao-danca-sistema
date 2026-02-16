"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type FaturaRow = {
  id: number;
  conta_conexao_id: number | null;
  periodo_referencia: string | null;
  data_fechamento: string | null;
  data_vencimento: string | null;
  status: string | null;
  valor_total_centavos: number | null;
};

type ContaRow = {
  id: number;
  tipo_conta: string | null;
  pessoa_titular_id: number | null;
  descricao_exibicao: string | null;
};

type PessoaRow = {
  id: number;
  nome: string | null;
  cpf: string | null;
  email: string | null;
};

type LancamentoRow = {
  id: number;
  conta_conexao_id: number | null;
  origem_sistema: string | null;
  origem_id: number | null;
  descricao: string | null;
  valor_centavos: number | null;
  competencia: string | null;
  referencia_item: string | null;
  status: string | null;
  composicao_json: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type FaturaDetalheData = {
  fatura: FaturaRow;
  conta: ContaRow | null;
  pessoa: PessoaRow | null;
  pivot: Array<{ lancamento_id: number; created_at: string | null }>;
  lancamentos: LancamentoRow[];
};

type FaturaDetalheResponse = {
  ok: boolean;
  data?: FaturaDetalheData;
  error?: string;
};

type ApiActionResponse = {
  ok?: boolean;
  error?: string;
  detail?: string | null;
  details?: { message?: string | null } | null;
  message?: string;
  cobranca_id?: number | null;
};

type ToastState = {
  tipo: "sucesso" | "erro";
  mensagem: string;
} | null;

const EMPTY_LANCAMENTOS: LancamentoRow[] = [];

function brlFromCentavos(v: number): string {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function humanizarCodigoErro(code: string | null | undefined): string {
  switch (code) {
    case "fatura_id_invalido":
      return "ID da fatura inválido.";
    case "fatura_nao_encontrada":
      return "Fatura não encontrada.";
    case "fatura_sem_valor_para_cobranca":
      return "Fatura sem valor para gerar cobrança.";
    case "conta_colaborador_sem_cobranca_externa":
      return "Conta de colaborador não gera cobrança externa.";
    case "erro_neofin_criar_cobranca":
      return "Falha ao criar cobrança no NeoFin.";
    case "erro_atualizar_fatura":
      return "Falha ao atualizar a fatura.";
    case "falha_carregar_fatura":
      return "Não foi possível carregar a fatura.";
    case "falha_inesperada":
      return "Falha inesperada.";
    default:
      return code ?? "Erro inesperado.";
  }
}

function extrairMensagemErro(resp: ApiActionResponse | null, fallback = "Falha na operação."): string {
  if (!resp) return fallback;
  if (resp.detail) return `${humanizarCodigoErro(resp.error)} ${resp.detail}`.trim();
  if (resp.details?.message) return `${humanizarCodigoErro(resp.error)} ${resp.details.message}`.trim();
  if (resp.error) return humanizarCodigoErro(resp.error);
  return fallback;
}

export default function FaturaDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FaturaDetalheData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});
  const [modalCobrancaOpen, setModalCobrancaOpen] = useState(false);
  const [diaVencimento, setDiaVencimento] = useState<number>(12);
  const [salvarPreferencia, setSalvarPreferencia] = useState(true);
  const [gerandoCobranca, setGerandoCobranca] = useState(false);
  const [fechandoFatura, setFechandoFatura] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const diaVencimentoOptions = useMemo(() => Array.from({ length: 28 }, (_, i) => i + 1), []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function extrairDia(vencimento: string | null | undefined): number {
    if (!vencimento || !/^\d{4}-\d{2}-\d{2}$/.test(vencimento)) return 12;
    const dia = Number(vencimento.split("-")[2]);
    if (!Number.isFinite(dia)) return 12;
    return Math.max(1, Math.min(28, Math.trunc(dia)));
  }

  useEffect(() => {
    if (!Number.isFinite(id)) {
      setError("fatura_id_invalido");
      setLoading(false);
      return;
    }

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/credito-conexao/faturas/${id}`);
        const json = (await res.json()) as FaturaDetalheResponse;
        if (!res.ok || !json?.ok) {
          setError(json?.error ?? "falha_carregar_fatura");
          setData(null);
          return;
        }
        setData(json.data ?? null);
        setDiaVencimento(extrairDia(json.data?.fatura?.data_vencimento));
      } catch {
        setError("falha_inesperada");
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const fatura = data?.fatura ?? null;
  const lancamentos = data?.lancamentos ?? EMPTY_LANCAMENTOS;
  const podeFecharEGerar = fatura?.status === "ABERTA";

  const somaLancamentos = useMemo(
    () => lancamentos.reduce((acc, l) => acc + (typeof l.valor_centavos === "number" ? l.valor_centavos : 0), 0),
    [lancamentos],
  );

  async function fecharFaturaEGerarCobranca() {
    if (!Number.isFinite(id)) {
      setToast({ tipo: "erro", mensagem: "ID da fatura inválido." });
      return;
    }

    setFechandoFatura(true);
    setToast(null);

    try {
      const res = await fetch(`/api/financeiro/credito-conexao/faturas/${id}/fechar`, { method: "POST" });
      const json = (await res.json().catch(() => null)) as ApiActionResponse | null;

      if (!res.ok || !json?.ok) {
        setToast({
          tipo: "erro",
          mensagem: extrairMensagemErro(json, "Falha ao fechar fatura e gerar cobrança."),
        });
        return;
      }

      setToast({ tipo: "sucesso", mensagem: "Fatura fechada e cobrança gerada com sucesso." });
      window.location.reload();
    } catch (e) {
      setToast({
        tipo: "erro",
        mensagem: e instanceof Error ? e.message : "Falha inesperada ao fechar a fatura.",
      });
    } finally {
      setFechandoFatura(false);
    }
  }

  async function gerarCobrancaAgora(force = false) {
    if (!Number.isFinite(id)) {
      setToast({ tipo: "erro", mensagem: "ID da fatura inválido." });
      return;
    }
    setGerandoCobranca(true);
    setToast(null);
    try {
      const res = await fetch(`/api/financeiro/credito-conexao/faturas/${id}/gerar-cobranca`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dia_vencimento: diaVencimento,
          salvar_preferencia: salvarPreferencia,
          force,
        }),
      });
      const json = (await res.json().catch(() => null)) as ApiActionResponse | null;

      if (!res.ok || !json?.ok) {
        setToast({
          tipo: "erro",
          mensagem: extrairMensagemErro(json, "Falha ao gerar cobrança."),
        });
        return;
      }

      const msg =
        json?.message === "cobranca_ja_existente"
          ? `Cobrança já existente (#${json?.cobranca_id ?? "-"})`
          : `Cobrança gerada com sucesso (#${json?.cobranca_id ?? "-"})`;
      setToast({ tipo: "sucesso", mensagem: msg });
      setModalCobrancaOpen(false);
      window.location.reload();
    } catch (e) {
      setToast({
        tipo: "erro",
        mensagem: e instanceof Error ? e.message : "Falha inesperada ao gerar cobrança.",
      });
    } finally {
      setGerandoCobranca(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Fatura do Cartão Conexão</CardTitle>
            <div className="flex flex-wrap gap-2">
              {podeFecharEGerar ? (
                <Button onClick={() => void fecharFaturaEGerarCobranca()} disabled={fechandoFatura}>
                  {fechandoFatura ? "Fechando..." : "Fechar fatura e gerar cobrança"}
                </Button>
              ) : null}
              <Button variant="secondary" onClick={() => setModalCobrancaOpen(true)}>
                Gerar cobrança agora
              </Button>
              <Button variant="secondary" onClick={() => router.back()}>
                Voltar
              </Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Recarregar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : error ? (
              <div className="text-sm text-red-700">{humanizarCodigoErro(error)}</div>
            ) : !fatura ? (
              <div className="text-sm text-muted-foreground">Fatura não encontrada.</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Fatura ID:</span> {fatura.id}
                  </div>
                  <div>
                    <span className="font-medium">Conta:</span>{" "}
                    {data?.conta?.descricao_exibicao ?? `#${fatura.conta_conexao_id ?? "-"}`}
                  </div>
                  <div>
                    <span className="font-medium">Titular:</span> {data?.pessoa?.nome ?? "-"}
                  </div>
                  <div>
                    <span className="font-medium">Período:</span> {fatura.periodo_referencia ?? "-"}
                  </div>
                  <div>
                    <span className="font-medium">Fechamento:</span> {fatura.data_fechamento ?? "-"}
                  </div>
                  <div>
                    <span className="font-medium">Vencimento:</span> {fatura.data_vencimento ?? "-"}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {fatura.status ?? "-"}
                  </div>
                </div>

                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Total da fatura (registro):</span>{" "}
                    {brlFromCentavos(Number(fatura.valor_total_centavos ?? 0))}
                  </div>
                  <div>
                    <span className="font-medium">Soma dos lançamentos vinculados:</span> {brlFromCentavos(somaLancamentos)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Se os valores divergirem, revise os itens vinculados à fatura ou o recálculo.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lançamentos vinculados à fatura</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : lancamentos.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum lançamento vinculado a esta fatura.</div>
            ) : (
              <div className="space-y-3">
                {lancamentos.map((l) => (
                  <div key={l.id} className="rounded-lg border bg-white p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold">{l.descricao ?? "Lançamento"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          ID: {l.id} | Competência: {l.competencia ?? "-"} | Ref: {l.referencia_item ?? "-"} | Status:{" "}
                          {l.status ?? "-"}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{brlFromCentavos(Number(l.valor_centavos ?? 0))}</div>
                    </div>

                    {l.composicao_json ? (
                      <div className="mt-3">
                        <Button variant="secondary" onClick={() => setOpenIds((p) => ({ ...p, [l.id]: !p[l.id] }))}>
                          {openIds[l.id] ? "Ocultar composição" : "Ver composição"}
                        </Button>
                        {openIds[l.id] ? (
                          <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-slate-50 p-3 text-xs">
{JSON.stringify(l.composicao_json, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">Sem composicao_json neste lançamento.</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {modalCobrancaOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-4 shadow-lg">
            <h2 className="text-base font-semibold">Gerar cobrança</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Defina o vencimento (1..28). Se já existir cobrança, a operação é idempotente.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block">Dia de vencimento</span>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(Number(e.target.value))}
                  disabled={gerandoCobranca}
                >
                  {diaVencimentoOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={salvarPreferencia}
                  onChange={(e) => setSalvarPreferencia(e.target.checked)}
                  disabled={gerandoCobranca}
                />
                Salvar como preferência da conta
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalCobrancaOpen(false)} disabled={gerandoCobranca}>
                Cancelar
              </Button>
              <Button onClick={() => void gerarCobrancaAgora(false)} disabled={gerandoCobranca}>
                {gerandoCobranca ? "Gerando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-4 right-4 z-[60] max-w-md rounded-md border bg-white px-4 py-3 shadow-lg">
          <div className={toast.tipo === "erro" ? "text-sm text-red-700" : "text-sm text-emerald-700"}>
            {toast.mensagem}
          </div>
        </div>
      ) : null}
    </div>
  );
}

