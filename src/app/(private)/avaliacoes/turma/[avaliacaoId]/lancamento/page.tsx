import Link from "next/link";
import { notFound } from "next/navigation";

import { carregarContextoLancamento } from "@/lib/avaliacoes/resultadoServer";
import { STATUS_AVALIACAO_LABEL, type StatusAvaliacao } from "@/types/avaliacoes";
import LancamentoForm from "./LancamentoForm";

export const dynamic = "force-dynamic";

export default async function LancamentoPage({
  params,
}: {
  params: { avaliacaoId: string };
}) {
  const avaliacaoId = Number(params.avaliacaoId);
  if (Number.isNaN(avaliacaoId)) {
    notFound();
  }

  const contexto = await carregarContextoLancamento(avaliacaoId);
  if (!contexto) {
    notFound();
  }

  const { avaliacao, turma, modelo, conceitos, alunos, resultados } = contexto;
  const status = (avaliacao.status ?? "RASCUNHO") as StatusAvaliacao;

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">{avaliacao.titulo}</h1>
          <p className="text-sm text-slate-600">
            {turma?.nome ?? "Turma"} · {turma?.curso ?? "—"}{" "}
            {turma?.nivel ? `· ${turma.nivel}` : ""}{" "}
            {turma?.ano_referencia ? `· ${turma.ano_referencia}` : ""}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tipo: {modelo?.tipo_avaliacao ?? "—"} · Status: {STATUS_AVALIACAO_LABEL[status]}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Data prevista: {avaliacao.data_prevista ?? "—"} · Data realizada:{" "}
            {avaliacao.data_realizada ?? "—"}
          </p>
        </header>

        <LancamentoForm
          avaliacaoId={avaliacaoId}
          avaliacao={avaliacao}
          turma={turma}
          modelo={modelo}
          conceitos={conceitos}
          alunos={alunos}
          resultados={resultados}
          status={status}
        />

        <div className="flex justify-end">
          <Link
            href={`/academico/turmas/${avaliacao.turma_id}#avaliacoes`}
            className="text-sm text-slate-600 hover:underline"
          >
            ← Voltar para a turma
          </Link>
        </div>
      </div>
    </div>
  );
}
