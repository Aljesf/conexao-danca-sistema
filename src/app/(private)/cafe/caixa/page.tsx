"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import CafeCard from "@/components/cafe/CafeCard";
import CafeCatalogoProdutos, { type CafeCatalogoProduto } from "@/components/cafe/catalogo/CafeCatalogoProdutos";
import CafePageShell from "@/components/cafe/CafePageShell";
import CafePanel from "@/components/cafe/CafePanel";
import CafeSectionIntro from "@/components/cafe/CafeSectionIntro";
import CafeStatCard from "@/components/cafe/CafeStatCard";

type ColaboradorOption = {
  id: number;
  pessoa_id: number | null;
  nome: string;
};

type PessoaBuscaItem = {
  id: number;
  nome: string;
  email?: string | null;
};

type CafeCompradorTipo =
  | "NAO_IDENTIFICADO"
  | "ALUNO"
  | "COLABORADOR"
  | "PESSOA_AVULSA";

type PagamentoOpcao = {
  id: number | null;
  codigo: string;
  label: string;
  tipo_fluxo:
    | "IMEDIATO"
    | "CARTAO_EXTERNO"
    | "CONTA_INTERNA_ALUNO"
    | "CONTA_INTERNA_COLABORADOR";
  exige_conta_conexao: boolean;
  habilitado: boolean;
  motivo_bloqueio: string | null;
};

type PagamentosResponse = {
  centro_custo_id: number;
  comprador: {
    pessoa_id: number | null;
    tipo: CafeCompradorTipo;
  };
  elegibilidade_conta_interna?: ContaInternaElegibilidade | null;
  conta_interna?: {
    elegivel: boolean;
    tipo: "ALUNO" | "COLABORADOR" | null;
    conta_id: number | null;
    titular_pessoa_id: number | null;
    motivo: string | null;
    suporte?: {
      pode_solicitar: boolean;
      payload: {
        pessoa_id: number | null;
        tipo_conta: "ALUNO" | "COLABORADOR" | null;
        contexto_origem: "CAFE" | "LOJA" | "ESCOLA";
      } | null;
    };
  };
  opcoes: PagamentoOpcao[];
};

type ComandaItem = {
  produto_id: number;
  quantidade: number;
  descricao_snapshot: string | null;
  valor_total_centavos: number;
};

type TabelaPrecoOpcao = {
  id: number;
  nome: string;
  codigo: string | null;
  descricao: string | null;
  padrao: boolean;
};

type TabelasPrecoResponse = {
  ok?: boolean;
  tabela_preco_atual_id?: number | null;
  itens?: TabelaPrecoOpcao[];
  data?: Array<{
    id: number;
    codigo: string | null;
    nome: string;
    descricao?: string | null;
    ativo?: boolean;
    is_default?: boolean;
  }>;
};

type Comanda = {
  id: number;
  pagador_pessoa_id: number | null;
  comprador_pessoa_id?: number | null;
  comprador_tipo?: string | null;
  pagador_nome?: string | null;
  data_operacao: string;
  data_competencia: string | null;
  competencia_ano_mes?: string | null;
  colaborador_pessoa_id: number | null;
  colaborador_nome: string | null;
  tipo_quitacao: "IMEDIATA" | "PARCIAL" | "CONTA_INTERNA_COLABORADOR" | "CONTA_INTERNA" | "CARTAO_CONEXAO";
  status_pagamento: "PENDENTE" | "PARCIAL" | "PAGO" | "FATURADO" | "CANCELADO";
  status_financeiro?: string | null;
  valor_total_centavos: number;
  valor_pago_centavos: number;
  valor_em_aberto_centavos: number;
  cobranca_id: number | null;
  forma_pagamento?: string | null;
  tabela_preco_id?: number | null;
  origem_financeira?: string | null;
  observacoes_internas: string | null;
  cafe_venda_itens?: ComandaItem[];
  fatura?: { id?: number; periodo_referencia?: string | null; status?: string | null } | null;
  data_hora_venda?: string | null;
};

type ItemForm = {
  produto_id: number;
  nome: string;
  quantidade: number;
  valor_unitario_centavos: number;
};

type BuyerType = "SEM_VINCULO" | "PESSOA_AVULSA" | "ALUNO" | "COLABORADOR";
type FormTipoQuitacao =
  | "PAGAMENTO_IMEDIATO"
  | "PAGAMENTO_PARCIAL"
  | "CONTA_INTERNA_ALUNO"
  | "CONTA_INTERNA_COLABORADOR";
type ContaInternaElegibilidade = {
  pessoaId: number;
  possuiContaInternaAluno: boolean;
  possuiContaInternaColaborador: boolean;
  contaInternaAlunoId: number | null;
  contaInternaColaboradorId: number | null;
  tiposQuitacaoPermitidos: FormTipoQuitacao[];
};

type ShortcutId = "retroativo" | "baixa" | "conta" | "recentes";

type SectionId = "formulario" | "baixa" | "conta" | "recentes";

type ComandaFilters = {
  dataInicial: string;
  dataFinal: string;
  colaboradorPessoaId: string;
  status: string;
  competencia: string;
};

type CaixaSectionProps = {
  anchor: string;
  title: string;
  description: string;
  children: ReactNode;
  active?: boolean;
  variant?: "default" | "muted" | "stats";
  actions?: ReactNode;
};

type ShortcutCardProps = {
  badge: string;
  title: string;
  description: string;
  active?: boolean;
  onClick: () => void;
};

type EmptyStateProps = {
  title: string;
  description: string;
  hint?: string;
  tone?: "default" | "warning";
};

type StatusBadgeProps = {
  kind: "status" | "quitacao";
  value: string;
};

type MetricTileProps = {
  label: string;
  value: string;
  emphasis?: boolean;
};

type FinanceiroBadgeProps = {
  label: string;
  tone?: "success" | "warning" | "account" | "muted";
};

type ComandaFilaCardProps = {
  comanda: Comanda;
  onEditar: (id: number) => void;
  onDarBaixa: (comanda: Comanda) => void;
  onContaInterna: (comanda: Comanda) => void;
};

const STATUS_OPTIONS = ["", "PENDENTE", "PARCIAL", "PAGO", "FATURADO", "CANCELADO"] as const;
const PAGAMENTO_OPTIONS = [
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "PIX", label: "Pix" },
  { value: "CARTAO", label: "Cartao" },
  { value: "TICKET", label: "Ticket" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
] as const;
const SECTION_TARGETS: Record<SectionId, string> = {
  formulario: "caixa-formulario",
  baixa: "caixa-baixa",
  conta: "caixa-conta-interna",
  recentes: "caixa-recentes",
};
const BUTTON_PRIMARY =
  "rounded-full bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
const BUTTON_SECONDARY =
  "rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";
