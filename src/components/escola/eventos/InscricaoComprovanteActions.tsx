"use client";

import Link from "next/link";

type InscricaoComprovanteActionsProps = {
  inscricoesHref: string;
  inscritoHref: string;
};

export function InscricaoComprovanteActions({
  inscricoesHref,
  inscritoHref,
}: InscricaoComprovanteActionsProps) {
  return (
    <div className="comprovante-print-actions flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
      >
        Imprimir comprovante
      </button>
      <Link
        href={inscritoHref}
        className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
      >
        Ver inscricao
      </Link>
      <Link
        href={inscricoesHref}
        className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
      >
        Nova inscricao
      </Link>
    </div>
  );
}
