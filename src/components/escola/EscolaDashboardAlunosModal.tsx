"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "shadcn/ui";

type EscolaDashboardAlunosModalItem = {
  pessoaId: number;
  nome: string;
  idade: number | null;
  turmaNome?: string;
  serieOuNivel?: string | null;
  classificacaoInstitucional: string;
  concessaoTipo: string | null;
  valorMensalCentavos: number | null;
};

type EscolaDashboardAlunosModalGrupo = {
  chave: string;
  total: number;
  itens: EscolaDashboardAlunosModalItem[];
};

type EscolaDashboardAlunosModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  subtitulo?: string;
  modo: "institucional" | "turma";
  totalRegistros: number;
  somaValoresCentavos: number | null;
  loading?: boolean;
  error?: string | null;
  itens: EscolaDashboardAlunosModalItem[];
  grupos?: EscolaDashboardAlunosModalGrupo[];
};

const moedaFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatIdade(idade: number | null): string {
  if (typeof idade !== "number") return "Idade nao informada";
  return `${idade} anos`;
}

function formatValor(value: number | null): string {
  if (typeof value !== "number") return "Nao disponivel";
  return moedaFormatter.format(value / 100);
}

function badgeLabel(concessaoTipo: string | null): string | null {
  if (concessaoTipo === "INTEGRAL") return "Integral";
  if (concessaoTipo === "PARCIAL") return "Parcial";
  return null;
}

function badgeClassName(concessaoTipo: string | null): string {
  if (concessaoTipo === "INTEGRAL") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function classificacaoLabel(classificacao: string): string {
  if (classificacao === "CONCESSAO") return "Concessao";
  if (classificacao === "PAGANTE") return "Pagante";
  return "Ativo";
}

function HeaderStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50/85 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function ItemRow({
  item,
  modo,
}: {
  item: EscolaDashboardAlunosModalItem;
  modo: "institucional" | "turma";
}) {
  const badge = badgeLabel(item.concessaoTipo);

  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl bg-slate-50/80 px-4 py-3 ring-1 ring-inset ring-slate-200/70">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium text-slate-900">{item.nome}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
          <span>{formatIdade(item.idade)}</span>
          {modo === "institucional" && item.turmaNome ? <span>Turma: {item.turmaNome}</span> : null}
          {item.serieOuNivel ? <span>Serie/Nivel: {item.serieOuNivel}</span> : null}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
          <span className="font-medium">{classificacaoLabel(item.classificacaoInstitucional)}</span>
          <span>Valor mensal: {formatValor(item.valorMensalCentavos)}</span>
        </div>
      </div>

      {badge ? (
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badgeClassName(
            item.concessaoTipo,
          )}`}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export function EscolaDashboardAlunosModal({
  open,
  onOpenChange,
  titulo,
  subtitulo,
  modo,
  totalRegistros,
  somaValoresCentavos,
  loading = false,
  error = null,
  itens,
  grupos = [],
}: EscolaDashboardAlunosModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-0 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.45)]">
        <div className="border-b border-slate-200/80 px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold tracking-tight text-slate-950">
              {titulo}
            </DialogTitle>
            {subtitulo ? (
              <DialogDescription className="text-sm text-slate-500">
                {subtitulo}
              </DialogDescription>
            ) : null}
          </DialogHeader>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <HeaderStat label="Total de registros" value={totalRegistros} />
            <HeaderStat
              label="Soma financeira exibida"
              value={formatValor(somaValoresCentavos)}
            />
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, index) => index).map((item) => (
                <div
                  key={`modal-skeleton-${item}`}
                  className="h-20 animate-pulse rounded-2xl bg-slate-100 ring-1 ring-inset ring-slate-200/70"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              Erro ao carregar alunos: {error}
            </div>
          ) : itens.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center text-sm text-slate-500">
              Nenhum aluno encontrado.
            </div>
          ) : modo === "institucional" ? (
            <div className="space-y-2.5">
              {itens.map((item, index) => (
                <ItemRow
                  key={`${item.pessoaId}-${item.turmaNome ?? "sem-turma"}-${item.serieOuNivel ?? "sem-serie"}-${index}`}
                  item={item}
                  modo={modo}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {grupos.map((grupo) => (
                <div key={grupo.chave} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {grupo.chave}
                    </h3>
                    <span className="text-sm text-slate-500">{grupo.total} alunos</span>
                  </div>

                  <div className="space-y-2.5">
                    {grupo.itens.map((item, index) => (
                      <ItemRow
                        key={`${grupo.chave}-${item.pessoaId}-${item.nome}-${index}`}
                        item={item}
                        modo={modo}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EscolaDashboardAlunosModal;