const BUTTON_GHOST =
  "rounded-full border border-[#e4d3bc] bg-[#fff8ef] px-4 py-2.5 text-sm font-medium text-[#8c6640] transition hover:border-[#d5ba92] hover:bg-[#fff2df] disabled:cursor-not-allowed disabled:opacity-60";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function brl(value: number) {
  return (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function nowLocalDateTimeInput() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function isoToDateTimeInput(value: string | null | undefined) {
  if (!value) return nowLocalDateTimeInput();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return nowLocalDateTimeInput();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function serializeDateTimeInput(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function competenciaFromDate(dateIso: string) {
  return dateIso.slice(0, 7);
}

function formatCafeErrorMessage(message: string) {
  switch (message) {
    case "conta_interna_exige_colaborador":
      return "Selecione um colaborador com conta interna elegivel para continuar.";
    case "data_hora_venda_obrigatoria":
      return "Informe a data e hora reais da venda antes de registrar a comanda.";
    case "competencia_obrigatoria_para_conta_interna":
      return "Informe a competencia de cobranca antes de registrar a comanda em conta interna.";
    case "valor_pago_abertura_obrigatorio_para_pagamento_parcial":
      return "Pagamento parcial exige informar um valor pago na abertura maior que zero.";
    case "tabela_preco_id_invalida":
      return "A tabela de preco escolhida nao esta mais disponivel. Atualize o lancamento e tente novamente.";
    default:
      return message;
  }
}

function mergeItensForm(items: ItemForm[]) {
  const grouped = new Map<number, ItemForm>();

  items.forEach((item) => {
    const current = grouped.get(item.produto_id);
    if (current) {
      grouped.set(item.produto_id, {
        ...current,
        quantidade: current.quantidade + item.quantidade,
        valor_unitario_centavos: item.valor_unitario_centavos || current.valor_unitario_centavos,
        nome: item.nome || current.nome,
      });
      return;
    }

    grouped.set(item.produto_id, { ...item });
  });

  return Array.from(grouped.values());
}

function formatTipoQuitacao(value: Comanda["tipo_quitacao"]) {
  switch (value) {
    case "IMEDIATA":
      return "Pagamento imediato";
    case "PARCIAL":
      return "Pagamento parcial";
    case "CARTAO_CONEXAO":
      return "Conta interna do aluno";
    case "CONTA_INTERNA":
    case "CONTA_INTERNA_COLABORADOR":
      return "Conta interna do colaborador";
    default:
      return value;
  }
}

function formatStatus(value: Comanda["status_pagamento"]) {
  switch (value) {
    case "PENDENTE":
      return "Pendente";
    case "PARCIAL":
      return "Parcial";
    case "PAGO":
      return "Pago";
    case "FATURADO":
      return "Faturado";
    case "CANCELADO":
      return "Cancelado";
    default:
      return value;
  }
}

function formatPerfilDetectado(value: CafeCompradorTipo | BuyerType) {
  switch (value) {
    case "ALUNO":
      return "Aluno";
    case "COLABORADOR":
      return "Colaborador";
    case "PESSOA_AVULSA":
      return "Pessoa avulsa";
    default:
      return "Nao identificado";
  }
}

function mapCafeCompradorTipoToBuyerType(value: CafeCompradorTipo): BuyerType {
  switch (value) {
    case "ALUNO":
      return "ALUNO";
    case "COLABORADOR":
      return "COLABORADOR";
    case "PESSOA_AVULSA":
      return "PESSOA_AVULSA";
    default:
      return "SEM_VINCULO";
  }
}

function formatFormaPagamento(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  switch (normalized) {
    case "DINHEIRO":
      return "Dinheiro";
    case "PIX":
      return "Pix";
    case "CARTAO":
      return "Cartao";
    case "CREDITO_AVISTA":
      return "Cartao externo";
    case "TICKET":
      return "Ticket";
    case "TRANSFERENCIA":
      return "Transferencia";
    case "CREDIARIO_COLAB":
      return "Conta interna do colaborador";
    case "CARTAO_CONEXAO_ALUNO":
      return "Conta interna do aluno";
    case "CARTAO_CONEXAO_COLABORADOR":
    case "CARTAO_CONEXAO_COLAB":
      return "Conta interna do colaborador";
    case "CONTA_INTERNA_COLABORADOR":
    case "CONTA_INTERNA":
      return "Conta interna do colaborador";
    default:
      return value?.trim() || "Nao informado";
  }
}

function scrollToSection(section: SectionId) {
  if (typeof document === "undefined") return;
  document.getElementById(SECTION_TARGETS[section])?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function CaixaSection({
  anchor,
  title,
  description,
  children,
  active = false,
  variant = "default",
  actions,
}: CaixaSectionProps) {
  return (
    <div id={anchor} className="scroll-mt-28">
      <CafeCard
        title={title}
        description={description}
        actions={actions}
        variant={active && variant === "default" ? "muted" : variant}
        className={cx(active && "ring-1 ring-[#d9b58b]/60")}
      >
        {children}
      </CafeCard>
    </div>
  );
}

function ShortcutCard({ badge, title, description, active = false, onClick }: ShortcutCardProps) {
  return (
    <button
      type="button"
      className={cx(
        "group flex h-full flex-col gap-4 rounded-[22px] border px-5 py-5 text-left transition",
        active
          ? "border-[#d2b086] bg-[linear-gradient(180deg,#fffef9_0%,#fff3df_100%)] shadow-[0_20px_44px_-28px_rgba(180,126,58,0.35)]"
          : "border-slate-200/80 bg-white shadow-[0_14px_36px_-28px_rgba(15,23,42,0.28)] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_20px_44px_-28px_rgba(15,23,42,0.25)]",
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cx(
            "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
            active ? "bg-[#d7b186] text-[#53361b]" : "bg-slate-100 text-slate-600",
          )}
        >
          {badge}
        </span>
        <span className="text-sm font-medium text-slate-500 group-hover:text-slate-700">Ir para</span>
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </button>
  );
}

function EmptyState({ title, description, hint, tone = "default" }: EmptyStateProps) {
  return (
    <div
      className={cx(
        "rounded-[22px] border border-dashed px-5 py-6",
        tone === "warning" ? "border-[#e1c59f] bg-[#fff8ee]" : "border-slate-200 bg-slate-50/80",
      )}
    >
      <div className="space-y-2">
        <h3 className="text-base font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="text-sm leading-6 text-slate-600">{description}</p>
        {hint ? <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{hint}</p> : null}
      </div>
    </div>
  );
}

function StatusBadge({ kind, value }: StatusBadgeProps) {
  const classes =
    kind === "status"
      ? {
          PENDENTE: "border-[#f3d0d0] bg-[#fff4f4] text-[#9f3a38]",
          PARCIAL: "border-[#ead8ae] bg-[#fff8e8] text-[#8f6a22]",
          PAGO: "border-[#cfe7d2] bg-[#f3fbf4] text-[#2f6a3a]",
          FATURADO: "border-[#cfdbee] bg-[#f3f7ff] text-[#355d94]",
          CANCELADO: "border-slate-200 bg-slate-100 text-slate-600",
        }[value] ?? "border-slate-200 bg-slate-100 text-slate-600"
      : {
          IMEDIATA: "border-[#d5e5d7] bg-[#f4fbf5] text-[#2e6b38]",
          PARCIAL: "border-[#ead8ae] bg-[#fff8e8] text-[#8f6a22]",
          CONTA_INTERNA_COLABORADOR: "border-[#e3d0b5] bg-[#fff6eb] text-[#8c6640]",
        }[value] ?? "border-slate-200 bg-slate-100 text-slate-600";

  const label =
    kind === "status"
      ? formatStatus(value as Comanda["status_pagamento"])
      : formatTipoQuitacao(value as Comanda["tipo_quitacao"]);

  return (
    <span className={cx("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", classes)}>
      {label}
    </span>
  );
}

function MetricTile({ label, value, emphasis = false }: MetricTileProps) {
  return (
    <div className={cx("rounded-[18px] border px-4 py-3", emphasis ? "border-[#e3c39a] bg-[#fff7ea]" : "border-slate-200 bg-white")}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function FinanceiroBadge({ label, tone = "muted" }: FinanceiroBadgeProps) {
  const toneClass =
    tone === "success"
      ? "border-[#cfe7d2] bg-[#f3fbf4] text-[#2f6a3a]"
      : tone === "warning"
        ? "border-[#ead8ae] bg-[#fff8e8] text-[#8f6a22]"
        : tone === "account"
          ? "border-[#e3d0b5] bg-[#fff6eb] text-[#8c6640]"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={cx("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold", toneClass)}>
      {label}
    </span>
  );
}

function ComandaFilaCard({ comanda, onEditar, onDarBaixa, onContaInterna }: ComandaFilaCardProps) {
  const temSaldoAberto = comanda.valor_em_aberto_centavos > 0;
  const emContaInternaColaborador =
    comanda.tipo_quitacao === "CONTA_INTERNA_COLABORADOR" ||
    comanda.tipo_quitacao === "CONTA_INTERNA" ||
    comanda.origem_financeira === "CONTA_INTERNA" ||
    comanda.origem_financeira === "CARTAO_CONEXAO_COLABORADOR";
  const emContaInternaAluno =
    comanda.tipo_quitacao === "CARTAO_CONEXAO" ||
    comanda.origem_financeira === "CARTAO_CONEXAO_ALUNO";
  const emFluxoFuturo = emContaInternaColaborador || emContaInternaAluno || Boolean(comanda.cobranca_id);
  const podeConverterSaldo = temSaldoAberto && !emFluxoFuturo;
  const tituloComprador =
    comanda.colaborador_nome ?? comanda.pagador_nome ?? "Comanda administrativa sem vinculo";
  const subtituloComprador = comanda.colaborador_nome
    ? "Comprador vinculado como colaborador."
    : comanda.pagador_nome
      ? "Comprador identificado como pessoa avulsa."
      : "Comprador nao identificado no registro legado.";
  const resultadoFinanceiro = emContaInternaColaborador
    ? `Debito em conta interna do colaborador${comanda.data_competencia ? ` na competencia ${comanda.data_competencia}` : ""}.`
    : emContaInternaAluno
      ? `Debito em conta interna do aluno${comanda.data_competencia ? ` na competencia ${comanda.data_competencia}` : ""}.`
    : temSaldoAberto
      ? comanda.valor_pago_centavos > 0
        ? "Parcial no caixa com saldo ainda em aberto."
        : "Saldo em aberto aguardando baixa ou conversao posterior."
      : "Recebimento concluido no caixa.";

  return (
    <article className="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.28)]">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">#{comanda.id}</span>
            <StatusBadge kind="status" value={comanda.status_pagamento} />
            <StatusBadge kind="quitacao" value={comanda.tipo_quitacao} />
            {comanda.data_competencia ? (
              <span className="rounded-full border border-[#e6d6bf] bg-[#fff8ef] px-3 py-1 text-xs font-semibold text-[#8c6640]">
                {comanda.data_competencia}
              </span>
            ) : null}
            {comanda.forma_pagamento ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                {formatFormaPagamento(comanda.forma_pagamento)}
              </span>
            ) : null}
            {!emFluxoFuturo && comanda.status_pagamento === "PAGO" ? (
              <FinanceiroBadge label="Pago no caixa" tone="success" />
            ) : null}
            {comanda.status_pagamento === "PARCIAL" ? <FinanceiroBadge label="Parcial" tone="warning" /> : null}
            {podeConverterSaldo ? <FinanceiroBadge label="Saldo em aberto" tone="warning" /> : null}
            {emContaInternaColaborador && comanda.data_competencia ? (
              <FinanceiroBadge label={`Conta interna do colaborador ${comanda.data_competencia}`} tone="account" />
            ) : null}
            {emContaInternaAluno && comanda.data_competencia ? (
              <FinanceiroBadge label={`Conta interna do aluno ${comanda.data_competencia}`} tone="account" />
            ) : null}
            {comanda.status_pagamento === "FATURADO" ? <FinanceiroBadge label="Faturada" tone="muted" /> : null}
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold tracking-tight text-slate-950">{tituloComprador}</h3>
            <p className="text-sm leading-6 text-slate-600">
              Operacao em {comanda.data_operacao}. {subtituloComprador} {resultadoFinanceiro}{" "}
              {comanda.cafe_venda_itens?.length ? `${comanda.cafe_venda_itens.length} item(ns) registrados.` : "Itens nao detalhados nesta consulta."}
            </p>
          </div>

          {comanda.observacoes_internas ? (
            <CafePanel className="px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c6640]">Observacao interna</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{comanda.observacoes_internas}</p>
            </CafePanel>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[340px]">
          <MetricTile label="Total" value={brl(comanda.valor_total_centavos)} />
          <MetricTile label="Pago" value={brl(comanda.valor_pago_centavos)} />
          <MetricTile label="Saldo aberto" value={brl(comanda.valor_em_aberto_centavos)} emphasis={temSaldoAberto} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link className={BUTTON_SECONDARY} href={`/cafe/vendas/${comanda.id}`}>
          Ver recibo
        </Link>
        <button type="button" className={BUTTON_SECONDARY} onClick={() => onEditar(comanda.id)}>
          Editar
        </button>
        <button type="button" className={BUTTON_SECONDARY} disabled={!temSaldoAberto} onClick={() => onDarBaixa(comanda)}>
          Dar baixa
        </button>
        {podeConverterSaldo ? (
          <button type="button" className={BUTTON_GHOST} onClick={() => onContaInterna(comanda)}>
            Converter saldo para conta interna
          </button>
        ) : null}
        {comanda.cobranca_id ? (
          <Link className={BUTTON_SECONDARY} href={`/admin/governanca/cobrancas/${comanda.cobranca_id}`}>
            Ver cobranca
          </Link>
        ) : null}
        {comanda.fatura?.id ? (
          <Link className={BUTTON_SECONDARY} href={`/admin/financeiro/credito-conexao/faturas/${comanda.fatura.id}`}>
            Ver fatura
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function CafeCaixaPage() {
  const [colaboradores, setColaboradores] = useState<ColaboradorOption[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const [modo, setModo] = useState<"DIA" | "RETROATIVO">("DIA");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dataHoraVenda, setDataHoraVenda] = useState(nowLocalDateTimeInput());
  const [dataOperacao, setDataOperacao] = useState(todayIso());
  const [tipoComprador, setTipoComprador] = useState<BuyerType>("SEM_VINCULO");
  const [compradorSelecionado, setCompradorSelecionado] = useState<PessoaBuscaItem | null>(null);
  const [buscaComprador, setBuscaComprador] = useState("");
  const [compradores, setCompradores] = useState<PessoaBuscaItem[]>([]);
  const [compradoresLoading, setCompradoresLoading] = useState(false);
  const [colaboradorPessoaId, setColaboradorPessoaId] = useState<string>("");
  const [tipoQuitacao, setTipoQuitacao] = useState<FormTipoQuitacao>("PAGAMENTO_IMEDIATO");
  const [competencia, setCompetencia] = useState(competenciaFromDate(todayIso()));
  const [observacoesInternas, setObservacoesInternas] = useState("");
  const [centroCustoId, setCentroCustoId] = useState<number | null>(null);
  const [pagamentosDisponiveis, setPagamentosDisponiveis] = useState<PagamentoOpcao[]>([]);
  const [pagamentosLoading, setPagamentosLoading] = useState(false);
  const [elegibilidadeContaInterna, setElegibilidadeContaInterna] =
    useState<ContaInternaElegibilidade | null>(null);
  const [contaInternaInfo, setContaInternaInfo] = useState<PagamentosResponse["conta_interna"] | null>(null);
  const [tabelasPreco, setTabelasPreco] = useState<TabelaPrecoOpcao[]>([]);
  const [tabelasPrecoLoading, setTabelasPrecoLoading] = useState(false);
  const [tabelaPrecoId, setTabelaPrecoId] = useState<number | null>(null);
  const [metodoPagamento, setMetodoPagamento] = useState("DINHEIRO");
  const [valorPagoCentavos, setValorPagoCentavos] = useState("0");
  const [itens, setItens] = useState<ItemForm[]>([]);
  const [atalhoAtivo, setAtalhoAtivo] = useState<ShortcutId | null>(null);
  const itensRef = useRef<ItemForm[]>([]);

  const [filtroDataInicial, setFiltroDataInicial] = useState(todayIso());
  const [filtroDataFinal, setFiltroDataFinal] = useState(todayIso());
  const [filtroColaboradorPessoaId, setFiltroColaboradorPessoaId] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("");
  const [filtroCompetencia, setFiltroCompetencia] = useState(competenciaFromDate(todayIso()));

  const [baixaId, setBaixaId] = useState<number | null>(null);
  const [baixaValorCentavos, setBaixaValorCentavos] = useState("");
  const [baixaMetodo, setBaixaMetodo] = useState("DINHEIRO");

  const [contaInternaId, setContaInternaId] = useState<number | null>(null);
  const [contaInternaCompetencia, setContaInternaCompetencia] = useState(competenciaFromDate(todayIso()));
  const [contaInternaColaboradorPessoaId, setContaInternaColaboradorPessoaId] = useState("");

  useEffect(() => {
    itensRef.current = itens;
  }, [itens]);

  const totalItensCentavos = useMemo(
    () => itens.reduce((acc, item) => acc + item.valor_unitario_centavos * item.quantidade, 0),
    [itens],
  );
  const quantidadesPorProdutoId = useMemo(
    () =>
      itens.reduce<Record<number, number>>((acc, item) => {
        acc[item.produto_id] = (acc[item.produto_id] ?? 0) + item.quantidade;
        return acc;
      }, {}),
    [itens],
  );
  const valorPagoAberturaCentavos = Number(valorPagoCentavos || "0");
  const saldoPrevistoCentavos = Math.max(totalItensCentavos - valorPagoAberturaCentavos, 0);
  const isPagamentoImediato = tipoQuitacao === "PAGAMENTO_IMEDIATO";
  const isPagamentoParcial = tipoQuitacao === "PAGAMENTO_PARCIAL";
  const isContaInternaAluno = tipoQuitacao === "CONTA_INTERNA_ALUNO";
  const isContaInternaColaborador = tipoQuitacao === "CONTA_INTERNA_COLABORADOR";
  const isContaInternaFutura = isContaInternaAluno || isContaInternaColaborador;
  const competenciaSugerida = competencia || competenciaFromDate(dataOperacao);
  const competenciaAtual = competenciaFromDate(todayIso());

  const baixaSelecionada = useMemo(
    () => comandas.find((comanda) => comanda.id === baixaId) ?? null,
    [comandas, baixaId],
  );

  const contaInternaSelecionada = useMemo(
    () => comandas.find((comanda) => comanda.id === contaInternaId) ?? null,
    [comandas, contaInternaId],
  );

  const pendenciasAbertas = useMemo(
    () => comandas.filter((comanda) => comanda.valor_em_aberto_centavos > 0).length,
    [comandas],
  );

  const saldoAbertoFila = useMemo(
    () => comandas.reduce((acc, comanda) => acc + comanda.valor_em_aberto_centavos, 0),
    [comandas],
  );

  const faturadasNaFila = useMemo(
    () => comandas.filter((comanda) => comanda.status_pagamento === "FATURADO").length,
    [comandas],
  );

  const retroativasNaFila = useMemo(
    () => comandas.filter((comanda) => comanda.data_operacao !== todayIso()).length,
    [comandas],
  );

  const compradorNome = compradorSelecionado?.nome ?? "Nenhuma pessoa selecionada";
  const compradorPessoaId = compradorSelecionado?.id ?? null;
  const permiteContaInternaAluno = Boolean(
    compradorPessoaId && elegibilidadeContaInterna?.possuiContaInternaAluno,
  );
  const permiteContaInternaColaborador = Boolean(
    compradorPessoaId && elegibilidadeContaInterna?.possuiContaInternaColaborador,
  );
  const pagamentoSelecionado = pagamentosDisponiveis.find((item) => item.codigo === metodoPagamento) ?? null;
  const tabelaPrecoAtiva = useMemo(
    () => tabelasPreco.find((item) => item.id === tabelaPrecoId) ?? null,
    [tabelaPrecoId, tabelasPreco],
  );
  const pagamentosDisponiveisFiltrados = pagamentosDisponiveis.filter((item) => {
    if (!item.habilitado) return true;
    return item.tipo_fluxo === "IMEDIATO" || item.tipo_fluxo === "CARTAO_EXTERNO";
  });
  const opcoesQuitacao = [
    { value: "PAGAMENTO_IMEDIATO", label: "Pagamento imediato" },
    { value: "PAGAMENTO_PARCIAL", label: "Pagamento parcial" },
    ...(permiteContaInternaAluno
      ? ([{ value: "CONTA_INTERNA_ALUNO", label: "Conta interna do aluno" }] as const)
      : []),
    ...(permiteContaInternaColaborador
      ? ([{ value: "CONTA_INTERNA_COLABORADOR", label: "Conta interna do colaborador" }] as const)
      : []),
  ];

  const resultadoFinanceiro = isContaInternaColaborador
    ? "Cobranca futura na conta interna do colaborador"
    : isContaInternaAluno
      ? "Cobranca futura na conta interna do aluno"
      : isPagamentoParcial
        ? "Recebimento parcial com saldo em aberto"
        : saldoPrevistoCentavos > 0
          ? "Recebimento imediato com saldo remanescente"
          : "Recebimento imediato no caixa";

  const statusPrevisto = editingId
    ? "Ajuste operacional"
    : isContaInternaAluno
      ? "Cobranca futura do aluno"
      : isContaInternaColaborador
        ? "Cobranca futura do colaborador"
        : saldoPrevistoCentavos === 0
          ? "Pago"
          : valorPagoAberturaCentavos > 0
            ? "Parcial"
            : "Pendente";
  const competenciaCobranca = isContaInternaFutura ? competenciaSugerida : "Nao se aplica";

  const filtrosAtivos =
    Boolean(filtroColaboradorPessoaId) ||
    Boolean(filtroStatus) ||
    filtroCompetencia !== competenciaAtual ||
    filtroDataInicial !== todayIso() ||
    filtroDataFinal !== todayIso();

  function filtrosComOverrides(overrides?: Partial<ComandaFilters>): ComandaFilters {
    return {
      dataInicial: overrides?.dataInicial ?? filtroDataInicial,
      dataFinal: overrides?.dataFinal ?? filtroDataFinal,
      colaboradorPessoaId: overrides?.colaboradorPessoaId ?? filtroColaboradorPessoaId,
      status: overrides?.status ?? filtroStatus,
      competencia: overrides?.competencia ?? filtroCompetencia,
    };
  }

  async function carregarBases() {
    const colaboradoresRes = await fetch("/api/admin/colaboradores/opcoes", { cache: "no-store" });
    const colaboradoresJson = (await colaboradoresRes.json().catch(() => null)) as
      | { data?: ColaboradorOption[] }
      | null;

    setColaboradores(colaboradoresJson?.data ?? []);
  }

  async function carregarComandas(overrides?: Partial<ComandaFilters>) {
    setLoading(true);
    try {
      const filtros = filtrosComOverrides(overrides);
      const params = new URLSearchParams();
      if (filtros.dataInicial) params.set("data_inicial", filtros.dataInicial);
      if (filtros.dataFinal) params.set("data_final", filtros.dataFinal);
      if (filtros.colaboradorPessoaId) params.set("colaborador_pessoa_id", filtros.colaboradorPessoaId);
      if (filtros.status) params.set("status_pagamento", filtros.status);
      if (filtros.competencia) params.set("competencia", filtros.competencia);

      const res = await fetch(`/api/cafe/caixa?${params.toString()}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as { data?: Comanda[]; error?: string } | null;
      if (!res.ok) throw new Error(json?.error ?? "falha_carregar_comandas");
      setComandas(json?.data ?? []);
    } catch (error) {
      setMensagem(formatCafeErrorMessage(error instanceof Error ? error.message : "falha_carregar_comandas"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function iniciar() {
      try {
        await carregarBases();
        await carregarComandas();
      } catch (error) {
        setMensagem(formatCafeErrorMessage(error instanceof Error ? error.message : "falha_inicializar_caixa"));
        setLoading(false);
      }
    }

    void iniciar();
    // Initial load happens once; the fetchers read current default filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (modo === "DIA") {
      const agora = nowLocalDateTimeInput();
      setDataHoraVenda(agora);
      if (isContaInternaFutura) {
        setCompetencia(competenciaFromDate(agora.slice(0, 10)));
      }
    }
  }, [isContaInternaFutura, modo]);

  useEffect(() => {
    const proximaDataOperacao = dataHoraVenda.slice(0, 10);
    if (proximaDataOperacao && proximaDataOperacao !== dataOperacao) {
      setDataOperacao(proximaDataOperacao);
    }
  }, [dataHoraVenda, dataOperacao]);

  useEffect(() => {
    if (modo === "RETROATIVO") {
      setAtalhoAtivo("retroativo");
    }
  }, [modo]);

  useEffect(() => {
    if (isContaInternaFutura) {
      setAtalhoAtivo("conta");
    }
  }, [isContaInternaFutura]);

  useEffect(() => {
    if (isContaInternaFutura && valorPagoCentavos !== "0") {
      setValorPagoCentavos("0");
    }
  }, [isContaInternaFutura, valorPagoCentavos]);

  useEffect(() => {
    if (!compradorSelecionado) {
      setTipoComprador("SEM_VINCULO");
      if (colaboradorPessoaId) setColaboradorPessoaId("");
    }
  }, [colaboradorPessoaId, compradorSelecionado]);

  useEffect(() => {
    if (permiteContaInternaAluno || permiteContaInternaColaborador) return;
    if (isContaInternaFutura) {
      setTipoQuitacao("PAGAMENTO_IMEDIATO");
    }
  }, [
    isContaInternaFutura,
    permiteContaInternaAluno,
    permiteContaInternaColaborador,
    tipoQuitacao,
  ]);

  useEffect(() => {
    const controller = new AbortController();

    async function carregarPagamentos() {
      setPagamentosLoading(true);
      try {
        const params = new URLSearchParams();
        if (compradorPessoaId) {
          params.set("comprador_pessoa_id", String(compradorPessoaId));
        } else {
          params.set("comprador_tipo", "NAO_IDENTIFICADO");
        }

        const response = await fetch(`/api/cafe/pagamentos/opcoes?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as PagamentosResponse | { detalhe?: string } | null;
        if (!response.ok) {
          throw new Error(
            payload && typeof payload === "object" && "detalhe" in payload && payload.detalhe
              ? String(payload.detalhe)
              : "falha_carregar_pagamentos_cafe",
          );
        }

        const nextOptions = Array.isArray(payload?.opcoes) ? payload.opcoes : [];
        setPagamentosDisponiveis(nextOptions);
        setCentroCustoId(payload?.centro_custo_id ?? null);
        setContaInternaInfo(payload?.conta_interna ?? null);
        setElegibilidadeContaInterna(payload?.elegibilidade_conta_interna ?? null);
        if (payload?.comprador?.tipo && compradorPessoaId) {
          const proximoTipo = mapCafeCompradorTipoToBuyerType(payload.comprador.tipo);
          setTipoComprador(proximoTipo);
          if (proximoTipo === "COLABORADOR") {
            setColaboradorPessoaId(String(compradorPessoaId));
          } else if (colaboradorPessoaId) {
            setColaboradorPessoaId("");
          }
        }
        setMetodoPagamento((current) => {
          const availableCurrent = nextOptions.find((item) => item.codigo === current && item.habilitado);
          return availableCurrent?.codigo ?? nextOptions.find((item) => item.habilitado)?.codigo ?? "";
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setPagamentosDisponiveis([]);
          setElegibilidadeContaInterna(null);
          setContaInternaInfo(null);
          setMetodoPagamento("");
          setMensagem(
            formatCafeErrorMessage(error instanceof Error ? error.message : "falha_carregar_pagamentos_cafe"),
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setPagamentosLoading(false);
        }
      }
    }

    void carregarPagamentos();
    return () => controller.abort();
  }, [colaboradorPessoaId, compradorPessoaId]);

  useEffect(() => {
    const controller = new AbortController();

    async function carregarTabelasPreco() {
      setTabelasPrecoLoading(true);
      try {
        const params = new URLSearchParams();
        if (compradorPessoaId) {
          params.set("comprador_pessoa_id", String(compradorPessoaId));
        } else {
          params.set("comprador_tipo", "NAO_IDENTIFICADO");
        }

        const response = await fetch(`/api/cafe/tabelas-preco?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as TabelasPrecoResponse | { error?: string } | null;
        if (!response.ok) {
          throw new Error(
            payload && typeof payload === "object" && "error" in payload && payload.error
              ? String(payload.error)
              : "falha_carregar_tabelas_preco_cafe",
          );
        }

        const itensTabela = Array.isArray(payload?.itens)
          ? payload.itens
          : Array.isArray(payload?.data)
            ? payload.data.map((item) => ({
                id: item.id,
                nome: item.nome,
                codigo: item.codigo ?? null,
                descricao: item.descricao ?? null,
                padrao: Boolean(item.is_default),
              }))
            : [];

        setTabelasPreco(itensTabela);
        setTabelaPrecoId((current) => {
          if (current && itensTabela.some((item) => item.id === current)) return current;
          return (
            payload?.tabela_preco_atual_id ??
            itensTabela.find((item) => item.padrao)?.id ??
            itensTabela[0]?.id ??
            null
          );
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setTabelasPreco([]);
          setTabelaPrecoId(null);
          setMensagem(
            formatCafeErrorMessage(error instanceof Error ? error.message : "falha_carregar_tabelas_preco_cafe"),
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setTabelasPrecoLoading(false);
        }
      }
    }

    void carregarTabelasPreco();
    return () => controller.abort();
  }, [compradorPessoaId]);

  useEffect(() => {
    const current = pagamentosDisponiveisFiltrados.find((item) => item.codigo === metodoPagamento);
    if (current?.habilitado) return;
    const fallback = pagamentosDisponiveisFiltrados.find((item) => item.habilitado);
    if (fallback && fallback.codigo !== metodoPagamento) {
      setMetodoPagamento(fallback.codigo);
    }
  }, [metodoPagamento, pagamentosDisponiveisFiltrados]);

  useEffect(() => {
    if (!tabelaPrecoId || itensRef.current.length === 0) return;

    const controller = new AbortController();

    async function recalcularItensDaComanda() {
      try {
        const produtoIds = itensRef.current.map((item) => item.produto_id);
        const params = new URLSearchParams({
          ids: produtoIds.join(","),
          page: "1",
          pageSize: String(Math.max(produtoIds.length, 20)),
          tabela_preco_id: String(tabelaPrecoId),
        });
        const response = await fetch(`/api/cafe/produtos?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as {
          data?: { items?: CafeCatalogoProduto[] };
          error?: string;
        } | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "falha_recalcular_precos_caixa");
        }

        const produtos = Array.isArray(payload?.data?.items) ? payload.data.items : [];
        const produtoMap = new Map(produtos.map((item) => [item.id, item]));

        setItens((current) =>
          current.map((item) => {
            const produtoAtualizado = produtoMap.get(item.produto_id);
            if (!produtoAtualizado) return item;
            return {
              ...item,
              nome: produtoAtualizado.nome,
              valor_unitario_centavos: Number(produtoAtualizado.preco_venda_centavos ?? item.valor_unitario_centavos),
            };
          }),
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          setMensagem(formatCafeErrorMessage(error instanceof Error ? error.message : "falha_recalcular_precos_caixa"));
        }
      }
    }

    void recalcularItensDaComanda();
    return () => controller.abort();
  }, [tabelaPrecoId]);

  useEffect(() => {
    if (baixaId) {
      setAtalhoAtivo("baixa");
    }
  }, [baixaId]);

  useEffect(() => {
    const term = buscaComprador.trim();
    if (compradorSelecionado && buscaComprador === compradorSelecionado.nome) {
      setCompradores([]);
      return;
    }
    if (term.length < 2) {
      setCompradores([]);
      return;
    }

    const controller = new AbortController();

    async function carregarCompradores() {
      setCompradoresLoading(true);
      try {
        const response = await fetch(`/api/pessoas/busca?query=${encodeURIComponent(term)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { items?: PessoaBuscaItem[]; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "falha_buscar_compradores");
        }

        setCompradores(Array.isArray(payload?.items) ? payload.items : []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setCompradores([]);
          setMensagem(formatCafeErrorMessage(error instanceof Error ? error.message : "falha_buscar_compradores"));
        }
      } finally {
        if (!controller.signal.aborted) {
          setCompradoresLoading(false);
        }
      }
    }

    void carregarCompradores();
    return () => controller.abort();
  }, [buscaComprador, compradorSelecionado]);

  function limparFormulario() {
    setEditingId(null);
    setModo("DIA");
    setDataHoraVenda(nowLocalDateTimeInput());
    setDataOperacao(todayIso());
    setTipoComprador("SEM_VINCULO");
    setCompradorSelecionado(null);
    setBuscaComprador("");
    setCompradores([]);
    setColaboradorPessoaId("");
    setTipoQuitacao("PAGAMENTO_IMEDIATO");
    setCompetencia(competenciaFromDate(todayIso()));
    setObservacoesInternas("");
    setTabelaPrecoId(null);
    setMetodoPagamento("DINHEIRO");
    setValorPagoCentavos("0");
    setItens([]);
    setBaixaId(null);
    setBaixaValorCentavos("");
    setContaInternaId(null);
    setContaInternaColaboradorPessoaId("");
    setContaInternaCompetencia(competenciaFromDate(todayIso()));
    setAtalhoAtivo(null);
  }

  function adicionarItem(produto: CafeCatalogoProduto) {
    setMensagem(null);
    setItens((current) =>
      mergeItensForm([
        ...current,
        {
          produto_id: produto.id,
          nome: produto.nome,
          quantidade: 1,
          valor_unitario_centavos: produto.preco_venda_centavos,
        },
      ]),
    );
  }

  function atualizarQuantidadeItem(produtoId: number, quantidade: number) {
    setItens((current) =>
      current
        .map((item) => (item.produto_id === produtoId ? { ...item, quantidade } : item))
        .filter((item) => item.quantidade > 0),
    );
  }

  function removerItem(produtoId: number) {
    setItens((current) => current.filter((item) => item.produto_id !== produtoId));
  }

  function selecionarComprador(item: PessoaBuscaItem) {
    setCompradorSelecionado(item);
    setBuscaComprador(item.nome);
    setCompradores([]);
  }

  async function solicitarContaInterna() {
    if (!contaInternaInfo?.suporte?.pode_solicitar || !contaInternaInfo.suporte.payload) return;

    setMensagem(null);
    try {
      const response = await fetch("/api/suporte/solicitacoes-conta-interna", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contaInternaInfo.suporte.payload,
          observacao: `Solicitacao aberta a partir do Caixa do Ballet Cafe para ${compradorNome}.`,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { detalhe?: string; ticket?: { codigo?: string | null } } | null;
      if (!response.ok) {
        throw new Error(payload?.detalhe ?? "falha_solicitar_conta_interna");
      }

      setMensagem(
        payload?.ticket?.codigo
          ? `Solicitacao registrada com sucesso. Ticket ${payload.ticket.codigo}.`
          : "Solicitacao registrada com sucesso.",
      );
    } catch (error) {
      setMensagem(formatCafeErrorMessage(error instanceof Error ? error.message : "falha_solicitar_conta_interna"));
    }
  }

  async function salvarComanda() {
    if (!editingId && itens.length === 0) {
      setMensagem("Adicione ao menos um item na comanda.");
      return;
    }

    if (!compradorSelecionado) {
      setMensagem("Selecione a pessoa da venda antes de registrar o lancamento.");
      return;
    }

    if (!serializeDateTimeInput(dataHoraVenda)) {
      setMensagem("Informe a data e hora reais da venda.");
      return;
    }

    if (isContaInternaColaborador && !permiteContaInternaColaborador) {
      setMensagem("Conta interna do colaborador exige titular elegivel.");
      return;
    }

    if (isContaInternaAluno && !permiteContaInternaAluno) {
      setMensagem("Conta interna do aluno exige aluno ou responsavel financeiro elegivel.");
      return;
    }

    if (isContaInternaFutura && !competencia) {
      setMensagem("Informe a competencia da cobranca para o fluxo de conta interna.");
      return;
    }

    if ((isPagamentoImediato || isPagamentoParcial) && !pagamentoSelecionado?.habilitado) {
      setMensagem("Selecione uma forma de pagamento valida para continuar.");
      return;
    }

    if (isPagamentoParcial && Number(valorPagoCentavos || "0") <= 0) {
      setMensagem("Pagamento parcial exige valor pago na abertura maior que zero.");
      return;
    }

    setSaving(true);
    setMensagem(null);
    try {
      const compradorPayloadId = compradorPessoaId;
      const colaboradorPayloadId =
        isContaInternaColaborador || tipoComprador === "COLABORADOR" ? compradorPayloadId : null;
      const formaPagamentoPayload = pagamentoSelecionado?.codigo ?? null;
      const dataHoraVendaPayload = serializeDateTimeInput(dataHoraVenda);
      const quitacaoPayload = tipoQuitacao;
      const valorPagoPayload = isContaInternaFutura ? null : Number(valorPagoCentavos || "0");
      const payload = editingId
        ? {
            data_hora_venda: dataHoraVendaPayload,
            data_operacao: dataOperacao,
            tipo_comprador: tipoComprador,
            comprador_id: compradorPayloadId,
            pagador_pessoa_id: compradorPayloadId,
            colaborador_pessoa_id: colaboradorPayloadId,
            competencia_ano_mes: isContaInternaFutura ? competencia : null,
            observacoes_internas: observacoesInternas,
            observacoes: observacoesInternas,
            forma_pagamento_id: isContaInternaFutura ? null : pagamentoSelecionado?.id ?? null,
            forma_pagamento_real: isContaInternaFutura ? null : formaPagamentoPayload,
            tabela_preco_id: tabelaPrecoId,
          }
        : {
            data_hora_venda: dataHoraVendaPayload,
            data_operacao: dataOperacao,
            tipo_comprador: tipoComprador,
            comprador_id: compradorPayloadId,
            pagador_pessoa_id: compradorPayloadId,
            colaborador_pessoa_id: colaboradorPayloadId,
            tipo_quitacao: quitacaoPayload,
            competencia_ano_mes: isContaInternaFutura ? competencia : null,
            observacoes_internas: observacoesInternas,
            observacoes: observacoesInternas,
            forma_pagamento_id: isContaInternaFutura ? null : pagamentoSelecionado?.id ?? null,
            forma_pagamento_real: isContaInternaFutura ? null : formaPagamentoPayload,
            tabela_preco_id: tabelaPrecoId,
            valor_pago_abertura_centavos: valorPagoPayload,
            itens: itens.map((item) => ({
              produto_id: item.produto_id,
              quantidade: item.quantidade,
              valor_unitario_centavos: item.valor_unitario_centavos,
              descricao_snapshot: item.nome,
            })),
          };

      const res = await fetch(editingId ? `/api/cafe/caixa/${editingId}` : "/api/cafe/caixa", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as { error?: string; detalhe?: string } | null;
      if (!res.ok) throw new Error(json?.detalhe ?? json?.error ?? "falha_salvar_comanda");
      limparFormulario();
      await carregarComandas();
      setMensagem(editingId ? "Comanda atualizada." : "Comanda registrada.");
      setAtalhoAtivo("recentes");
      scrollToSection("recentes");
    } catch (error) {
      setMensagem(formatCafeErrorMessage(error instanceof Error ? error.message : "falha_salvar_comanda"));
    } finally {
      setSaving(false);
    }
  }

  async function editarComanda(id: number) {
    setMensagem(null);
    const res = await fetch(`/api/cafe/caixa/${id}`, { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as { data?: Comanda; error?: string; detalhe?: string } | null;
    if (!res.ok || !json?.data) {
      setMensagem(json?.detalhe ?? json?.error ?? "falha_buscar_comanda");
      return;
    }

    const comanda = json.data;
    setEditingId(comanda.id);
    setModo(comanda.data_operacao === todayIso() ? "DIA" : "RETROATIVO");
    setDataHoraVenda(isoToDateTimeInput(comanda.data_hora_venda ?? `${comanda.data_operacao}T12:00:00.000Z`));
    setDataOperacao(comanda.data_operacao);
    if (comanda.colaborador_pessoa_id) {
      setTipoComprador("COLABORADOR");
      setColaboradorPessoaId(String(comanda.colaborador_pessoa_id));
      setCompradorSelecionado({
        id: comanda.colaborador_pessoa_id,
        nome: comanda.colaborador_nome ?? comanda.pagador_nome ?? `Pessoa #${comanda.colaborador_pessoa_id}`,
        email: null,
      });
      setBuscaComprador(comanda.colaborador_nome ?? comanda.pagador_nome ?? `Pessoa #${comanda.colaborador_pessoa_id}`);
    } else if (comanda.comprador_tipo === "ALUNO" && (comanda.comprador_pessoa_id ?? comanda.pagador_pessoa_id)) {
      const pessoaId = comanda.comprador_pessoa_id ?? comanda.pagador_pessoa_id;
      setTipoComprador("ALUNO");
      setCompradorSelecionado({
        id: pessoaId ?? 0,
        nome: comanda.pagador_nome ?? `Pessoa #${pessoaId}`,
        email: null,
      });
      setBuscaComprador(comanda.pagador_nome ?? `Pessoa #${pessoaId}`);
      setColaboradorPessoaId("");
    } else if (comanda.pagador_pessoa_id) {
      setTipoComprador("PESSOA_AVULSA");
      setCompradorSelecionado({
        id: comanda.pagador_pessoa_id,
        nome: comanda.pagador_nome ?? `Pessoa #${comanda.pagador_pessoa_id}`,
        email: null,
      });
      setBuscaComprador(comanda.pagador_nome ?? `Pessoa #${comanda.pagador_pessoa_id}`);
      setColaboradorPessoaId("");
    } else {
      setTipoComprador("SEM_VINCULO");
      setCompradorSelecionado(null);
      setBuscaComprador("");
      setColaboradorPessoaId("");
    }
    setTipoQuitacao(
      comanda.tipo_quitacao === "CARTAO_CONEXAO"
        ? "CONTA_INTERNA_ALUNO"
        : comanda.tipo_quitacao === "CONTA_INTERNA" ||
            comanda.tipo_quitacao === "CONTA_INTERNA_COLABORADOR"
          ? "CONTA_INTERNA_COLABORADOR"
          : comanda.tipo_quitacao === "PARCIAL"
            ? "PAGAMENTO_PARCIAL"
            : "PAGAMENTO_IMEDIATO",
    );
    setCompetencia(comanda.data_competencia ?? competenciaFromDate(comanda.data_operacao));
    setObservacoesInternas(comanda.observacoes_internas ?? "");
    setTabelaPrecoId(comanda.tabela_preco_id ?? null);
    setMetodoPagamento(
      comanda.forma_pagamento &&
        comanda.forma_pagamento !== "CONTA_INTERNA_COLABORADOR" &&
        comanda.forma_pagamento !== "CARTAO_CONEXAO_ALUNO"
        ? comanda.forma_pagamento
        : "DINHEIRO",
    );
    setValorPagoCentavos(String(comanda.valor_pago_centavos ?? 0));
    setItens(
      mergeItensForm(
        (comanda.cafe_venda_itens ?? []).map((item) => ({
          produto_id: item.produto_id,
          nome: item.descricao_snapshot ?? `Produto #${item.produto_id}`,
          quantidade: item.quantidade,
          valor_unitario_centavos:
            item.quantidade > 0 ? Math.round(item.valor_total_centavos / item.quantidade) : 0,
        })),
      ),
    );
    setBaixaId(null);
    setContaInternaId(null);
    setAtalhoAtivo("retroativo");
    scrollToSection("formulario");
  }

  async function registrarBaixa() {
    if (!baixaId) return;
    setSaving(true);
    setMensagem(null);
    try {
      const res = await fetch(`/api/cafe/caixa/${baixaId}/baixas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valor_centavos: Number(baixaValorCentavos || "0"),
          metodo_pagamento: baixaMetodo,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string; detalhe?: string } | null;
      if (!res.ok) throw new Error(json?.detalhe ?? json?.error ?? "falha_registrar_baixa");
      setBaixaId(null);
      setBaixaValorCentavos("");
      await carregarComandas();
      setMensagem("Baixa registrada.");
      setAtalhoAtivo("recentes");
      scrollToSection("recentes");
    } catch (error) {
      setMensagem(formatCafeErrorMessage(error instanceof Error ? error.message : "falha_registrar_baixa"));
    } finally {
      setSaving(false);
    }
  }

  async function enviarContaInterna() {
    if (!contaInternaId) return;
    setSaving(true);
    setMensagem(null);
    try {
      const res = await fetch(`/api/cafe/caixa/${contaInternaId}/enviar-conta-interna`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaborador_pessoa_id: Number(contaInternaColaboradorPessoaId || "0"),
          data_competencia: contaInternaCompetencia,
        }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string; detalhe?: string } | null;
      if (!res.ok) throw new Error(json?.detalhe ?? json?.error ?? "falha_enviar_conta_interna");
      setContaInternaId(null);
      await carregarComandas();
      setMensagem("Saldo convertido para a conta interna.");
      setAtalhoAtivo("recentes");
      scrollToSection("recentes");
    } catch (error) {
      setMensagem(formatCafeErrorMessage(error instanceof Error ? error.message : "falha_enviar_conta_interna"));
    } finally {
      setSaving(false);
    }
  }

  async function verPendencias() {
    const status = "PENDENTE";
    setFiltroStatus(status);
    setAtalhoAtivo("recentes");
    scrollToSection("recentes");
    await carregarComandas({ status });
  }

  function ativarFluxoRetroativo() {
    setModo("RETROATIVO");
    setAtalhoAtivo("retroativo");
    scrollToSection("formulario");
  }

  function ativarFluxoBaixa() {
    setAtalhoAtivo("baixa");
    scrollToSection(baixaId ? "baixa" : "recentes");
  }

  function ativarFluxoContaInterna() {
    setAtalhoAtivo("conta");
    if (!compradorSelecionado) {
      setMensagem("Selecione a pessoa da venda para habilitar a cobranca futura.");
      scrollToSection("formulario");
      return;
    }
    if (permiteContaInternaAluno) {
      setTipoQuitacao("CONTA_INTERNA_ALUNO");
    } else if (permiteContaInternaColaborador) {
      setTipoQuitacao("CONTA_INTERNA_COLABORADOR");
    }
    scrollToSection(contaInternaId ? "conta" : "formulario");
  }

  function renderAtalhos() {
    return (
      <CafeCard
        title="Fluxos desta tela"
        description="Acesse rapidamente o fluxo principal, a baixa real ou a conversao de saldo."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ShortcutCard
            badge="Retroativo"
            title="Lancar comanda retroativa"
            description="Registre aqui comandas anotadas em papel ou vendas lancadas depois do atendimento."
            active={atalhoAtivo === "retroativo" || modo === "RETROATIVO"}
            onClick={ativarFluxoRetroativo}
          />
          <ShortcutCard
            badge="Baixa"
            title="Registrar baixa parcial"
            description="Selecione uma comanda aberta e confirme o pagamento real sem criar fluxo paralelo no cafe."
            active={atalhoAtivo === "baixa" || baixaId !== null}
            onClick={ativarFluxoBaixa}
          />
          <ShortcutCard
            badge="Fluxo futuro"
            title="Lancar em cobranca futura"
            description="Use conta interna do colaborador ou conta interna do aluno. A comanda ja nasce vinculada a cobranca da competencia."
            active={atalhoAtivo === "conta" || isContaInternaFutura || contaInternaId !== null}
            onClick={ativarFluxoContaInterna}
          />
          <ShortcutCard
            badge="Revisao"
            title="Revisar comandas recentes"
            description="Filtre colaborador, competencia e status para acompanhar a fila operacional."
            active={atalhoAtivo === "recentes"}
            onClick={() => {
              setAtalhoAtivo("recentes");
              scrollToSection("recentes");
            }}
          />
        </div>
      </CafeCard>
    );
  }

  function renderFormularioPrincipal() {
    return (
      <div className="space-y-6">
        <CaixaSection
          anchor={SECTION_TARGETS.formulario}
          title="A. Operacao"
          description="Escolha a pessoa, ajuste a data real da venda e deixe a quitacao pronta para lancamento."
          active={modo === "RETROATIVO" || atalhoAtivo === "retroativo"}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Modo de operacao</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className={cx(
                    "rounded-[18px] border px-4 py-3 text-left transition",
                    modo === "DIA" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                  )}
                  onClick={() => {
                    setModo("DIA");
                    setAtalhoAtivo(null);
                  }}
                >
                  <div className="text-sm font-semibold">Venda do dia</div>
                  <div className="mt-1 text-xs leading-5 text-inherit/80">Ajuste rapido para registro do proprio dia.</div>
                </button>
                <button
                  type="button"
                  className={cx(
                    "rounded-[18px] border px-4 py-3 text-left transition",
                    modo === "RETROATIVO"
                      ? "border-[#d2b086] bg-[#fff6ea] text-[#6f4f2c]"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                  )}
                  onClick={() => {
                    setModo("RETROATIVO");
                    setAtalhoAtivo("retroativo");
                  }}
                >
                  <div className="text-sm font-semibold">Lancamento retroativo</div>
                  <div className="mt-1 text-xs leading-5 text-inherit/80">Corrige comandas lancadas depois do atendimento.</div>
                </button>
              </div>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Data e hora da venda</span>
              <input
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
                type="datetime-local"
                value={dataHoraVenda}
                onChange={(event) => setDataHoraVenda(event.target.value)}
                required
              />
              <p className="text-xs leading-5 text-slate-500">
                Esse horario sera persistido para leitura operacional e analise futura de pico de vendas.
              </p>
            </label>

            <div className="space-y-4 rounded-[22px] border border-[#ead8be] bg-[#fffaf2] p-5 md:col-span-2">
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight text-slate-950">Identificacao da pessoa</h3>
                <p className="text-sm leading-6 text-slate-600">
                  Selecione a pessoa e o sistema libera automaticamente apenas as quitacoes validas para ela.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="font-medium text-slate-700">Pessoa da venda</span>
                  <div className="relative">
                    <input
                      className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                      value={buscaComprador}
                      onChange={(event) => {
                        setBuscaComprador(event.target.value);
                        setCompradorSelecionado(null);
                      }}
                      placeholder="Buscar por nome ou email"
                    />
                    {compradorSelecionado ? (
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-xs font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        onClick={() => {
                          setCompradorSelecionado(null);
                          setBuscaComprador("");
                          setCompradores([]);
                          setTipoComprador("SEM_VINCULO");
                        }}
                      >
                        Limpar
                      </button>
                    ) : null}
                  </div>
                </label>

                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm">
                  <span className="block font-medium text-slate-700">Perfil detectado</span>
                  <span className="mt-2 block text-base font-semibold text-slate-950">
                    {formatPerfilDetectado(tipoComprador)}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {compradorSelecionado
                      ? "As opcoes de quitacao abaixo ja consideram as contas internas elegiveis dessa pessoa."
                      : "Selecione uma pessoa para inferencia automatica."}
                  </span>
                </div>
              </div>

              {compradoresLoading ? (
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  Buscando pessoas...
                </div>
              ) : compradores.length > 0 ? (
                <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                  {compradores.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-left first:border-t-0 hover:bg-slate-50"
                      onClick={() => selecionarComprador(item)}
                    >
                      <span className="font-medium text-slate-900">{item.nome}</span>
                      <span className="text-xs text-slate-500">{item.email ?? "Pessoa"}</span>
                    </button>
                  ))}
                </div>
              ) : buscaComprador.trim().length >= 2 ? (
                <EmptyState
                  title="Nenhuma pessoa encontrada"
                  description="Continue digitando ou ajuste o termo para localizar a pessoa correta."
                />
              ) : null}

              <div className="grid gap-3 md:grid-cols-3">
                <MetricTile
                  label="Conta interna aluno"
                  value={permiteContaInternaAluno ? "Disponivel" : "Nao disponivel"}
                />
                <MetricTile
                  label="Conta interna colaborador"
                  value={permiteContaInternaColaborador ? "Disponivel" : "Nao disponivel"}
                />
                <MetricTile
                  label="Leitura da pessoa"
                  value={compradorNome}
                  emphasis={Boolean(compradorSelecionado)}
                />
              </div>

              <label className="space-y-2 text-sm md:col-span-2">
                <span className="font-medium text-slate-700">Tabela de preco</span>
                <select
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
                  value={tabelaPrecoId ?? ""}
                  onChange={(event) => setTabelaPrecoId(event.target.value ? Number(event.target.value) : null)}
                  disabled={tabelasPrecoLoading}
                >
                  {tabelasPreco.length === 0 ? <option value="">Nenhuma tabela disponivel</option> : null}
                  {tabelasPreco.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                      {item.padrao ? " - padrao" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-5 text-slate-500">
                  {tabelasPrecoLoading
                    ? "Resolvendo tabela de preco para este comprador..."
                    : tabelaPrecoAtiva
                      ? `Tabela ativa: ${tabelaPrecoAtiva.nome}.`
                      : "Sem tabela diferenciada configurada para este perfil."}
                </p>
              </label>
            </div>

            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Observacoes internas</span>
              <textarea
                className="min-h-[120px] w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
                value={observacoesInternas}
                onChange={(event) => setObservacoesInternas(event.target.value)}
                placeholder="Contexto operacional, retroatividade, observacoes do caixa e referencias da comanda em papel."
              />
            </label>
          </div>
        </CaixaSection>

        <CaixaSection
          anchor="caixa-itens"
          title="B. Itens da comanda"
          description={
            editingId
              ? "Itens exibidos para referencia nesta etapa de ajuste."
              : "Monte a comanda no mesmo raciocinio do PDV e acompanhe o total em tempo real."
          }
          actions={
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {editingId ? "Leitura de referencia" : `${itens.length} item(ns)`}
            </span>
          }
        >
          <CafeSectionIntro
            title="Catalogo da comanda"
            description="Clique nos produtos para compor a venda com a mesma logica operacional do PDV."
          />

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <CafeCatalogoProdutos
                onAddProduct={adicionarItem}
                quantitiesByProductId={quantidadesPorProdutoId}
                tabelaPrecoId={tabelaPrecoId}
                disabled={editingId !== null}
                helperText="Categorias e cards aceleram o lancamento administrativo sem transformar o Caixa em PDV."
                disabledText="Itens travados nesta etapa. Para alteracoes estruturais, refaca a comanda antes do faturamento."
                addLabel="Adicionar"
              />
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-[#ead8be] bg-[linear-gradient(180deg,#fffdf8_0%,#fff7ea_100%)] p-5 shadow-[0_20px_44px_-32px_rgba(180,126,58,0.28)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c6640]">Comanda montada</p>
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">Carrinho administrativo</h3>
                    <p className="text-sm leading-6 text-slate-600">
                      Cada clique adiciona quantidade 1. Cliques repetidos somam automaticamente.
                    </p>
                    <p className="text-xs font-medium text-[#8c6640]">
                      {tabelaPrecoAtiva ? `Tabela ativa: ${tabelaPrecoAtiva.nome}` : "Tabela ativa: padrao do Cafe"}
                    </p>
                  </div>
                  <div className="grid gap-2 text-right">
                    <span className="rounded-full border border-[#e6d3b8] bg-white px-3 py-1 text-xs font-semibold text-[#8c6640]">
                      {itens.length} item(ns)
                    </span>
                    <div className="text-lg font-semibold text-[#9a3412]">{brl(totalItensCentavos)}</div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {itens.length === 0 ? (
                    <EmptyState
                      title="Nenhum item na comanda"
                      description="Use o catalogo ao lado para adicionar produtos e montar a venda."
                      hint="Fluxo por cards"
                    />
                  ) : (
                    itens.map((item) => (
                      <div
                        key={item.produto_id}
                        className="rounded-[20px] border border-[#eadfcd] bg-white px-4 py-4 shadow-[0_14px_32px_-28px_rgba(148,91,31,0.22)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-950">{item.nome}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">Produto #{item.produto_id}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-500">{brl(item.valor_unitario_centavos)} cada</div>
                            <div className="mt-1 text-base font-semibold text-slate-950">
                              {brl(item.valor_unitario_centavos * item.quantidade)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#eadfcd] bg-[#fffaf4] px-2 py-1">
                            <button
                              type="button"
                              className="h-8 w-8 rounded-full border border-[#eadfcd] bg-white text-sm text-slate-700 transition hover:bg-[#fff8ef] disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={editingId !== null}
                              onClick={() => atualizarQuantidadeItem(item.produto_id, item.quantidade - 1)}
                            >
                              -
                            </button>
                            <span className="min-w-8 text-center text-sm font-semibold text-slate-950">{item.quantidade}</span>
                            <button
                              type="button"
                              className="h-8 w-8 rounded-full border border-[#eadfcd] bg-white text-sm text-slate-700 transition hover:bg-[#fff8ef] disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={editingId !== null}
                              onClick={() => atualizarQuantidadeItem(item.produto_id, item.quantidade + 1)}
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-semibold">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                              Subtotal {brl(item.valor_unitario_centavos * item.quantidade)}
                            </span>
                            <button
                              type="button"
                              className="rounded-full px-3 py-1.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-400"
                              disabled={editingId !== null}
                              onClick={() => removerItem(item.produto_id)}
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </CaixaSection>
      </div>
    );
  }

  function renderLiquidacaoEDestino() {
    return (
      <div className="space-y-6">
        <CaixaSection
          anchor="caixa-liquidacao"
          title="C. Quitacao"
          description="Defina como a venda foi quitada e qual sera o reflexo financeiro."
          active={atalhoAtivo === "baixa"}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-700">Tipo de quitacao</span>
              <select
                className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
                value={tipoQuitacao}
                onChange={(event) => setTipoQuitacao(event.target.value as typeof tipoQuitacao)}
              >
                {opcoesQuitacao.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {isPagamentoImediato || isPagamentoParcial ? (
              <>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Forma de pagamento real</span>
                  <select
                    className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                    value={metodoPagamento}
                    disabled={pagamentosLoading}
                    onChange={(event) => setMetodoPagamento(event.target.value)}
                  >
                    {pagamentosDisponiveisFiltrados.length === 0 ? <option value="">Sem opcoes disponiveis</option> : null}
                    {pagamentosDisponiveisFiltrados.map((option) => (
                      <option key={option.codigo} value={option.codigo} disabled={!option.habilitado}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs leading-5 text-slate-500">
                    {pagamentosLoading
                      ? "Carregando meios de pagamento validos do contexto Cafe..."
                      : pagamentoSelecionado?.motivo_bloqueio ?? `Centro de custo Ballet Cafe${centroCustoId ? ` #${centroCustoId}` : ""}.`}
                  </p>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Valor pago na abertura (centavos)</span>
                  <input
                    className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 disabled:bg-slate-50"
                    type="number"
                    min={0}
                    value={valorPagoCentavos}
                    disabled={editingId !== null}
                    onChange={(event) => setValorPagoCentavos(event.target.value)}
                  />
                </label>
              </>
            ) : (
              <label className="space-y-2 text-sm md:col-span-1">
                <span className="font-medium text-slate-700">Competencia da cobranca</span>
                <input
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
                  type="month"
                  value={competencia}
                  onChange={(event) => setCompetencia(event.target.value)}
                />
                <p className="text-xs leading-5 text-slate-500">
                  Este lancamento nao gera recebimento imediato. O valor seguira para cobranca futura na competencia selecionada.
                </p>
              </label>
            )}
          </div>

          <CafePanel className="px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c6640]">Leitura rapida</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isContaInternaFutura
                ? "Sera gerada cobranca futura na competencia selecionada."
                : isPagamentoParcial
                  ? "Pagamento parcial registra recebimento agora e mantem saldo em aberto."
                  : "Pagamento imediato registra o recebimento real no caixa."}
            </p>
          </CafePanel>

          {(isContaInternaColaborador && !permiteContaInternaColaborador) || (isContaInternaAluno && !permiteContaInternaAluno) ? (
            <EmptyState
              title="Fluxo futuro exige comprador elegivel"
              description="Selecione uma pessoa elegivel antes de confirmar este lancamento. A cobranca por competencia depende desse vinculo."
              tone="warning"
            />
          ) : null}

          {contaInternaInfo && !contaInternaInfo.elegivel && contaInternaInfo.suporte?.pode_solicitar ? (
            <CafePanel className="px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c6640]">Conta interna indisponivel</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {contaInternaInfo.motivo ?? "Ainda nao existe conta interna ativa para este titular. Abra uma solicitacao e volte a concluir a comanda quando a conta estiver pronta."}
              </p>
              <button type="button" className={cx(BUTTON_GHOST, "mt-3")} onClick={() => void solicitarContaInterna()}>
                Solicitar criacao ao suporte
              </button>
            </CafePanel>
          ) : null}
        </CaixaSection>

        <CafeCard variant="muted" className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-slate-950">Fechamento do lancamento</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Confirme os dados essenciais e registre.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={BUTTON_SECONDARY}
                onClick={() => {
                  limparFormulario();
                  setMensagem(null);
                }}
              >
                Limpar
              </button>
              <button type="button" className={BUTTON_PRIMARY} disabled={saving} onClick={() => void salvarComanda()}>
                {saving ? "Salvando..." : editingId ? "Salvar ajustes" : "Registrar comanda"}
              </button>
            </div>
          </div>
        </CafeCard>
      </div>
    );
  }

  function renderLateralResumo() {
    return (
      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <CafeCard
          title="Resumo operacional"
          description="Conferencia final antes de salvar."
          variant={saldoPrevistoCentavos > 0 || isContaInternaFutura ? "muted" : "stats"}
        >
          <div className="rounded-[24px] border border-[#ead8be] bg-[linear-gradient(180deg,#fffef9_0%,#fff5e6_100%)] px-5 py-5">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8c6640]">Total da comanda</div>
            <div className="mt-3 text-[2.2rem] font-semibold leading-none tracking-tight text-slate-950">{brl(totalItensCentavos)}</div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{editingId ? "Resumo da comanda em ajuste." : "Resumo financeiro da operacao atual."}</p>
          </div>

          <div className="grid gap-3">
            <MetricTile label="Comprador selecionado" value={compradorNome} />
            <MetricTile label="Perfil detectado" value={formatPerfilDetectado(tipoComprador)} />
            <MetricTile
              label="Forma de quitacao"
              value={
                isContaInternaAluno
                  ? "Conta interna do aluno"
                  : isContaInternaColaborador
                    ? "Conta interna do colaborador"
                    : pagamentoSelecionado?.label ?? formatFormaPagamento(metodoPagamento)
              }
            />
            <MetricTile label="Total da venda" value={brl(totalItensCentavos)} />
            <MetricTile label="Valor pago" value={brl(valorPagoAberturaCentavos)} />
            <MetricTile label="Saldo em aberto" value={brl(saldoPrevistoCentavos)} emphasis={saldoPrevistoCentavos > 0} />
            <MetricTile label="Competencia" value={competenciaCobranca} emphasis={isContaInternaFutura} />
            <MetricTile label="Resultado financeiro" value={resultadoFinanceiro} />
            <MetricTile label="Status previsto" value={statusPrevisto} />
          </div>
        </CafeCard>

        <div id={SECTION_TARGETS.baixa} className="scroll-mt-28">
          {baixaId ? (
            <CafeCard title={`Registrar baixa da comanda #${baixaId}`} description="Use este bloco para baixa parcial ou total com pagamento real." variant="muted">
              <div className="grid gap-3">
                <MetricTile label="Saldo atual" value={brl(baixaSelecionada?.valor_em_aberto_centavos ?? 0)} emphasis />
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Valor da baixa (centavos)</span>
                  <input
                    className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
                    type="number"
                    min={1}
                    value={baixaValorCentavos}
                    onChange={(event) => setBaixaValorCentavos(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-slate-700">Forma de pagamento</span>
                  <select
                    className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
                    value={baixaMetodo}
                    onChange={(event) => setBaixaMetodo(event.target.value)}
                  >
                    {PAGAMENTO_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={BUTTON_SECONDARY} onClick={() => setBaixaId(null)}>
                    Cancelar
                  </button>
                  <button type="button" className={BUTTON_PRIMARY} disabled={saving} onClick={() => void registrarBaixa()}>
                    Confirmar baixa
                  </button>
                </div>
              </div>
            </CafeCard>
          ) : (
            <CafeCard title="Baixas parciais e totais" description="Selecione uma comanda na fila abaixo para abrir o bloco de baixa com contexto de saldo.">
              <EmptyState title="Nenhuma baixa em andamento" description="Quando uma comanda tiver pagamento real, use a acao 'Dar baixa' na fila operacional para preencher este painel." />
            </CafeCard>
          )}
        </div>

        {renderContaInternaLateral()}
      </div>
    );
  }

  function renderContaInternaLateral() {
    return (
      <div id={SECTION_TARGETS.conta} className="scroll-mt-28">
        {contaInternaId ? (
          <CafeCard
            title={`Converter saldo da comanda #${contaInternaId}`}
            description="Use este bloco apenas quando uma comanda com saldo aberto precisar ser corrigida para conta interna depois do registro."
            variant="muted"
          >
            <div className="grid gap-3">
              <MetricTile label="Saldo atual" value={brl(contaInternaSelecionada?.valor_em_aberto_centavos ?? 0)} emphasis />
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Colaborador</span>
                <select
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
                  value={contaInternaColaboradorPessoaId}
                  onChange={(event) => setContaInternaColaboradorPessoaId(event.target.value)}
                >
                  <option value="">Selecione</option>
                  {colaboradores.map((item) => (
                    <option key={item.id} value={item.pessoa_id ?? ""}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium text-slate-700">Competencia de cobranca</span>
                <input
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
                  value={contaInternaCompetencia}
                  onChange={(event) => setContaInternaCompetencia(event.target.value)}
                  placeholder="YYYY-MM"
                />
                <p className="text-xs leading-5 text-slate-500">
                  Define o mes em que o saldo convertido sera cobrado na conta interna do colaborador.
                </p>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={BUTTON_SECONDARY} onClick={() => setContaInternaId(null)}>
                  Cancelar
                </button>
                <button type="button" className={BUTTON_PRIMARY} disabled={saving} onClick={() => void enviarContaInterna()}>
                  Confirmar conversao
                </button>
              </div>
            </div>
          </CafeCard>
        ) : (
          <CafeCard title="Conversao posterior para conta interna" description="Este painel existe apenas para corrigir saldo aberto de comandas que nao nasceram direto em conta interna.">
            <EmptyState
              title="Nenhuma conversao em andamento"
              description="Use a acao da fila para escolher a comanda, validar o colaborador e vincular apenas o saldo em aberto a uma competencia de cobranca."
            />
          </CafeCard>
        )}
      </div>
    );
  }

  function renderFilaRecentes() {
    return (
      <CaixaSection
        anchor={SECTION_TARGETS.recentes}
        title="Fila de comandas recentes"
        description="Revise a operacao, filtre a fila e abra acoes de edicao, baixa e conversao de saldo com mais contexto."
        active={atalhoAtivo === "recentes" || baixaId !== null || contaInternaId !== null}
        actions={
          <button type="button" className={BUTTON_SECONDARY} onClick={() => void carregarComandas()}>
            Atualizar lista
          </button>
        }
      >
          <CafeSectionIntro
          title="Filtros operacionais"
          description="Ajuste datas, colaborador, status e competencia para montar uma fila de revisao mais objetiva."
          actions={
            filtrosAtivos ? (
              <button
                type="button"
                className={BUTTON_GHOST}
                onClick={() => {
                  const hoje = todayIso();
                  setFiltroDataInicial(hoje);
                  setFiltroDataFinal(hoje);
                  setFiltroColaboradorPessoaId("");
                  setFiltroStatus("");
                  setFiltroCompetencia(competenciaAtual);
                }}
              >
                Restaurar filtros
              </button>
            ) : null
          }
        />

        <div className="grid gap-3 md:grid-cols-5">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Data inicial</span>
            <input
              className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
              type="date"
              value={filtroDataInicial}
              onChange={(event) => setFiltroDataInicial(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Data final</span>
            <input
              className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
              type="date"
              value={filtroDataFinal}
              onChange={(event) => setFiltroDataFinal(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Colaborador</span>
            <select
              className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
              value={filtroColaboradorPessoaId}
              onChange={(event) => setFiltroColaboradorPessoaId(event.target.value)}
            >
              <option value="">Todos</option>
              {colaboradores.map((item) => (
                <option key={item.id} value={item.pessoa_id ?? ""}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select
              className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
              value={filtroStatus}
              onChange={(event) => setFiltroStatus(event.target.value)}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status || "todos"} value={status}>
                  {status ? formatStatus(status) : "Todos"}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-700">Competencia</span>
            <input
              className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400"
              value={filtroCompetencia}
              onChange={(event) => setFiltroCompetencia(event.target.value)}
              placeholder="YYYY-MM"
            />
          </label>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="animate-pulse rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-6">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="mt-4 h-4 w-3/4 rounded bg-slate-200" />
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="h-16 rounded-[18px] bg-slate-200" />
                  <div className="h-16 rounded-[18px] bg-slate-200" />
                  <div className="h-16 rounded-[18px] bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : comandas.length === 0 ? (
          <EmptyState
            title="Nenhuma comanda encontrada"
            description="A fila operacional esta vazia para os filtros atuais. Ajuste a busca ou registre um novo lancamento para voltar a revisar comandas."
            hint="Revisao, baixa parcial e conversao de saldo"
          />
        ) : (
          <div className="space-y-3">
            {comandas.map((comanda) => (
              <ComandaFilaCard
                key={comanda.id}
                comanda={comanda}
                onEditar={(id) => void editarComanda(id)}
                onDarBaixa={(item) => {
                  setBaixaId(item.id);
                  setContaInternaId(null);
                  setBaixaValorCentavos(String(item.valor_em_aberto_centavos));
                  setBaixaMetodo("DINHEIRO");
                  setAtalhoAtivo("baixa");
                  scrollToSection("baixa");
                }}
                onContaInterna={(item) => {
                  setContaInternaId(item.id);
                  setBaixaId(null);
                  setContaInternaCompetencia(item.data_competencia ?? competenciaFromDate(item.data_operacao));
                  setContaInternaColaboradorPessoaId(item.colaborador_pessoa_id ? String(item.colaborador_pessoa_id) : "");
                  setAtalhoAtivo("conta");
                  scrollToSection("conta");
                }}
              />
            ))}
          </div>
        )}
      </CaixaSection>
    );
  }

  return (
    <CafePageShell
      eyebrow="Ballet Cafe"
      title="Caixa / Lancamentos"
      description="PDV administrativo para lancamentos retroativos, baixas e cobrancas futuras do Ballet Cafe."
      actions={
        <>
          <Link className={BUTTON_PRIMARY} href="/cafe/vendas">
            Abrir PDV
          </Link>
          <Link className={BUTTON_SECONDARY} href="/admin/financeiro/credito-conexao/faturas">
            Ver faturas da conta interna
          </Link>
          <button type="button" className={BUTTON_SECONDARY} onClick={() => void verPendencias()}>
            Ver pendencias
          </button>
          <button
            type="button"
            className={BUTTON_GHOST}
            onClick={() => {
              limparFormulario();
              setMensagem(null);
              scrollToSection("formulario");
            }}
          >
            Novo lancamento
          </button>
        </>
      }
      summary={
        <>
          <CafeStatCard label="Pendencias na fila" value={String(pendenciasAbertas)} description="Comandas carregadas com saldo aberto." />
          <CafeStatCard label="Saldo em aberto" value={brl(saldoAbertoFila)} description="Total em revisao no filtro atual." />
          <CafeStatCard label="Faturadas" value={String(faturadasNaFila)} description="Comandas ja vinculadas a cobranca ou fatura." />
          <CafeStatCard label="Retroativas" value={String(retroativasNaFila)} description="Lancamentos fora da data atual." />
        </>
      }
    >
      {mensagem ? (
        <CafeCard variant="muted" title="Retorno operacional">
          <p className="text-sm leading-6 text-slate-700">{mensagem}</p>
        </CafeCard>
      ) : null}

      {renderAtalhos()}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="space-y-6">

          {renderFormularioPrincipal()}
          {renderLiquidacaoEDestino()}
        </div>

        {renderLateralResumo()}
      </div>

      {renderFilaRecentes()}

    </CafePageShell>
  );
}
