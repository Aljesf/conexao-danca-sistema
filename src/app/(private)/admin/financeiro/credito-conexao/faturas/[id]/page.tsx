"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  cobranca_id: number | null;
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
  neofin_charge_id?: string | null;
  status_fatura?: string | null;
  vencimento_iso?: string | null;
};

type UltimaCobrancaState = {
  cobranca_id: number | null;
  neofin_charge_id: string | null;
  vencimento_iso: string | null;
  status_fatura: string | null;
} | null;

type ToastState = {
  tipo: "sucesso" | "erro";
  mensagem: string;
} | null;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMPTY_LANCAMENTOS: LancamentoRow[] = [];

function brlFromCentavos(v: number): string {
  return (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function localTodayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function addDaysIso(days: number): string {
  const base = new Date();
  base.setDate(base.getDate() + days);
  const local = new Date(base.getTime() - base.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function isIsoDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) return false;
  const dt = new Date(`${value}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return false;
  return dt.toISOString().slice(0, 10) === value;
}

function diaDoMes(isoDate: string): number {
  return Number(isoDate.split("-")[2] ?? 0);
}

function getDefaultVencimentoIso(vencimentoAtual: string | null | undefined): string {
  const hoje = localTodayIso();
  if (vencimentoAtual && isIsoDate(vencimentoAtual) && vencimentoAtual >= hoje) return vencimentoAtual;
  return addDaysIso(2);
}

function humanizarCodigoErro(code: string | null | undefined): string {
  switch (code) {
    case "fatura_id_invalido":
      return "ID da fatura invalido.";
    case "fatura_nao_encontrada":
      return "Fatura nao encontrada.";
    case "fatura_sem_valor_para_cobranca":
      return "Fatura sem valor para gerar cobranca.";
    case "conta_colaborador_sem_cobranca_externa":
      return "Conta de colaborador nao gera cobranca externa.";
    case "erro_neofin_criar_cobranca":
      return "Falha ao criar cobranca no NeoFin.";
    case "erro_atualizar_fatura":
      return "Falha ao atualizar a fatura.";
    case "vencimento_calculado_no_passado":
      return "Vencimento calculado ja passou.";
    case "vencimento_iso_no_passado":
      return "Vencimento informado esta no passado.";
    case "dia_vencimento_preferencia_invalido":
      return "Dia de preferencia deve ficar entre 1 e 28.";
    case "falha_carregar_fatura":
      return "Nao foi possivel carregar a fatura.";
    case "falha_inesperada":
      return "Falha inesperada.";
    default:
      return code ?? "Erro inesperado.";
  }
}

function extrairMensagemErro(resp: ApiActionResponse | null, fallback = "Falha na operacao."): string {
  if (!resp) return fallback;
  if (resp.message) return resp.message;
  if (resp.detail) return `${humanizarCodigoErro(resp.error)} ${resp.detail}`.trim();
  if (resp.details?.message) return `${humanizarCodigoErro(resp.error)} ${resp.details.message}`.trim();
  if (resp.error) return humanizarCodigoErro(resp.error);
  return fallback;
}

function validarVencimentoUI(vencimentoIso: string, salvarPreferencia: boolean): { ok: true; dia: number } | { ok: false; mensagem: string } {
  if (!isIsoDate(vencimentoIso)) {
    return { ok: false, mensagem: "Informe uma data valida no formato YYYY-MM-DD." };
  }

  const hoje = localTodayIso();
  if (vencimentoIso < hoje) {
    return { ok: false, mensagem: "Informe um vencimento de hoje em diante." };
  }

  const dia = diaDoMes(vencimentoIso);
  if (salvarPreferencia && dia > 28) {
    return {
      ok: false,
      mensagem: "Nao e possivel salvar preferencia com dia maior que 28. Escolha outra data ou desmarque a opcao.",
    };
  }

  return { ok: true, dia };
}

export default function FaturaDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const faturaId = Number(params?.id);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FaturaDetalheData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openIds, setOpenIds] = useState<Record<number, boolean>>({});
  const [modalCobrancaOpen, setModalCobrancaOpen] = useState(false);
  const [modalFecharOpen, setModalFecharOpen] = useState(false);
  const [vencimentoGerar, setVencimentoGerar] = useState("");
  const [vencimentoFechar, setVencimentoFechar] = useState("");
  const [salvarPreferenciaGerar, setSalvarPreferenciaGerar] = useState(true);
  const [salvarPreferenciaFechar, setSalvarPreferenciaFechar] = useState(true);
  const [gerandoCobranca, setGerandoCobranca] = useState(false);
  const [fechandoFatura, setFechandoFatura] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [ultimaCobranca, setUltimaCobranca] = useState<UltimaCobrancaState>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 7000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const carregarFatura = useCallback(async () => {
    if (!Number.isFinite(faturaId)) {
      setError("fatura_id_invalido");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/credito-conexao/faturas/${faturaId}`);
      const json = (await res.json()) as FaturaDetalheResponse;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "falha_carregar_fatura");
        setData(null);
        return;
      }
      setData(json.data ?? null);
      if (json.data?.fatura?.cobranca_id && !ultimaCobranca) {
        setUltimaCobranca({
          cobranca_id: json.data.fatura.cobranca_id,
          neofin_charge_id: null,
          vencimento_iso: json.data.fatura.data_vencimento ?? null,
          status_fatura: json.data.fatura.status ?? null,
        });
      }
    } catch {
      setError("falha_inesperada");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [faturaId, ultimaCobranca]);

  useEffect(() => {
    void carregarFatura();
  }, [carregarFatura]);

  const fatura = data?.fatura ?? null;
  const lancamentos = data?.lancamentos ?? EMPTY_LANCAMENTOS;
  const podeFecharEGerar = fatura?.status === "ABERTA";

  const somaLancamentos = useMemo(
    () => lancamentos.reduce((acc, l) => acc + (typeof l.valor_centavos === "number" ? l.valor_centavos : 0), 0),
    [lancamentos],
  );

  const cobrancaResumo = useMemo(() => {
    const cobrancaId = ultimaCobranca?.cobranca_id ?? fatura?.cobranca_id ?? null;
    if (!cobrancaId) return null;
    return {
      cobrancaId,
      neofinChargeId: ultimaCobranca?.neofin_charge_id ?? null,
      vencimentoIso: ultimaCobranca?.vencimento_iso ?? fatura?.data_vencimento ?? null,
      statusFatura: ultimaCobranca?.status_fatura ?? fatura?.status ?? null,
    };
  }, [fatura, ultimaCobranca]);

  function abrirModalFechar() {
    setVencimentoFechar(getDefaultVencimentoIso(fatura?.data_vencimento));
    setSalvarPreferenciaFechar(true);
    setModalFecharOpen(true);
  }

  function abrirModalGerar() {
    setVencimentoGerar(getDefaultVencimentoIso(fatura?.data_vencimento));
    setSalvarPreferenciaGerar(true);
    setModalCobrancaOpen(true);
  }

  async function fecharFaturaEGerarCobranca() {
    // Diagnostico: confirma que /api/health responde no mesmo servidor (pid)
    try {
      const h = await fetch("/api/health", { cache: "no-store" });
      const hj = await h.json().catch(() => ({}));
      console.log("[health]", { status: h.status, body: hj });
    } catch (e) {
      console.error("[health] falhou", e);
    }

    if (!Number.isFinite(faturaId)) {
      setToast({ tipo: "erro", mensagem: "ID da fatura invalido." });
      return;
    }

    const valid = validarVencimentoUI(vencimentoFechar, salvarPreferenciaFechar);
    if (!valid.ok) {
      setToast({ tipo: "erro", mensagem: valid.mensagem });
      return;
    }

    setFechandoFatura(true);
    setToast(null);

    try {
      const url = `/api/financeiro/credito-conexao/faturas/${faturaId}/fechar`;
      const body = {
        vencimento_iso: vencimentoFechar,
        salvar_preferencia: salvarPreferenciaFechar,
        dia_vencimento: salvarPreferenciaFechar ? valid.dia : undefined,
        force: false,
      };
      console.log("[fechar] url_canonic", url);
      if (process.env.NODE_ENV !== "production") {
        console.log("[fechar] POST", url, body);
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const json = (await res.json().catch(() => null)) as ApiActionResponse | null;
      if (!res.ok || !json?.ok) {
        if (res.status === 403) {
          setToast({
            tipo: "erro",
            mensagem: "[403] Sem permissão. Troque o contexto para Administração do Sistema e tente novamente.",
          });
          return;
        }
        if (res.status === 401) {
          setToast({ tipo: "erro", mensagem: "Sessão expirada. Faça login novamente." });
          window.location.href = "/login";
          return;
        }
        if (process.env.NODE_ENV !== "production") {
          console.error("fechar-fatura erro", { status: res.status, body: json });
        }
        setToast({
          tipo: "erro",
          mensagem: `[${res.status}] ${extrairMensagemErro(json, "Falha ao fechar fatura e gerar cobranca.")}`,
        });
        return;
      }

      setUltimaCobranca({
        cobranca_id: json.cobranca_id ?? null,
        neofin_charge_id: json.neofin_charge_id ?? null,
        vencimento_iso: json.vencimento_iso ?? null,
        status_fatura: json.status_fatura ?? null,
      });

      setToast({
        tipo: "sucesso",
        mensagem: `Fechada e cobranca gerada (#${json.cobranca_id ?? "-"}) - venc. ${json.vencimento_iso ?? "-"}`,
      });
      setModalFecharOpen(false);
      router.refresh();
      await carregarFatura();
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[fechar] erro fetch", {
          url: `/api/financeiro/credito-conexao/faturas/${faturaId}/fechar`,
          err: e,
        });
      }
      setToast({
        tipo: "erro",
        mensagem: e instanceof Error ? e.message : "Falha inesperada ao fechar a fatura.",
      });
    } finally {
      setFechandoFatura(false);
    }
  }

  async function gerarCobrancaAgora() {
    // Diagnostico: confirma que /api/health responde no mesmo servidor (pid)
    try {
      const h = await fetch("/api/health", { cache: "no-store" });
      const hj = await h.json().catch(() => ({}));
      console.log("[health]", { status: h.status, body: hj });
    } catch (e) {
      console.error("[health] falhou", e);
    }

    if (!Number.isFinite(faturaId)) {
      setToast({ tipo: "erro", mensagem: "ID da fatura invalido." });
      return;
    }

    const valid = validarVencimentoUI(vencimentoGerar, salvarPreferenciaGerar);
    if (!valid.ok) {
      setToast({ tipo: "erro", mensagem: valid.mensagem });
      return;
    }

    setGerandoCobranca(true);
    setToast(null);
    try {
      const url = `/api/financeiro/credito-conexao/faturas/${faturaId}/gerar-cobranca`;
      const body = {
        vencimento_iso: vencimentoGerar,
        salvar_preferencia: salvarPreferenciaGerar,
        dia_vencimento: salvarPreferenciaGerar ? valid.dia : undefined,
        force: false,
      };
      console.log("[gerar-cobranca] url_canonic", url);
      if (process.env.NODE_ENV !== "production") {
        console.log("[gerar-cobranca] POST", url, body);
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as ApiActionResponse | null;

      if (!res.ok || !json?.ok) {
        if (res.status === 403) {
          setToast({
            tipo: "erro",
            mensagem: "[403] Sem permissão. Troque o contexto para Administração do Sistema e tente novamente.",
          });
          return;
        }
        if (res.status === 401) {
          setToast({ tipo: "erro", mensagem: "Sessão expirada. Faça login novamente." });
          window.location.href = "/login";
          return;
        }
        if (process.env.NODE_ENV !== "production") {
          console.error("gerar-cobranca erro", { status: res.status, body: json });
        }
        setToast({
          tipo: "erro",
          mensagem: `[${res.status}] ${extrairMensagemErro(json, "Falha ao gerar cobranca.")}`,
        });
        return;
      }

      setUltimaCobranca({
        cobranca_id: json.cobranca_id ?? null,
        neofin_charge_id: json.neofin_charge_id ?? null,
        vencimento_iso: json.vencimento_iso ?? null,
        status_fatura: json.status_fatura ?? null,
      });

      const msg =
        json?.message?.toLowerCase().includes("ja existe")
          ? `Cobranca ja existente (#${json?.cobranca_id ?? "-"}) - venc. ${json?.vencimento_iso ?? "-"}`
          : `Cobranca gerada com sucesso (#${json?.cobranca_id ?? "-"}) - venc. ${json?.vencimento_iso ?? "-"}`;

      setToast({ tipo: "sucesso", mensagem: msg });
      setModalCobrancaOpen(false);
      router.refresh();
      await carregarFatura();
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[gerar-cobranca] erro fetch", {
          url: `/api/financeiro/credito-conexao/faturas/${faturaId}/gerar-cobranca`,
          err: e,
        });
      }
      setToast({
        tipo: "erro",
        mensagem: e instanceof Error ? e.message : "Falha inesperada ao gerar cobranca.",
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
            <CardTitle>Fatura do Cartao Conexao</CardTitle>
            <div className="flex flex-wrap gap-2">
              {podeFecharEGerar ? (
                <Button onClick={abrirModalFechar} disabled={fechandoFatura || gerandoCobranca}>
                  Fechar fatura e gerar cobranca
                </Button>
              ) : null}
              <Button variant="secondary" onClick={abrirModalGerar} disabled={fechandoFatura || gerandoCobranca}>
                Gerar cobranca agora
              </Button>
              <Button variant="secondary" onClick={() => router.back()}>
                Voltar
              </Button>
              <Button variant="secondary" onClick={() => void carregarFatura()}>
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
              <div className="text-sm text-muted-foreground">Fatura nao encontrada.</div>
            ) : (
              <div className="space-y-4">
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
                      <span className="font-medium">Periodo:</span> {fatura.periodo_referencia ?? "-"}
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
                      <span className="font-medium">Soma dos lancamentos vinculados:</span>{" "}
                      {brlFromCentavos(somaLancamentos)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Se os valores divergirem, revise os itens vinculados a fatura ou o recalculo.
                    </div>
                  </div>
                </div>

                {cobrancaResumo ? (
                  <div className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm">
                    <div className="font-medium text-emerald-900">Cobranca gerada</div>
                    <div className="mt-1 text-emerald-900">
                      <span className="font-medium">ID:</span> #{cobrancaResumo.cobrancaId}
                      {" | "}
                      <span className="font-medium">Vencimento:</span> {cobrancaResumo.vencimentoIso ?? "-"}
                      {" | "}
                      <span className="font-medium">Status da fatura:</span> {cobrancaResumo.statusFatura ?? "-"}
                    </div>
                    <div className="mt-1 text-emerald-900">
                      <span className="font-medium">NeoFin:</span> {cobrancaResumo.neofinChargeId ?? "pendente"}
                    </div>
                    <div className="mt-2">
                      <Link
                        href={`/admin/governanca/cobrancas/${cobrancaResumo.cobrancaId}`}
                        className="text-sm font-medium text-emerald-900 underline underline-offset-4"
                      >
                        Abrir detalhe da cobranca
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lancamentos vinculados a fatura</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : lancamentos.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhum lancamento vinculado a esta fatura.</div>
            ) : (
              <div className="space-y-3">
                {lancamentos.map((l) => (
                  <div key={l.id} className="rounded-lg border bg-white p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold">{l.descricao ?? "Lancamento"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          ID: {l.id} | Competencia: {l.competencia ?? "-"} | Ref: {l.referencia_item ?? "-"} | Status:{" "}
                          {l.status ?? "-"}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">{brlFromCentavos(Number(l.valor_centavos ?? 0))}</div>
                    </div>

                    {l.composicao_json ? (
                      <div className="mt-3">
                        <Button variant="secondary" onClick={() => setOpenIds((p) => ({ ...p, [l.id]: !p[l.id] }))}>
                          {openIds[l.id] ? "Ocultar composicao" : "Ver composicao"}
                        </Button>
                        {openIds[l.id] ? (
                          <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-slate-50 p-3 text-xs">
{JSON.stringify(l.composicao_json, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">Sem composicao_json neste lancamento.</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {modalFecharOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-4 shadow-lg">
            <h2 className="text-base font-semibold">Fechar fatura</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Defina um vencimento futuro para fechar a fatura e gerar a cobranca.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block">Data de vencimento</span>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2"
                  value={vencimentoFechar}
                  min={localTodayIso()}
                  onChange={(e) => setVencimentoFechar(e.target.value)}
                  disabled={fechandoFatura}
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={salvarPreferenciaFechar}
                  onChange={(e) => setSalvarPreferenciaFechar(e.target.checked)}
                  disabled={fechandoFatura}
                />
                Salvar como preferencia (dia)
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalFecharOpen(false)} disabled={fechandoFatura}>
                Cancelar
              </Button>
              <Button onClick={() => void fecharFaturaEGerarCobranca()} disabled={fechandoFatura}>
                {fechandoFatura ? "Fechando..." : "Confirmar fechamento"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {modalCobrancaOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl border bg-white p-4 shadow-lg">
            <h2 className="text-base font-semibold">Gerar cobranca agora</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Defina a data de vencimento manual para esta operacao.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block">Data de vencimento</span>
                <input
                  type="date"
                  className="w-full rounded-md border px-3 py-2"
                  value={vencimentoGerar}
                  min={localTodayIso()}
                  onChange={(e) => setVencimentoGerar(e.target.value)}
                  disabled={gerandoCobranca}
                />
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={salvarPreferenciaGerar}
                  onChange={(e) => setSalvarPreferenciaGerar(e.target.checked)}
                  disabled={gerandoCobranca}
                />
                Salvar como preferencia (dia)
              </label>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalCobrancaOpen(false)} disabled={gerandoCobranca}>
                Cancelar
              </Button>
              <Button onClick={() => void gerarCobrancaAgora()} disabled={gerandoCobranca}>
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
