export default function PublicFormTokenPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Formulario do Movimento</h1>
          <p className="mt-2 text-sm text-slate-600">
            MVP: renderizacao do formulario por token (link publico). UI final e
            componentes dinamicos serao aplicados na refatoracao.
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm text-sm text-slate-600">
          Implementar renderizacao dinamica: itens, logica condicional simples e envio de respostas.
        </div>
      </div>
    </div>
  );
}
