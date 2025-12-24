import Link from "next/link";

export const dynamic = "force-dynamic";

export default function EscolaMatriculasPage() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Matrículas (Escola)</h1>
          <p className="text-sm text-muted-foreground">
            Matrículas operacionais (Cartão Conexão / Legado). Configurações ficam no contexto Administração.
          </p>
        </div>

        <Link
          className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted"
          href="/escola/matriculas/nova"
        >
          Nova matrícula
        </Link>
      </div>

      <div className="mt-6 rounded-lg border p-4 text-sm text-muted-foreground">
        Lista completa/filters podem entrar depois. Por ora, use “Nova matrícula” e consulte o detalhe após criar.
      </div>
    </div>
  );
}
