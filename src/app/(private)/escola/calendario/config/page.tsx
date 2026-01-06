export default function CalendarioConfigPage() {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <h2 className="text-lg font-medium">Config do Calendario</h2>
      <p className="text-sm text-muted-foreground">Nesta area vamos configurar:</p>
      <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
        <li>Periodo letivo (periodos_letivos)</li>
        <li>Itens institucionais (calendario_itens_institucionais)</li>
        <li>Politicas institucionais do calendario (visibilidade, sem aula, etc.)</li>
      </ul>
      <p className="text-sm text-muted-foreground">
        MVP: a configuracao completa entra na proxima iteracao.
      </p>
    </div>
  );
}
