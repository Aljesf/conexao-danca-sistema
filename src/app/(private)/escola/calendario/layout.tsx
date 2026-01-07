import Link from "next/link";

const pillBase =
  "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-medium shadow-sm backdrop-blur transition md:text-xs";
const pillNeutral = `${pillBase} border-slate-200 bg-white/70 text-slate-700 hover:bg-slate-50`;
const pillAccent = `${pillBase} border-violet-100 bg-white/70 text-violet-700 hover:bg-violet-50`;

export default function EscolaCalendarioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-pink-50 via-slate-50 to-white px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="rounded-3xl border border-violet-100/70 bg-white/95 px-6 py-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Calendario
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">Calendario - Escola</h1>
              <p className="text-sm text-slate-600">
                Visao unificada: periodo letivo, itens institucionais, eventos internos e grade.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link className={pillNeutral} href="/escola/calendario">
                Visao geral
              </Link>
              <Link className={pillNeutral} href="/escola/calendario/eventos-internos">
                Eventos internos
              </Link>
              <Link className={pillNeutral} href="/escola/calendario/feriados">
                Feriados
              </Link>
              <Link className={pillNeutral} href="/escola/academico/periodos-letivos">
                Periodo letivo
              </Link>
              <Link className={pillAccent} href="/admin/config/escola">
                Configuracao da escola
              </Link>
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
