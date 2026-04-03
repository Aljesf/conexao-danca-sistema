import { EventoEdicaoInscricoesClient } from "@/components/escola/eventos/EventoEdicaoInscricoesClient";
import { carregarInscricoesEdicao } from "./_data";

export const dynamic = "force-dynamic";

type EventoEdicaoInscricoesPageProps = {
  params: Promise<{
    edicaoId: string;
  }>;
};

export default async function EventoEdicaoInscricoesPage({
  params,
}: EventoEdicaoInscricoesPageProps) {
  const resolvedParams = await params;
  const edicaoId =
    typeof resolvedParams?.edicaoId === "string" ? resolvedParams.edicaoId : "";

  if (!edicaoId) {
    throw new Error("edicaoId ausente na rota de inscricoes do evento");
  }

  try {
    const data = await carregarInscricoesEdicao(edicaoId);
    return <EventoEdicaoInscricoesClient data={data} modo="operacao" />;
  } catch (error) {
    console.error("[eventos/inscricoes] falha ao carregar pagina", {
      edicaoId,
      message: error instanceof Error ? error.message : "erro_desconhecido",
    });

    return (
      <div className="min-h-[60vh] bg-zinc-50 p-6 md:p-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-rose-700">
              Falha controlada
            </span>
            <h1 className="text-2xl font-semibold text-zinc-950">
              Nao foi possivel carregar as inscricoes desta edicao
            </h1>
            <p className="text-sm text-zinc-600">
              A navegacao foi preservada com um fallback explicito para evitar
              tela em branco. Tente recarregar a pagina depois da sincronizacao
              do ambiente.
            </p>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              <p>
                <strong>Edicao:</strong> {edicaoId}
              </p>
              <p>
                <strong>Diagnostico:</strong>{" "}
                {error instanceof Error ? error.message : "erro_desconhecido"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
