import Link from "next/link";

type PageProps = {
  params: { turmaId: string };
};

export default function AdicionarProfessorNaTurmaPage({ params }: PageProps) {
  const turmaId = params.turmaId;

  return (
    <div className="p-6 space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Adicionar professor na turma</h1>
        <p className="text-sm text-muted-foreground">
          Turma: <span className="font-mono">{turmaId}</span>
        </p>
      </div>

      <div className="rounded-md border p-4 space-y-2">
        <p className="text-sm">
          Esta tela foi criada para corrigir uma rota ausente que estava quebrando o build.
        </p>
        <p className="text-sm text-muted-foreground">
          Proximo passo: implementar selecao de professor e vinculo com a turma.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-accent"
          href={`/escola/academico/turmas/${turmaId}`}
        >
          Voltar para a turma
        </Link>
        <Link
          className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-accent"
          href={`/escola/academico/turmas/${turmaId}/professores`}
        >
          Ver professores da turma
        </Link>
      </div>
    </div>
  );
}
