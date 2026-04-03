import type { ReactNode } from "react";

type EventoHeaderCardProps = {
  eyebrow: string;
  titulo: string;
  descricao: string;
  actions?: ReactNode;
};

export function EventoHeaderCard({
  eyebrow,
  titulo,
  descricao,
  actions,
}: EventoHeaderCardProps) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            {eyebrow}
          </p>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
              {titulo}
            </h1>
            <p className="max-w-3xl text-sm text-zinc-600">{descricao}</p>
          </div>
        </div>

        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}
