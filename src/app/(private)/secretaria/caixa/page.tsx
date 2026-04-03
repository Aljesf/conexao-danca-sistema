"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BuscaContaInternaCard from "@/components/secretaria/caixa/BuscaContaInternaCard";
import CancelarLancamentoContaInternaModal from "@/components/secretaria/caixa/CancelarLancamentoContaInternaModal";
import FaturasContaInternaTable from "@/components/secretaria/caixa/FaturasContaInternaTable";
import LancamentosContaInternaTable from "@/components/secretaria/caixa/LancamentosContaInternaTable";
import ReceberContaInternaModal from "@/components/secretaria/caixa/ReceberContaInternaModal";
import ResumoContaInternaCard from "@/components/secretaria/caixa/ResumoContaInternaCard";
import type {
  SecretariaContaFinanceiraOpcao,
  SecretariaContaInternaDetalhe,
  SecretariaContaInternaResumo,
  SecretariaContaLancamentoResumo,
  SecretariaFormaPagamentoOpcao,
  SecretariaPagamentoResponse,
  SecretariaRecebimentoAlvo,
} from "@/components/secretaria/caixa/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeaderCard } from "@/components/layout/PageHeaderCard";
import { SectionCard } from "@/components/layout/SectionCard";
import { formatBRLFromCents } from "@/lib/formatters/money";
import { ReciboModal } from "@/components/documentos/ReciboModal";

type BuscaResponse = {
  ok?: boolean;
  itens?: SecretariaContaInternaResumo[];
  detalhe?: string;
  error?: string;
};

type DetalheResponse = {
  ok?: boolean;
  conta?: SecretariaContaInternaDetalhe;
  detalhe?: string;
  error?: string;
};

type FormasPagamentoResponse = {
  ok?: boolean;
  formas?: SecretariaFormaPagamentoOpcao[];
  error?: string;
};

type ContasFinanceirasResponse = {
  ok?: boolean;
  contas?: SecretariaContaFinanceiraOpcao[];
  error?: string;
};

function getErrorMessage(payload: { detalhe?: string; error?: string } | null, status: number): string {
  return payload?.detalhe ?? payload?.error ?? `http_${status}`;
}

function buildMensagemPagamento(payload: SecretariaPagamentoResponse): string {
  const integracao = payload.integracao_externa;

  if (integracao.status === "SINCRONIZADA") {
    return "Pagamento registrado e cobranca externa sincronizada com sucesso.";
  }

  if (integracao.status === "REVISAO_MANUAL") {
    return "Pagamento registrado, mas a cobranca externa precisa de revisao manual.";
  }

  if (integracao.status === "ERRO") {
    return "Pagamento registrado, mas a integracao externa nao foi concluida.";
  }

  return "Pagamento registrado com sucesso.";
}

function buildResumoFromDetalhe(
  detalhe: SecretariaContaInternaDetalhe,
  pessoaSelecionada: SecretariaContaInternaResumo["pessoa"] | null,
): SecretariaContaInternaResumo {
  const lancamentos = [...detalhe.faturas.flatMap((item) => item.lancamentos), ...detalhe.lancamentos_sem_fatura];

  return {
    pessoa: pessoaSelecionada ?? detalhe.pessoa_titular,
    responsavel_financeiro: detalhe.responsavel_financeiro,
    conta_conexao_id: detalhe.conta_id,
    tipo_conta: detalhe.tipo_conta,
    tipo_titular: detalhe.tipo_titular,
    descricao_exibicao: detalhe.descricao_exibicao,
    saldo_total_em_aberto_centavos: detalhe.saldo_total_em_aberto_centavos,
    total_vencido_centavos: detalhe.total_vencido_centavos,
    total_a_vencer_centavos: detalhe.total_a_vencer_centavos,
    proxima_fatura: detalhe.proxima_fatura,
    alunos_relacionados: detalhe.alunos_relacionados,
    faturas_resumidas: detalhe.faturas.slice(0, 6),
    lancamentos_resumidos: lancamentos.slice(0, 8),
    totais_por_origem: detalhe.totais_por_origem,
  };
}

function getPessoaSelecionadaNome(
  contaDetalhe: SecretariaContaInternaDetalhe | null,
  contaResumo: SecretariaContaInternaResumo | null,
): string {
  return (
    contaResumo?.pessoa?.nome ??
    contaDetalhe?.pessoa_titular?.nome ??
    contaDetalhe?.descricao_exibicao ??
    (contaDetalhe ? `Conta #${contaDetalhe.conta_id}` : "Nenhuma pessoa selecionada")
  );
}

