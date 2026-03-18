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
  classificacaoInstitucional: string;
  concessaoTipo: string | null;
};

type EscolaDashboardAlunosModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  subtitulo?: string;
  loading?: boolean;
  error?: string | null;
  itens: EscolaDashboardAlunosModalItem[];
};

function formatIdade(idade: number | null): string {
  if (typeof idade !== "number") return "Idade nao informada";
  return `${idade} anos`;
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

export function EscolaDashboardAlunosModal({
  open,
  onOpenChange,
  titulo,
  subtitulo,
  loading = false,
  error = null,
  itens,
}: EscolaDashboardAlunosModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-[28px] border border-slate-200/80 bg-white p-0 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.45)]">
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
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, index) => index).map((item) => (
                <div
                  key={`modal-skeleton-${item}`}
                  className="h-16 animate-pulse rounded-2xl bg-slate-100 ring-1 ring-inset ring-slate-200/70"
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
          ) : (
            <div className="space-y-2.5">
              {itens.map((item) => {
                const badge = badgeLabel(item.concessaoTipo);

                return (
                  <div
                    key={item.pessoaId}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50/80 px-4 py-3 ring-1 ring-inset ring-slate-200/70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{item.nome}</p>
                      <p className="text-sm text-slate-500">{formatIdade(item.idade)}</p>
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
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EscolaDashboardAlunosModal;
