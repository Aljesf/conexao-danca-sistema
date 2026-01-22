/* eslint-disable react/no-unescaped-entities */
type LoginPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const erro = searchParams?.erro === "1";

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
        <div className="w-full rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 text-center">
            <div className="text-lg font-semibold text-slate-900">Conectarte</div>
            <div className="text-sm text-slate-500">Acesso restrito</div>
          </div>

          {erro ? (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              E-mail ou senha inválidos.
            </div>
          ) : null}

          <form action="/auth/login" method="post" className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                E-mail
              </label>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-slate-300"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Senha
              </label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-0 focus:border-slate-300"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Entrar
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