export default function SecretariaCaixaPage() {
  const router = useRouter();
  const [termoBusca, setTermoBusca] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [resultados, setResultados] = useState<SecretariaContaInternaResumo[]>([]);
  const [contaSelecionadaId, setContaSelecionadaId] = useState<number | null>(null);
  const [contaSelecionadaResumo, setContaSelecionadaResumo] = useState<SecretariaContaInternaResumo | null>(null);
  const [contaDetalhe, setContaDetalhe] = useState<SecretariaContaInternaDetalhe | null>(null);
  const [carregandoConta, setCarregandoConta] = useState(false);
  const [erroConta, setErroConta] = useState<string | null>(null);
  const [mensagemOperacional, setMensagemOperacional] = useState<string | null>(null);
  const [formasPagamento, setFormasPagamento] = useState<SecretariaFormaPagamentoOpcao[]>([]);
  const [contasFinanceiras, setContasFinanceiras] = useState<SecretariaContaFinanceiraOpcao[]>([]);
  const [erroOpcoes, setErroOpcoes] = useState<string | null>(null);
  const [alvoRecebimento, setAlvoRecebimento] = useState<SecretariaRecebimentoAlvo | null>(null);
  const [alvoCancelamento, setAlvoCancelamento] = useState<SecretariaContaLancamentoResumo | null>(null);
  const [reciboRecebimentoId, setReciboRecebimentoId] = useState<number | null>(null);
  const buscaRef = useRef(0);
  const buscarContasAssistidoRef = useRef<(termo: string) => void>(() => undefined);

  async function carregarOpcoesPagamento() {
    try {
      setErroOpcoes(null);

      const [formasResponse, contasResponse] = await Promise.all([
        fetch("/api/financeiro/formas-pagamento/liquidacao", { cache: "no-store" }),
        fetch("/api/financeiro/contas-financeiras", { cache: "no-store" }),
      ]);

      const formasBody = (await formasResponse.json().catch(() => null)) as FormasPagamentoResponse | null;
      const contasBody = (await contasResponse.json().catch(() => null)) as ContasFinanceirasResponse | null;

      if (!formasResponse.ok || formasBody?.ok === false) {
        throw new Error(getErrorMessage(formasBody, formasResponse.status));
      }

      if (!contasResponse.ok || contasBody?.ok === false) {
        throw new Error(getErrorMessage(contasBody, contasResponse.status));
      }

      setFormasPagamento(formasBody?.formas ?? []);
      setContasFinanceiras(contasBody?.contas ?? []);
    } catch {
      setErroOpcoes("Nao foi possivel carregar formas de pagamento e contas financeiras agora.");
    }
  }

  async function carregarConta(item: SecretariaContaInternaResumo) {
    setContaSelecionadaId(item.conta_conexao_id);
    setContaSelecionadaResumo(item);
    setCarregandoConta(true);
    setErroConta(null);
    setMensagemOperacional(null);

    try {
      const response = await fetch(`/api/secretaria/caixa/conta-interna/${item.conta_conexao_id}`, {
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as DetalheResponse | null;

      if (!response.ok || body?.ok === false || !body?.conta) {
        throw new Error(getErrorMessage(body, response.status));
      }

      setContaDetalhe(body.conta);
      setContaSelecionadaResumo(buildResumoFromDetalhe(body.conta, item.pessoa));
      setTermoBusca(item.pessoa?.nome ?? item.descricao_exibicao ?? termoBusca);
    } catch (error) {
      setErroConta(error instanceof Error ? error.message : "Nao foi possivel carregar a conta interna agora.");
    } finally {
      setCarregandoConta(false);
    }
  }

  async function buscarContas(termoParam = termoBusca, autoAbrirQuandoUnico = false) {
    const termo = termoParam.trim();

    if (termo.length < 2) {
      setErroBusca("Digite pelo menos 2 caracteres para buscar.");
      setResultados([]);
      return;
    }

    const requestId = buscaRef.current + 1;
    buscaRef.current = requestId;
    setBuscando(true);
    setErroBusca(null);

    try {
      const response = await fetch(`/api/secretaria/caixa/conta-interna?q=${encodeURIComponent(termo)}`, {
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as BuscaResponse | null;

      if (!response.ok || body?.ok === false) {
        throw new Error(getErrorMessage(body, response.status));
      }

      if (requestId !== buscaRef.current) {
        return;
      }

      const itens = body?.itens ?? [];
      setResultados(itens);

      if (autoAbrirQuandoUnico && itens.length === 1) {
        await carregarConta(itens[0]);
      }
    } catch (error) {
      if (requestId !== buscaRef.current) {
        return;
      }

      setErroBusca(error instanceof Error ? error.message : "Nao foi possivel localizar contas internas agora.");
      setResultados([]);
    } finally {
      if (requestId === buscaRef.current) {
        setBuscando(false);
      }
    }
  }

  async function handlePagamentoConcluido(payload: SecretariaPagamentoResponse) {
    setContaDetalhe(payload.detalhe);
    setContaSelecionadaId(payload.detalhe.conta_id);
    setContaSelecionadaResumo((current) => buildResumoFromDetalhe(payload.detalhe, current?.pessoa ?? null));
    const recebimentoId = payload.redirecionamento.recebimento_id;
    const mensagemBase = buildMensagemPagamento(payload);
    setMensagemOperacional(mensagemBase);

    if (termoBusca.trim().length >= 2) {
      void buscarContas(termoBusca, false);
    }

    if (recebimentoId) {
      setReciboRecebimentoId(recebimentoId);
    }
  }

  async function handleCancelamentoConcluido(payload: {
    detalhe: SecretariaContaInternaDetalhe;
    lancamento: SecretariaContaLancamentoResumo | null;
  }) {
    setContaDetalhe(payload.detalhe);
    setContaSelecionadaId(payload.detalhe.conta_id);
    setContaSelecionadaResumo((current) => buildResumoFromDetalhe(payload.detalhe, current?.pessoa ?? null));
    setMensagemOperacional("Lancamento cancelado com sucesso e removido do saldo operacional.");

    if (termoBusca.trim().length >= 2) {
      void buscarContas(termoBusca, false);
    }
  }
  buscarContasAssistidoRef.current = (termo: string) => {
    void buscarContas(termo, false);
  };

  useEffect(() => {
    void carregarOpcoesPagamento();
  }, []);

  useEffect(() => {
    const termo = termoBusca.trim();

    if (!termo) {
      setBuscando(false);
      setErroBusca(null);
      setResultados([]);
      return;
    }

    if (termo.length < 2) {
      setBuscando(false);
      setErroBusca(null);
      setResultados([]);
      return;
    }

    const timeout = window.setTimeout(() => {
      buscarContasAssistidoRef.current(termo);
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [termoBusca]);

  useEffect(() => {
    if (!contaSelecionadaId) return;

    const atualizado = resultados.find((item) => item.conta_conexao_id === contaSelecionadaId) ?? null;
    if (atualizado) {
      setContaSelecionadaResumo(atualizado);
    }
  }, [resultados, contaSelecionadaId]);

  const pessoaSelecionadaNome = getPessoaSelecionadaNome(contaDetalhe, contaSelecionadaResumo);

  return (
    <PageContainer>
      <PageHeaderCard
        title="Secretaria da Escola - Caixa"
        subtitle="Central unica de recebimento da conta interna para atendimento rapido no balcao."
      >
        <div className="mt-4 space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f7ebdc_0%,#ffffff_46%,#edf8f8_100%)] px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
                Secretaria da Escola
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 ring-1 ring-slate-200">
                Caixa da conta interna
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              O fluxo comeca pela selecao da pessoa. Depois disso, o operador enxerga a conta consolidada, as
              faturas em aberto e os lancamentos que podem ser recebidos total ou parcialmente.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Pessoa selecionada</div>
              <div className="mt-1 text-lg font-semibold text-slate-950">{pessoaSelecionadaNome}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Conta em caixa</div>
              <div className="mt-1 text-lg font-semibold text-slate-950">
                {contaDetalhe
                  ? `#${contaDetalhe.conta_id} — ${contaDetalhe.descricao_exibicao ?? contaDetalhe.tipo_conta ?? "Caixa Geral da Escola"}`
                  : "--"}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Saldo em aberto</div>
              <div className="mt-1 text-lg font-semibold text-slate-950">
                {formatBRLFromCents(contaDetalhe?.saldo_total_em_aberto_centavos ?? null)}
              </div>
            </div>
          </div>

          {erroOpcoes ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {erroOpcoes}
            </div>
          ) : null}
        </div>
      </PageHeaderCard>

      <BuscaContaInternaCard
        termo={termoBusca}
        loading={buscando}
        error={erroBusca}
        resultados={resultados}
        contaSelecionadaId={contaSelecionadaId}
        contaSelecionada={contaSelecionadaResumo}
        onTermoChange={setTermoBusca}
        onBuscar={() => void buscarContas(termoBusca, true)}
        onSelecionarConta={(item) => void carregarConta(item)}
      />

      <SectionCard
        title="2. Pessoa e conta selecionada"
        description="Confirmacao visual da pessoa em atendimento antes de registrar recebimentos."
        className="rounded-[28px] border-slate-200 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)]"
      >
        {!contaSelecionadaResumo && !contaDetalhe ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
            Escolha uma pessoa na busca acima para abrir o caixa da Secretaria.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fff7ec_0%,#ffffff_52%,#eef7f8_100%)] px-5 py-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Pessoa atendida</div>
              <div className="mt-1 text-2xl font-semibold text-slate-950">{pessoaSelecionadaNome}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                  Conta #{contaDetalhe?.conta_id ?? contaSelecionadaResumo?.conta_conexao_id ?? "--"}
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                  {contaDetalhe?.descricao_exibicao ?? contaSelecionadaResumo?.descricao_exibicao ?? contaDetalhe?.tipo_conta ?? contaSelecionadaResumo?.tipo_conta ?? "Caixa Geral da Escola"}
                </span>
                {(contaDetalhe?.tipo_titular ?? contaSelecionadaResumo?.tipo_titular) ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
                    {contaDetalhe?.tipo_titular ?? contaSelecionadaResumo?.tipo_titular}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>
                  Responsavel financeiro:{" "}
                  {contaDetalhe?.responsavel_financeiro?.nome ??
                    contaSelecionadaResumo?.responsavel_financeiro?.nome ??
                    "Nao informado"}
                </p>
                <p>
                  Descricao da conta:{" "}
                  {contaDetalhe?.descricao_exibicao ?? contaSelecionadaResumo?.descricao_exibicao ?? "Caixa Geral da Escola"}
                </p>
                {(contaDetalhe?.alunos_relacionados ?? contaSelecionadaResumo?.alunos_relacionados ?? []).length > 0 ? (
                  <p>
                    Alunos vinculados:{" "}
                    {(contaDetalhe?.alunos_relacionados ?? contaSelecionadaResumo?.alunos_relacionados ?? [])
                      .map((aluno) => aluno.nome ?? `Aluno #${aluno.id}`)
                      .join(", ")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Saldo total</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">
                  {formatBRLFromCents(
                    contaDetalhe?.saldo_total_em_aberto_centavos ?? contaSelecionadaResumo?.saldo_total_em_aberto_centavos ?? null,
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-rose-600">Vencido</div>
                <div className="mt-1 text-xl font-semibold text-rose-700">
                  {formatBRLFromCents(
                    contaDetalhe?.total_vencido_centavos ?? contaSelecionadaResumo?.total_vencido_centavos ?? null,
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-700">A vencer</div>
                <div className="mt-1 text-xl font-semibold text-emerald-700">
                  {formatBRLFromCents(
                    contaDetalhe?.total_a_vencer_centavos ?? contaSelecionadaResumo?.total_a_vencer_centavos ?? null,
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <ResumoContaInternaCard
        detalhe={contaDetalhe}
        loading={carregandoConta}
        error={erroConta}
        mensagem={mensagemOperacional}
      />

      <SectionCard
        title="4. Faturas da conta interna"
        description="As competencias aparecem da mais antiga para a mais recente. Cada fatura concentra seus lancamentos e acoes."
        className="rounded-[28px] border-slate-200 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)]"
      >
        <FaturasContaInternaTable
          faturas={contaDetalhe?.faturas ?? []}
          loading={carregandoConta}
          onReceberFatura={(fatura) => setAlvoRecebimento({ tipo: "FATURA", item: fatura })}
          onReceberLancamento={(lancamento) => setAlvoRecebimento({ tipo: "LANCAMENTO", item: lancamento })}
          onCancelarLancamento={setAlvoCancelamento}
        />
      </SectionCard>

      <SectionCard
        title="5. Lancamentos sem fatura"
        description="Itens fora do agrupamento principal aparecem separados como inconsistencias operacionais que precisam de correcao."
        className="rounded-[28px] border-slate-200 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.35)]"
      >
        <LancamentosContaInternaTable
          lancamentos={contaDetalhe?.lancamentos_sem_fatura ?? []}
          loading={carregandoConta}
          onReceber={(lancamento) => setAlvoRecebimento({ tipo: "LANCAMENTO", item: lancamento })}
          onCancelar={setAlvoCancelamento}
        />
      </SectionCard>

      <ReceberContaInternaModal
        open={Boolean(alvoRecebimento)}
        alvo={alvoRecebimento}
        formasPagamento={formasPagamento}
        contasFinanceiras={contasFinanceiras}
        onClose={() => setAlvoRecebimento(null)}
        onSuccess={handlePagamentoConcluido}
      />

      <CancelarLancamentoContaInternaModal
        open={Boolean(alvoCancelamento)}
        lancamento={alvoCancelamento}
        onClose={() => setAlvoCancelamento(null)}
        onSuccess={handleCancelamentoConcluido}
      />

      <ReciboModal
        open={Boolean(reciboRecebimentoId)}
        onClose={() => setReciboRecebimentoId(null)}
        params={reciboRecebimentoId ? { tipo: "RECEBIMENTO", recebimento_id: reciboRecebimentoId } : null}
        title="Recibo de pagamento"
      />
    </PageContainer>
  );
}
