export default function BolsasConcessoesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Concessoes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            MVP: esta pagina sera refinada na proxima rodada com busca de pessoa (pessoas) + selecao de tipo de bolsa.
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Proximo passo aqui: construir formulario com:
            <br />- projeto_social_id - bolsa_tipo_id - pessoa_id - turma_id (opcional) - vigencia - status
          </p>
        </div>
      </div>
    </div>
  );
}
