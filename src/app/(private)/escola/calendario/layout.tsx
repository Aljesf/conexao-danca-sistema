import Link from "next/link";

export default function EscolaCalendarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Calendario - Escola</h1>
        <p className="text-sm text-muted-foreground">
          Visao unificada: periodo letivo, itens institucionais, eventos internos e grade.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link className="px-3 py-2 rounded-md border text-sm" href="/escola/calendario">
          Visao geral
        </Link>
        <Link
          className="px-3 py-2 rounded-md border text-sm"
          href="/escola/calendario/eventos-internos"
        >
          Eventos internos
        </Link>
        <Link className="px-3 py-2 rounded-md border text-sm" href="/escola/calendario/feriados">
          Feriados
        </Link>
        <Link className="px-3 py-2 rounded-md border text-sm" href="/escola/calendario/config">
          Config
        </Link>
      </div>

      {children}
    </div>
  );
}
