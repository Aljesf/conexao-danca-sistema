"use client";

export default function PrivateError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="px-4 py-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-500">Falha na rota</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Nao foi possivel carregar esta pagina.</h1>
        <p className="mt-2 text-sm text-slate-600">
          A navegacao foi preservada com um fallback explicito para evitar tela em branco. Tente recarregar o bloco da rota.
        </p>
        {props.error?.message ? (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {props.error.message}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={props.reset}
            className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </div>
  );
}
